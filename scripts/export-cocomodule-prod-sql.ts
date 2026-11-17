// Eksport katalogu Cocomodule (import 2026-11-16, scripts/import-cocomodule-catalog.ts) z bazy DEV do plików SQL dla PROD.
// Tylko czyta dev, niczego nie zapisuje. Wynik: drizzle/_promote_cocomodule_to_prod/NN-*.sql, uruchamiane po kolei:
//   SQL_TARGET_URL=<adres prod> npx tsx scripts/run-sql-file.ts drizzle/_promote_cocomodule_to_prod/0*.sql
// Różnica względem eksportu Letniskowo: producent i pięć pilotażowych domów już są na prod, więc wiersze są
// aktualizowane (ON CONFLICT DO UPDATE), a nie tylko wstawiane. Slug istniejących produktów zostaje taki jak na prod.
// Stare dokumenty produktów Cocomodule (zdjęcia z watermarkiem) dostają deleted_at przed wstawieniem nowych.
// Pliki zdjęć są już w R2 (dev i prod dzielą kubełek), więc kopiowanie plików nie jest potrzebne.
// Wszystkie pliki można bezpiecznie uruchomić ponownie.
//
// Użycie: npx tsx --env-file=.env.local scripts/export-cocomodule-prod-sql.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { CONTAINERS, HOUSES, OWNER_USER_ID, PRODUCER_ID, SAUNAS } from "./data/cocomodule-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const OUT_DIR = path.join(process.cwd(), "drizzle", "_promote_cocomodule_to_prod");
const P = PRODUCER_ID;
const EXISTING_IDS = HOUSES.flatMap((house) => (house.existingId ? [house.existingId] : []));
const EXPECTED_PRODUCTS = HOUSES.length + SAUNAS.length + CONTAINERS.length;

// Kolumny wyliczane po stronie bazy: search_vector jest GENERATED, ceny produktu liczy wyzwalacz z wariantu domyślnego.
const SKIP_COLUMNS: Record<string, string[]> = { product: ["search_vector", "price_min_cents", "price_max_cents"] };
// Kolumny nigdy nie nadpisywane przy aktualizacji istniejącego wiersza.
const KEEP_ON_UPDATE = ["id", "created_at", "slug"];

interface ColumnInfo {
  name: string;
  dataType: string;
  udt: string;
}

async function columnsOf(table: string): Promise<ColumnInfo[]> {
  const rows = (await sql.query(
    `select column_name, data_type, udt_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  )) as { column_name: string; data_type: string; udt_name: string }[];
  if (rows.length === 0) throw new Error(`Brak tabeli ${table} na dev`);
  return rows
    .filter((row) => !(SKIP_COLUMNS[table] ?? []).includes(row.column_name))
    .map((row) => ({ name: row.column_name, dataType: row.data_type, udt: row.udt_name }));
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

function literal(value: unknown, column: ColumnInfo): string {
  if (value === null || value === undefined) return "NULL";
  switch (column.dataType) {
    case "jsonb":
    case "json":
      return `${quote(JSON.stringify(value))}::${column.dataType}`;
    case "boolean":
      return value ? "true" : "false";
    case "integer":
    case "smallint":
    case "bigint":
    case "real":
    case "double precision":
    case "numeric":
      return String(value);
    case "timestamp with time zone":
    case "timestamp without time zone":
      return `${quote(new Date(value as string).toISOString())}::timestamptz`;
    case "ARRAY": {
      if (column.udt !== "_text") throw new Error(`Kolumna tablicowa ${column.name} (${column.udt}) nie jest obsługiwana`);
      const items = value as string[];
      return items.length === 0 ? "ARRAY[]::text[]" : `ARRAY[${items.map(quote).join(", ")}]::text[]`;
    }
    default:
      return quote(String(value));
  }
}

const used = new Map<string, Set<string>>();

// conflict: null = ON CONFLICT DO NOTHING; lista kolumn = ON CONFLICT (lista) DO UPDATE wszystkich pozostałych kolumn.
async function rowsFor(table: string, where: string, conflict: string[] | null): Promise<string[]> {
  const columns = await columnsOf(table);
  const rows = (await sql.query(`select ${columns.map((c) => `"${c.name}"`).join(", ")} from "${table}" where ${where}`)) as Record<string, unknown>[];
  const set = used.get(table) ?? new Set<string>();
  for (const column of columns) set.add(column.name);
  used.set(table, set);
  const header = `INSERT INTO "${table}" (${columns.map((c) => `"${c.name}"`).join(", ")}) VALUES`;
  const tail =
    conflict === null
      ? "ON CONFLICT DO NOTHING"
      : `ON CONFLICT (${conflict.map((c) => `"${c}"`).join(", ")}) DO UPDATE SET ${columns
          .filter((c) => !conflict.includes(c.name) && !KEEP_ON_UPDATE.includes(c.name))
          .map((c) => `"${c.name}" = EXCLUDED."${c.name}"`)
          .join(", ")}`;
  return rows.map((row) => `${header} (${columns.map((c) => literal(row[c.name], c)).join(", ")}) ${tail};`);
}

const PRODUCT_IDS = `(select id from product where producer_id = '${P}' and deleted_at is null)`;
const NEW_PRODUCT_IDS = `(select id from product where producer_id = '${P}' and deleted_at is null and id not in (${EXISTING_IDS.map(quote).join(", ")}))`;
const GROUP_IDS = `(select id from product_option_group where producer_id = '${P}' and deleted_at is null)`;
const OPTION_IDS = `(select id from product_option where group_id in ${GROUP_IDS})`;
const NEW_VARIANT_IDS = `(select id from product_variant where product_id in ${NEW_PRODUCT_IDS})`;

function write(name: string, header: string, statements: string[]): void {
  const body = ["-- " + header, ...statements, ""].join("\n");
  writeFileSync(path.join(OUT_DIR, name), body, "utf8");
  console.log(`${name}: ${statements.length} instrukcji, ${(body.length / 1024).toFixed(0)} KB`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const project = (await sql.query(`select current_setting('neon.project_id', true) as p`)) as { p: string }[];
  if (project[0]?.p !== "bold-tree-78265613") throw new Error(`Eksport tylko z dev, a to jest ${project[0]?.p}`);
  const count = (await sql.query(`select count(*)::int as n from product where producer_id = $1 and deleted_at is null`, [P])) as { n: number }[];
  if (count[0].n !== EXPECTED_PRODUCTS) throw new Error(`Na dev jest ${count[0].n} produktów Cocomodule, oczekiwano ${EXPECTED_PRODUCTS}`);

  const producer = (await sql.query(`select country_code, description from producer where id = $1`, [P])) as { country_code: string; description: string }[];
  const part1 = [
    `UPDATE producer SET country_code = ${quote(producer[0].country_code)}, description = ${quote(producer[0].description)}, updated_at = now() WHERE id = '${P}';`,
    ...(await rowsFor("producer_translation", `producer_id = '${P}'`, ["producer_id", "locale"])),
    ...(await rowsFor("reference_text_translation", `source_pl in (select reason from product_country_eligibility where product_id in ${NEW_PRODUCT_IDS})`, null)),
    // Najwyżej jedna opcja domyślna na grupę: najpierw zdjęcie starych flag.
    `UPDATE product_option SET is_default = false WHERE group_id IN (select id from product_option_group where producer_id = '${P}');`,
    ...(await rowsFor("product_option_group", `producer_id = '${P}' and deleted_at is null`, ["id"])),
    ...(await rowsFor("product_option", `group_id in ${GROUP_IDS}`, ["id"])),
    ...(await rowsFor("product_option_group_translation", `group_id in ${GROUP_IDS}`, ["group_id", "locale"])),
    ...(await rowsFor("product_option_translation", `option_id in ${OPTION_IDS}`, ["option_id", "locale"])),
  ];
  write("01-producent-i-opcje.sql", "Cocomodule: opis producenta (kraj PL), tłumaczenia, konfigurator saun COCO (9 grup opcji).", part1);

  const part2 = [
    ...(await rowsFor("product", `producer_id = '${P}' and deleted_at is null`, ["id"])),
    ...(await rowsFor("product_translation", `product_id in ${PRODUCT_IDS}`, ["product_id", "locale"])),
    ...(await rowsFor("product_country_eligibility", `product_id in ${NEW_PRODUCT_IDS}`, null)),
  ];
  write("02-produkty.sql", `Cocomodule: ${EXPECTED_PRODUCTS} produktów (5 istniejących aktualizowanych), tłumaczenia, kwalifikacja PL dla nowych.`, part2);

  // Warianty tylko nowych produktów; pięć istniejących domów zachowuje swoje warianty i ceny z prod.
  const part3 = [
    `UPDATE product_variant SET is_default = false WHERE product_id IN ${NEW_PRODUCT_IDS};`,
    ...(await rowsFor("product_variant", `product_id in ${NEW_PRODUCT_IDS} and deleted_at is null`, ["id"])),
    ...(await rowsFor("product_variant_translation", `product_variant_id in ${NEW_VARIANT_IDS}`, ["product_variant_id", "locale"])),
    ...(await rowsFor("product_option_group_assignment", `product_id in ${PRODUCT_IDS}`, null)),
  ];
  write("03-warianty-i-opcje-produktow.sql", "Cocomodule: warianty nowych produktów i przypisanie konfiguratora do saun COCO.", part3);

  const docIds = (await sql.query(`select id from document where product_id in ${PRODUCT_IDS} and deleted_at is null`)) as { id: string }[];
  const part4 = [
    // Stare zdjęcia (z watermarkiem) wycofane przed wstawieniem nowych: jedna okładka na produkt.
    `UPDATE document SET deleted_at = now(), is_cover = false WHERE product_id IN ${PRODUCT_IDS} AND deleted_at IS NULL AND id NOT IN (${docIds.map((r) => quote(r.id)).join(", ")});`,
    ...(await rowsFor("document", `product_id in ${PRODUCT_IDS} and deleted_at is null`, null)),
  ];
  write("04-dokumenty.sql", `Cocomodule: ${docIds.length} zdjęć i rzutów (pliki już w R2), wycofanie starych zdjęć z watermarkiem.`, part4);

  const required: [string, string][] = [];
  for (const [table, columns] of used) for (const column of columns) required.push([table, column]);
  const slugs = (await sql.query(`select slug from product where producer_id = $1 and deleted_at is null and slug is not null`, [P])) as { slug: string }[];
  const preflight = `DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(r.t || '.' || r.c, ', ') INTO missing
  FROM (VALUES ${required.map(([t, c]) => `(${quote(t)}, ${quote(c)})`).join(", ")}) AS r(t, c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns k
    WHERE k.table_schema = 'public' AND k.table_name = r.t AND k.column_name = r.c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Na tej bazie brakuje kolumn (najpierw wdróż zaległe migracje): %', missing;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM producer WHERE id = '${P}') THEN
    RAISE EXCEPTION 'Brak producenta Cocomodule (${P}) na tej bazie, przerywam';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = '${OWNER_USER_ID}') THEN
    RAISE EXCEPTION 'Brak konta właściciela dokumentów (${OWNER_USER_ID}), przerywam';
  END IF;
  IF EXISTS (SELECT 1 FROM product WHERE slug IN (${slugs.map((r) => quote(r.slug)).join(", ")}) AND producer_id <> '${P}') THEN
    RAISE EXCEPTION 'Adres (slug) jednego z produktów jest już zajęty przez inny produkt, przerywam';
  END IF;
END $$;`;
  writeFileSync(path.join(OUT_DIR, "00-kontrola.sql"), ["-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.", preflight, ""].join("\n"), "utf8");
  console.log(`00-kontrola.sql: ${required.length} kolumn do sprawdzenia`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
