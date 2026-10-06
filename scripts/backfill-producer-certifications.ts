// Spec 0065 AC-3, zadanie 3 (backfill): każdy string z producer_capacity_profile.certifications
// staje się wierszem producer_certification ze statusem self_reported i pustym wystawcą.
// Domyślnie tryb podglądu (nic nie zapisuje). Zapis wymaga --apply. Idempotentny:
// ON CONFLICT po (producer_id, name), ponowne uruchomienie nie dubluje wierszy.
// Uruchamiany przed wdrożeniem kodu czytającego z nowych tabel (spec 0065 Migration plan).
import { eq, isNotNull, sql } from "drizzle-orm";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { db } from "../lib/db/client";
import { producer, producerCapacityProfile, producerCertification } from "../lib/db/schema";

// AC-3: wpis Budmana z płaskiej listy dostaje jawnie oznaczoną nazwę deklaracji.
const RENAMES: Record<string, string> = {
  "Zgodność z Bbl (holenderskie przepisy budowlane)": "Zgodność z Bbl (deklaracja producenta)",
};

async function main() {
  const apply = process.argv.includes("--apply");
  await assertDevDatabase();

  const profiles = await db
    .select({
      producerId: producerCapacityProfile.producerId,
      producerName: producer.name,
      certifications: producerCapacityProfile.certifications,
    })
    .from(producerCapacityProfile)
    .innerJoin(producer, eq(producer.id, producerCapacityProfile.producerId))
    .where(isNotNull(producerCapacityProfile.certifications));

  const rows: { producerId: string; name: string; producerName: string }[] = [];
  for (const profile of profiles) {
    const seen = new Set<string>();
    for (const raw of profile.certifications ?? []) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const name = RENAMES[trimmed] ?? trimmed;
      if (seen.has(name)) continue;
      seen.add(name);
      rows.push({ producerId: profile.producerId, name, producerName: profile.producerName });
    }
  }

  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${rows.length} certyfikat(ów) z ${profiles.length} profili`);
  for (const row of rows) console.log(`  ${row.producerName} → ${row.name}`);
  if (!apply) {
    console.log("Nic nie zapisano. Uruchom z --apply, żeby zapisać.");
    return;
  }

  if (rows.length > 0) {
    await db
      .insert(producerCertification)
      .values(rows.map((row) => ({ producerId: row.producerId, name: row.name, issuer: null, confirmationStatus: "self_reported" as const })))
      .onConflictDoNothing({ target: [producerCertification.producerId, producerCertification.name] });
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(producerCertification);
  console.log(`Gotowe. Wierszy w producer_certification: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
