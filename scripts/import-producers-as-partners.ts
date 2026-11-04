// Jednorazowy import producentów z platformy jako firm w notatniku rozmów (spec 0080 AC-20).
//
// Dla każdego obecnego (nieusuniętego) producenta tworzy firmę (`crm_partner`): nazwa i kraj z
// producenta, rodzaj `producent`, link do producenta w `producer_id`. Osobę kontaktową
// (`crm_contact`) tworzy WYŁĄCZNIE razem z nowo utworzoną firmą, w tym samym zapytaniu, z danych
// konta producenta: imię z konta, a gdy konto go nie ma, nazwa producenta; mail i telefon z konta.
// Osoba nie ma naturalnego klucza, więc tylko to wiązanie z nową firmą chroni przed dublami.
//
// Idempotentny: `ON CONFLICT (producer_id) WHERE producer_id IS NOT NULL DO NOTHING` powtarza
// warunek częściowego indeksu `crm_partner_one_per_producer`. Powtórka nie tworzy ani firm, ani
// osób. Firma zarchiwizowana też trzyma producenta, więc też nie powstanie druga.
//
// Autor (`created_by`): najstarsze aktywne konto administratora w tej bazie (rola admin, konto
// nieusunięte i niezablokowane), wybierane w samym SQL, żeby ten sam plik działał na dev i prod.
//
// Użycie:
//   npx tsx --env-file=.env.local scripts/import-producers-as-partners.ts            zapis na DEV
//   npx tsx --env-file=.env.local scripts/import-producers-as-partners.ts --dry-run  tylko liczby
//   npx tsx scripts/import-producers-as-partners.ts --emit-sql                       plik SQL dla PROD
//
// `--emit-sql` nie łączy się z żadną bazą: zapisuje drizzle/_promote_crm_partners_to_prod/
// 00-crm-partners-from-producers.sql, który człowiek uruchamia ręcznie (scripts/run-promote-sql.ts
// albo Neon SQL Editor) po zastosowaniu migracji 0069 na produkcji. Zapis na produkcję tym
// skryptem jest zablokowany: bez `--emit-sql` działa tylko na bazie dev.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const DEV_PROJECT_ID = "bold-tree-78265613";
const OUT_DIR = path.join(process.cwd(), "drizzle", "_promote_crm_partners_to_prod");
const OUT_FILE = path.join(OUT_DIR, "00-crm-partners-from-producers.sql");

const ADMIN_SQL = `(
    SELECT u."id" FROM "users" u
    WHERE u."role" = 'admin' AND u."deleted_at" IS NULL AND u."blocked_at" IS NULL
    ORDER BY u."created_at" ASC, u."id" ASC
    LIMIT 1
  )`;

const IMPORT_SQL = `WITH new_partner AS (
  INSERT INTO "crm_partner" ("id", "name", "kind", "country_code", "producer_id", "created_by", "updated_at")
  SELECT gen_random_uuid(), p."name", 'producent', p."country_code", p."id", ${ADMIN_SQL}, now()
  FROM "producer" p
  WHERE p."deleted_at" IS NULL
  ORDER BY p."created_at" ASC, p."id" ASC
  ON CONFLICT ("producer_id") WHERE "producer_id" IS NOT NULL DO NOTHING
  RETURNING "id", "producer_id"
), new_contact AS (
  INSERT INTO "crm_contact" ("id", "partner_id", "name", "email", "phone", "updated_at")
  SELECT gen_random_uuid(), np."id", COALESCE(NULLIF(btrim(u."name"), ''), p."name"), u."email", NULLIF(btrim(u."phone"), ''), now()
  FROM new_partner np
  JOIN "producer" p ON p."id" = np."producer_id"
  JOIN "users" u ON u."id" = p."user_id"
  RETURNING "id"
)
SELECT (SELECT count(*) FROM new_partner)::int AS partners_created, (SELECT count(*) FROM new_contact)::int AS contacts_created`;

function emitSql(): void {
  const text = `-- Spec 0080 AC-20: producenci z platformy jako firmy w notatniku rozmów. Wygenerowane przez
-- scripts/import-producers-as-partners.ts --emit-sql. Uruchamiać RĘCZNIE na produkcji, po migracji 0069.
-- Idempotentny: drugie uruchomienie nic nie tworzy (ON CONFLICT na częściowym indeksie producer_id).
-- Osoba kontaktowa powstaje tylko razem z nową firmą, w tym samym zapytaniu.
-- Autor firm to najstarsze aktywne konto administratora; bez takiego konta zapis się zatrzyma.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.crm_partner') IS NULL OR to_regclass('public.crm_contact') IS NULL THEN
    RAISE EXCEPTION 'Brak tabel crm_partner i crm_contact. Najpierw zastosuj migrację 0069.';
  END IF;
END $$;

${IMPORT_SQL};

COMMIT;
`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, text, "utf8");
  console.log(`Zapisano ${path.relative(process.cwd(), OUT_FILE)}. Niczego nie uruchomiono, żadna baza nie była użyta.`);
}

async function main(): Promise<void> {
  if (process.argv.includes("--emit-sql")) {
    emitSql();
    return;
  }

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Brak DATABASE_URL (uruchom z --env-file=.env.local).");
  const sql = neon(url);

  const info = (await sql.query(`select current_setting('neon.project_id', true) as project_id, current_database() as db`)) as {
    project_id: string | null;
    db: string;
  }[];
  const projectId = info[0].project_id;
  console.log(`Baza: projekt Neon "${projectId ?? "nieznany"}", baza "${info[0].db}".`);
  if (projectId !== DEV_PROJECT_ID) {
    throw new Error("To nie jest baza dev. Dla produkcji użyj --emit-sql i uruchom plik ręcznie.");
  }

  const before = (await sql.query(
    `select (select count(*) from "producer" where "deleted_at" is null)::int as producers,
            (select count(*) from "crm_partner" where "producer_id" is not null)::int as linked_partners,
            (select count(*) from "crm_partner")::int as partners,
            (select count(*) from "crm_contact")::int as contacts`,
  )) as { producers: number; linked_partners: number; partners: number; contacts: number }[];
  console.log("Przed:", before[0]);

  if (process.argv.includes("--dry-run")) {
    console.log(`Tryb podglądu: powstałoby do ${before[0].producers - before[0].linked_partners} nowych firm (producenci bez firmy). Nic nie zapisano.`);
    return;
  }

  const result = (await sql.query(IMPORT_SQL)) as { partners_created: number; contacts_created: number }[];
  console.log("Utworzono:", result[0]);

  const after = (await sql.query(
    `select (select count(*) from "crm_partner" where "producer_id" is not null)::int as linked_partners,
            (select count(*) from "crm_partner")::int as partners,
            (select count(*) from "crm_contact")::int as contacts`,
  )) as { linked_partners: number; partners: number; contacts: number }[];
  console.log("Po:", after[0]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
