// Jednorazowy skrypt migracyjny (spec 0031 Build plan #8, AC-1): przenosi
// zdjęcia dzisiejszych realnych produktów z public/images/houses/ (adresy
// zapisane w product.coverImageUrl/technicalSpecs._extraImageUrls) do R2,
// tworząc dla każdego zdjęcia wiersz document (purpose: product_photo,
// pierwsze zdjęcie isCover: true, pozostałe z rosnącym sortOrder).
//
// Domyślnie tryb "na sucho" (tylko raport, bez zapisu do R2 ani bazy); realne
// wgranie wymaga --apply plus --owner-user-id=<uuid administratora> (spec 0031
// Feature design: ownerUserId to konto administratora uruchamiającego skrypt).
// Idempotentny: produkt z choćby jednym istniejącym wierszem document
// (purpose product_photo) jest pomijany jako już zmigrowany.
//
// Użycie:
//   npm run migrate:product-photos                              (dry run)
//   npm run migrate:product-photos -- --apply --owner-user-id=<uuid>

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { document, product } from "@/lib/db/schema";
import { validateProductPhotoFile } from "@/lib/storage/document-validation";
import { buildR2Key, uploadObject } from "@/lib/storage/r2-client";

interface CliOptions {
  apply: boolean;
  ownerUserId: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const apply = argv.includes("--apply");
  const ownerArg = argv.find((arg) => arg.startsWith("--owner-user-id="));
  return { apply, ownerUserId: ownerArg ? ownerArg.slice("--owner-user-id=".length) : null };
}

type RowStatus = "migrated" | "dry-run" | "skipped-already-migrated" | "skipped-no-source-images";

interface ReportRow {
  productName: string;
  status: RowStatus;
  photosPlanned: number;
  photosWritten: number;
  problems: string[];
}

async function migrateOneProduct(
  productRow: { id: string; name: string; coverImageUrl: string | null; technicalSpecs: unknown },
  options: CliOptions,
): Promise<ReportRow> {
  const alreadyMigrated = await db
    .select({ id: document.id })
    .from(document)
    .where(
      and(eq(document.productId, productRow.id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
    )
    .limit(1);
  if (alreadyMigrated.length > 0) {
    return { productName: productRow.name, status: "skipped-already-migrated", photosPlanned: 0, photosWritten: 0, problems: [] };
  }

  const specs = (productRow.technicalSpecs ?? {}) as { _extraImageUrls?: string[] };
  const urls = [productRow.coverImageUrl, ...(specs._extraImageUrls ?? [])].filter(
    (url): url is string => Boolean(url),
  );
  if (urls.length === 0) {
    return { productName: productRow.name, status: "skipped-no-source-images", photosPlanned: 0, photosWritten: 0, problems: [] };
  }

  const problems: string[] = [];
  let photosWritten = 0;

  // Kolejność jak dziś: cover_image_url zawsze pierwszy (isCover), potem
  // _extraImageUrls z rosnącym sortOrder (ta sama kolejność co dzisiejsza
  // galeria klienta, spec 0031 AC-8).
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const localPath = path.join(process.cwd(), "public", url);
    if (!existsSync(localPath)) {
      // Rozjazd między bazą a plikami na dysku: pomiń ten wpis i zgłoś w
      // raporcie, nie przerywaj całego przebiegu (spec 0031 Migration plan, Risks).
      problems.push(`brak pliku: ${url}`);
      continue;
    }

    const buffer = readFileSync(localPath);
    const validation = validateProductPhotoFile(buffer);
    if (!validation.ok || !validation.mimeType) {
      problems.push(`nieprawidłowa sygnatura pliku: ${url} (${validation.error})`);
      continue;
    }

    if (options.apply) {
      const r2Key = buildR2Key(url);
      await uploadObject(r2Key, buffer, validation.mimeType);
      await db.insert(document).values({
        r2Key,
        filename: path.basename(url),
        mimeType: validation.mimeType,
        sizeBytes: buffer.byteLength,
        purpose: "product_photo",
        isCover: index === 0,
        sortOrder: index,
        ownerUserId: options.ownerUserId as string,
        productId: productRow.id,
      });
    }
    photosWritten += 1;
  }

  return {
    productName: productRow.name,
    status: options.apply ? "migrated" : "dry-run",
    photosPlanned: urls.length,
    photosWritten,
    problems,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.apply && !options.ownerUserId) {
    console.error("Tryb --apply wymaga też --owner-user-id=<uuid administratora>.");
    process.exitCode = 1;
    return;
  }

  console.log(options.apply ? "Tryb: REALNE WGRYWANIE (--apply)" : "Tryb: na sucho (dry run, bez zapisu)");

  const products = await db
    .select({
      id: product.id,
      name: product.name,
      coverImageUrl: product.coverImageUrl,
      technicalSpecs: product.technicalSpecs,
    })
    .from(product);

  const report: ReportRow[] = [];
  for (const productRow of products) {
    report.push(await migrateOneProduct({ ...productRow, name: productRow.name ?? "(bez nazwy)" }, options));
  }

  for (const row of report) {
    const detail = row.status === "skipped-already-migrated" || row.status === "skipped-no-source-images"
      ? row.status
      : `${row.photosWritten}/${row.photosPlanned} zdjęć`;
    console.log(`- ${row.productName}: ${detail}${row.problems.length > 0 ? ` [${row.problems.join("; ")}]` : ""}`);
  }

  const migratedOrPlanned = report.filter((row) => row.status === "migrated" || row.status === "dry-run").length;
  const alreadyDone = report.filter((row) => row.status === "skipped-already-migrated").length;
  const noSource = report.filter((row) => row.status === "skipped-no-source-images").length;
  const withProblems = report.filter((row) => row.problems.length > 0).length;

  console.log("\nPodsumowanie:");
  console.log(`  Produktów łącznie: ${products.length}`);
  console.log(`  ${options.apply ? "Zmigrowanych teraz" : "Do migracji (dry run)"}: ${migratedOrPlanned}`);
  console.log(`  Już zmigrowanych wcześniej (pominięte): ${alreadyDone}`);
  console.log(`  Bez żadnego zdjęcia źródłowego: ${noSource}`);
  console.log(`  Z problemami (brakujący plik / zła sygnatura): ${withProblems}`);
  if (!options.apply) {
    console.log("\nTo był dry run, nic nie zapisano. Uruchom ponownie z --apply --owner-user-id=<uuid>, żeby zapisać naprawdę.");
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
