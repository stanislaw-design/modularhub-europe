// Eksport katalogu Kunert Mobile Homes z bazy DEV do plików SQL dla PROD (ten sam wzorzec co export-letniskowo-prod-sql.ts).
// Tylko czyta dev, niczego nie zapisuje. Wynik: drizzle/_promote_kunert_to_prod/NN-*.sql, uruchamiane po kolei:
//   SQL_TARGET_URL=<adres prod> npx tsx scripts/run-sql-file.ts drizzle/_promote_kunert_to_prod/0*.sql
// Dev i prod dzielą kubełek R2, więc dokumenty to tylko wiersze z odwołaniem do tych samych kluczy R2.
// Wszystkie INSERT-y mają ON CONFLICT DO NOTHING, więc ponowne uruchomienie niczego nie dubluje.
//
// Użycie: npx tsx --env-file=.env.local scripts/export-kunert-prod-sql.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { IMPORT_USER_ID, KUNERT_PRODUCER, MODELS, PRODUCER_ID } from "./data/kunert-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const OUT_DIR = path.join(process.cwd(), "drizzle", "_promote_kunert_to_prod");

// Kolumny wyliczane po stronie bazy: search_vector jest GENERATED ALWAYS, price_min/max_cents liczy wyzwalacz z wariantu.
const SKIP_COLUMNS: Record<string, string[]> = { product: ["search_vector", "price_min_cents", "price_max_cents"] };

interface ColumnInfo {
  name: string;
  dataType: string;
}

async function columnsOf(table: string): Promise<ColumnInfo[]> {
  const rows = (await sql.query(
    `select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  )) as { column_name: string; data_type: string }[];
  if (rows.length === 0) throw new Error(`Brak tabeli ${table} na dev`);
  return rows
    .filter((row) => !(SKIP_COLUMNS[table] ?? []).includes(row.column_name))
    .map((row) => ({ name: row.column_name, dataType: row.data_type }));
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
    case "ARRAY":
      throw new Error(`Kolumna tablicowa ${column.name} nie jest obsługiwana przez eksport`);
    default:
      return quote(String(value));
  }
}

const used = new Map<string, Set<string>>();

async function insertsFor(table: string, where: string, params: unknown[] = []): Promise<string[]> {
  const columns = await columnsOf(table);
  const rows = (await sql.query(`select ${columns.map((c) => `"${c.name}"`).join(", ")} from "${table}" where ${where}`, params)) as Record<
    string,
    unknown
  >[];
  const set = used.get(table) ?? new Set<string>();
  for (const column of columns) set.add(column.name);
  used.set(table, set);
  const header = `INSERT INTO "${table}" (${columns.map((c) => `"${c.name}"`).join(", ")}) VALUES`;
  return rows.map((row) => `${header} (${columns.map((c) => literal(row[c.name], c)).join(", ")}) ON CONFLICT DO NOTHING;`);
}

const P = PRODUCER_ID;
const PRODUCT_IDS = `(select id from product where producer_id = '${P}')`;
const VARIANT_IDS = `(select id from product_variant where product_id in ${PRODUCT_IDS})`;

function write(name: string, header: string, statements: string[]): void {
  const body = ["-- " + header, "BEGIN;", ...statements, "COMMIT;", ""].join("\n");
  writeFileSync(path.join(OUT_DIR, name), body, "utf8");
  console.log(`${name}: ${statements.length} instrukcji, ${(body.length / 1024).toFixed(0)} KB`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const project = (await sql.query(`select current_setting('neon.project_id', true) as p`)) as { p: string }[];
  if (project[0]?.p !== "bold-tree-78265613") throw new Error(`Eksport tylko z dev, a to jest ${project[0]?.p}`);
  const count = (await sql.query(`select count(*)::int as n from product where producer_id = $1`, [P])) as { n: number }[];
  if (count[0].n !== MODELS.length) throw new Error(`Na dev jest ${count[0].n} produktów Kunert, oczekiwano ${MODELS.length}`);

  const part1 = [
    ...(await insertsFor("users", `id = $1`, [IMPORT_USER_ID])),
    ...(await insertsFor("producer", `id = $1`, [P])),
    ...(await insertsFor("producer_delivery_country", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_member", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_translation", `producer_id = $1`, [P])),
    ...(await insertsFor("reference_text_translation", `source_pl in (select reason from product_country_eligibility where product_id in ${PRODUCT_IDS})`)),
  ];
  write("01-producent.sql", "Kunert: konto techniczne, producent, kraje dostaw, tłumaczenia opisu.", part1);

  const part2 = [
    ...(await insertsFor("product", `producer_id = $1`, [P])),
    ...(await insertsFor("product_translation", `product_id in ${PRODUCT_IDS}`)),
    ...(await insertsFor("product_country_eligibility", `product_id in ${PRODUCT_IDS}`)),
  ];
  write("02-produkty.sql", `Kunert: ${MODELS.length} produktów, tłumaczenia (z układem pomieszczeń), kwalifikacja krajów.`, part2);

  // Warianty po produktach (FK); cenę product.price_min_cents wylicza na prodzie wyzwalacz z wariantu domyślnego.
  const part3 = [
    ...(await insertsFor("product_variant", `product_id in ${PRODUCT_IDS}`)),
    ...(await insertsFor("product_variant_translation", `product_variant_id in ${VARIANT_IDS}`)),
    ...(await insertsFor("cost_line_item", `product_variant_id in ${VARIANT_IDS}`)),
    ...(await insertsFor(
      "cost_line_item_label_translation",
      `label_pl in (select label from cost_line_item where product_variant_id in ${VARIANT_IDS})`,
    )),
  ];
  write("03-warianty-i-zakres.sql", "Kunert: warianty (pod klucz, cena od 1100 EUR/m²), pozycje kosztowe i tłumaczenia ich etykiet.", part3);

  write("04-dokumenty.sql", "Kunert: dokumenty (zdjęcia, rzuty), odwołania do plików we wspólnym kubełku R2.", await insertsFor("document", `product_id in ${PRODUCT_IDS} and deleted_at is null`));

  // 00: kontrola wstępna: prod ma każdą kolumnę z plików 01 do 04, a NIP i adresy (slugi) nie są zajęte przez kogoś innego.
  const required: [string, string][] = [];
  for (const [table, columns] of used) for (const column of columns) required.push([table, column]);
  const slugs = (await sql.query(`select slug from product where producer_id = $1`, [P])) as { slug: string }[];
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
    RAISE EXCEPTION 'Na tej bazie brakuje kolumn (najpierw wdróż migracje): %', missing;
  END IF;
  IF EXISTS (SELECT 1 FROM producer WHERE nip = ${quote(KUNERT_PRODUCER.nip)} AND id <> '${P}') THEN
    RAISE EXCEPTION 'NIP Kunerta jest już zajęty przez inny wiersz producenta, przerywam';
  END IF;
  IF EXISTS (SELECT 1 FROM product WHERE slug IN (${slugs.map((r) => quote(r.slug)).join(", ")}) AND producer_id <> '${P}') THEN
    RAISE EXCEPTION 'Adres (slug) jednego z produktów jest już zajęty przez inny produkt, przerywam';
  END IF;
END $$;`;
  writeFileSync(path.join(OUT_DIR, "00-kontrola.sql"), ["-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.", preflight, ""].join("\n"), "utf8");
  console.log(`00-kontrola.sql: ${required.length} kolumn do sprawdzenia, ${MODELS.length} modeli`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
