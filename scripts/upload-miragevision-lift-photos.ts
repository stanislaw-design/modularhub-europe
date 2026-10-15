// MirageVision szafy z windą (Premium, Custom): zdjęcia wyciągnięte z kart rodzin
// (_docs/mirageVision/zdjecia-lift/, poza gitem; prawa do materiałów potwierdzone). Wgrywa je do R2
// i zapisuje wiersze `document` (purpose product_photo, pierwsze = okładka). Tylko dev DB.
// Idempotentny: produkt, który ma już dokumenty, jest pomijany. `--dry-run` tylko waliduje pliki.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { document, producer } from "../lib/db/schema";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import { MIRAGEVISION_PRODUCER_ID } from "./data/miragevision-lift-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const DIR = "_docs/mirageVision/zdjecia-lift";

const PHOTOS: { productId: string; name: string; files: string[] }[] = [
  {
    productId: "7d1c8d33-5a0f-4f0e-9b3e-1c6a8a52f0a1",
    name: "Premium Lift",
    files: ["premium-czarny-753x941.png", "premium-bialy-753x941.png", "premium-szampan-753x941.png"],
  },
  { productId: "c2f4e6a8-91b3-4d57-8a60-3f9d1e7b4c52", name: "Custom Lift", files: ["custom-kamien-1122x1277.png", "custom-stal-685x856.png"] },
];

async function main(): Promise<void> {
  const assets = new Map<string, { buffer: Buffer; mimeType: string }>();
  for (const item of PHOTOS) {
    for (const file of item.files) {
      const buffer = await readFile(path.join(process.cwd(), DIR, file));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
      assets.set(file, { buffer, mimeType: validation.mimeType });
    }
  }
  if (DRY_RUN) {
    console.log(`Dry run OK: ${assets.size} poprawnych plików, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  const [owner] = await db.select({ userId: producer.userId }).from(producer).where(eq(producer.id, MIRAGEVISION_PRODUCER_ID));
  if (!owner) throw new Error("Brak producenta MirageVision w bazie.");

  for (const item of PHOTOS) {
    const existing = await db
      .select({ id: document.id })
      .from(document)
      .where(and(eq(document.productId, item.productId), isNull(document.deletedAt)));
    if (existing.length > 0) {
      console.log(`- ${item.name}: już ma ${existing.length} dokumentów, pomijam`);
      continue;
    }
    const rows = [];
    for (const [index, file] of item.files.entries()) {
      const asset = assets.get(file)!;
      const r2Key = buildR2Key(file);
      await uploadObject(r2Key, asset.buffer, asset.mimeType);
      rows.push({
        r2Key,
        filename: file,
        mimeType: asset.mimeType,
        sizeBytes: asset.buffer.byteLength,
        purpose: "product_photo" as const,
        isCover: index === 0,
        sortOrder: index,
        ownerUserId: owner.userId,
        productId: item.productId,
      });
    }
    await db.insert(document).values(rows);
    console.log(`- ${item.name}: ${rows.length} zdjęć w R2 i bazie`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
