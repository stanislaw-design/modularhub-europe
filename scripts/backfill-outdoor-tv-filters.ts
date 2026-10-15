// Uzupełnienie kolumn filtrów paska Outdoor TV (spec 0071 AC-9) dla produktów MirageVision
// już obecnych w bazie. Dopasowanie po id produktu i rodzinie, nie po nazwie.
// Idempotentny. Tylko dev (assertDevDatabase); prod to plik drizzle/_promote_outdoor_tv_filters_to_prod.sql.
//   npx tsx --env-file=.env.local scripts/backfill-outdoor-tv-filters.ts
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { product } from "../lib/db/schema";

export const OUTDOOR_TV_FILTER_VALUES: { id: string; name: string; mounting: string; sunExposure: string | null }[] = [
  { id: "9ca9dfbe-330f-4019-9fd7-2a2e24113d7e", name: "Silver", mounting: "na-sciane", sunExposure: "cien" },
  { id: "539c8b77-dc60-4487-8f22-c4a3bf84cd5c", name: "Gold", mounting: "na-sciane", sunExposure: "czesciowe-slonce" },
  { id: "4387e68a-a132-4324-b10e-9dc6a165c007", name: "Platinum Series", mounting: "na-sciane", sunExposure: "pelne-slonce" },
  { id: "7d1c8d33-5a0f-4f0e-9b3e-1c6a8a52f0a1", name: "Premium Lift", mounting: "w-szafie-z-winda", sunExposure: null },
  { id: "c2f4e6a8-91b3-4d57-8a60-3f9d1e7b4c52", name: "Custom Lift", mounting: "w-szafie-z-winda", sunExposure: null },
  { id: "19f6add0-0991-4737-852e-f3206b650775", name: "Econo Lift", mounting: "w-szafie-z-winda", sunExposure: null },
];

async function main() {
  await assertDevDatabase();
  for (const row of OUTDOOR_TV_FILTER_VALUES) {
    const updated = await db
      .update(product)
      .set({ outdoorTvMounting: row.mounting, outdoorTvSunExposure: row.sunExposure })
      .where(and(eq(product.id, row.id), eq(product.family, "outdoor-tv")))
      .returning({ id: product.id });
    console.log(`- ${row.name}: ${updated.length === 1 ? "ustawiono" : "brak w bazie"}`);
  }
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
