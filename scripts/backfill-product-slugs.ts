// Jednorazowy skrypt wyrównujący (spec 0058 Build plan zadanie 7, AC-8):
// każdy istniejący produkt z niepustą (po przycięciu) nazwą, a bez sluga,
// dostaje go wyliczony tym samym pomocnikiem co ścieżki zapisu producenta
// (lib/product-slug.ts, lib/producer-product-actions.ts) — ten sam wzorzec
// kolizji (23505 -> retry z nowym losowym sufiksem).
//
// Bezpieczny do powtórzenia: filtruje po `slug IS NULL`, więc druga produkcja
// pomija wiersze, którym slug już nadano (pierwszym uruchomieniem albo
// zwykłym zapisem z kreatora producenta w międzyczasie).
//
// Domyślnie tryb "na sucho" (tylko raport). Realny zapis wymaga --apply.
//
// Użycie:
//   npx tsx --env-file=.env.local scripts/backfill-product-slugs.ts             (dry run)
//   npx tsx --env-file=.env.local scripts/backfill-product-slugs.ts -- --apply  (zapis)

import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { product } from "@/lib/db/schema";
import { appendSlugSuffix, slugifyProductName } from "@/lib/product-slug";

async function assignSlug(productId: string, name: string): Promise<string | null> {
  let candidate = slugifyProductName(name);
  if (!candidate) return null;

  for (;;) {
    try {
      await db.update(product).set({ slug: candidate }).where(eq(product.id, productId));
      return candidate;
    } catch (error) {
      if (getPgErrorCode(error) !== "23505") throw error;
      candidate = appendSlugSuffix(candidate);
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY mode: writing to the database." : "DRY RUN: no writes (pass --apply to write).");

  const rows = await db
    .select({ id: product.id, name: product.name })
    .from(product)
    .where(and(isNull(product.slug), ne(product.name, "")));

  let filled = 0;
  let skippedBlankName = 0;

  for (const row of rows) {
    const trimmedName = row.name?.trim() ?? "";
    if (!trimmedName) {
      skippedBlankName++;
      continue;
    }

    if (!apply) {
      console.log(`WOULD WRITE ${row.id}: "${trimmedName}" -> ${slugifyProductName(trimmedName)}`);
      filled++;
      continue;
    }

    const slug = await assignSlug(row.id, trimmedName);
    if (slug) {
      console.log(`WRITE ${row.id}: "${trimmedName}" -> ${slug}`);
      filled++;
    } else {
      console.warn(`SKIP (name has no sluggable characters): ${row.id} "${trimmedName}"`);
      skippedBlankName++;
    }
  }

  console.log(
    `\nDone. ${apply ? "Filled" : "Would fill"}: ${filled}. Skipped (blank/unsluggable name): ${skippedBlankName}.`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
