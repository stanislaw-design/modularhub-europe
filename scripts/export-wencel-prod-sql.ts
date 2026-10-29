// Eksport katalogu Przemysława Wencela z bazy DEV do plików SQL dla PROD.
// Tylko czyta dev, niczego nie zapisuje do żadnej bazy. Wynik: drizzle/_promote_wencel_to_prod/NN-*.sql,
// które człowiek uruchamia po kolei w Neon SQL Editor na produkcji (ten sam wzorzec co import FrameDEV i MKB).
//
// Użycie: npx tsx --env-file=.env.local scripts/export-wencel-prod-sql.ts [--only=klucz1,klucz2] [--documents-only]
// Bez flagi: cały katalog do drizzle/_promote_wencel_to_prod. Z --only: tylko wskazane produkty (klucze z
// wencel-catalog.ts) do drizzle/_promote_wencel_<klucze>_to_prod, bez producenta, konta i grup opcji, więc nadaje się
// do dołożenia produktów, gdy producent jest już na produkcji (także po zmianie id jego konta). Z --documents-only
// (razem z --only) powstają tylko pliki kontroli i dokumentów, do dołożenia zdjęć do produktów już wgranych.
//
// Pliki R2 (zdjęcia, rzuty, realizacje, zdjęcia opcji) leżą w tym samym buckecie co na dev, więc dokumenty i opcje
// tylko odwołują się do istniejących kluczy. Wszystkie INSERT-y mają ON CONFLICT DO NOTHING, więc ponowne
// uruchomienie pliku niczego nie dubluje.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { IMPORT_USER_ID, PRODUCER_ID, WENCEL_PROJECTS } from "./data/wencel-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length).split(",").filter(Boolean);
const DOCS_ONLY = process.argv.includes("--documents-only");
const ONLY_ITEMS = ONLY ? WENCEL_PROJECTS.filter((item) => ONLY.includes(item.key)) : null;
if (ONLY && ONLY_ITEMS?.length !== ONLY.length) throw new Error(`Nieznany klucz w --only, dostępne: ${WENCEL_PROJECTS.map((i) => i.key).join(", ")}`);
const OUT_DIR = path.join(process.cwd(), "drizzle", ONLY ? `_promote_wencel_${ONLY.join("_")}${DOCS_ONLY ? "_zdjecia" : ""}_to_prod` : "_promote_wencel_to_prod");

// Kolumny wyliczane po stronie bazy: nie wolno ich wstawiać (search_vector jest GENERATED ALWAYS,
// price_min_cents/price_max_cents na produkcie liczy wyzwalacz z wariantu domyślnego).
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
const ONLY_FILTER = ONLY_ITEMS ? ` and id in (${ONLY_ITEMS.map((item) => `'${item.id}'`).join(", ")})` : "";
const PRODUCT_IDS = `(select id from product where producer_id = '${P}'${ONLY_FILTER})`;
const GROUP_IDS = `(select id from product_option_group where producer_id = '${P}')`;
const OPTION_IDS = `(select id from product_option where group_id in ${GROUP_IDS})`;
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

  // W trybie --only nie czytamy producenta ani opcji: tabele z part1 trafiłyby do kontroli kolumn (np. price_note), której ta paczka nie potrzebuje.
  const part1 = ONLY_ITEMS ? [] : [
    ...(await insertsFor("users", `id = $1`, [IMPORT_USER_ID])),
    ...(await insertsFor("producer", `id = $1`, [P])),
    ...(await insertsFor("producer_delivery_country", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_member", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_translation", `producer_id = $1`, [P])),
    ...(await insertsFor(
      "reference_text_translation",
      `source_pl in (select reason from product_country_eligibility where product_id in ${PRODUCT_IDS})`,
    )),
    // Grupy opcji należą do producenta, więc wchodzą przed produktami (przypisania do produktów są w 03).
    ...(await insertsFor("product_option_group", `producer_id = $1`, [P])),
    ...(await insertsFor("product_option", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_group_translation", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_translation", `option_id in ${OPTION_IDS}`)),
  ];
  if (!ONLY_ITEMS) write("01-producent-i-opcje.sql", "Przemysław Wencel: użytkownik techniczny, producent, kraje dostawy, tłumaczenia, grupy opcji.", part1);

  const part2 = [
    ...(await insertsFor("product", `producer_id = $1${ONLY_FILTER}`, [P])),
    ...(await insertsFor("product_translation", `product_id in ${PRODUCT_IDS}`)),
    ...(await insertsFor("product_country_eligibility", `product_id in ${PRODUCT_IDS}`)),
  ];
  if (!DOCS_ONLY) write("02-produkty.sql", `Przemysław Wencel: ${ONLY_ITEMS ? ONLY_ITEMS.length : "wszystkie"} produktów, tłumaczenia, kwalifikacja krajów.`, part2);

  // Warianty po produktach (FK); cenę product.price_min_cents wylicza na prodzie wyzwalacz z wariantu domyślnego.
  const variants = [
    ...(await insertsFor("product_variant", `product_id in ${PRODUCT_IDS}`)),
    ...(await insertsFor("product_variant_translation", `product_variant_id in ${VARIANT_IDS}`)),
    ...(await insertsFor("cost_line_item", `product_variant_id in ${VARIANT_IDS}`)),
    ...(await insertsFor(
      "cost_line_item_label_translation",
      `label_pl in (select label from cost_line_item where product_variant_id in ${VARIANT_IDS})`,
    )),
    ...(await insertsFor("product_option_group_assignment", `product_id in ${PRODUCT_IDS}`)),
  ];
  if (!DOCS_ONLY) write("03-warianty-i-przypisania.sql", "Przemysław Wencel: warianty (pod klucz), pozycje zakresu i ich tłumaczenia, przypisanie grup opcji do produktów.", variants);

  // W trybie --only właściciel dokumentu to aktualny użytkownik producenta na produkcji (po zmianie id konta
  // 'catalog-import:wencel' już nie istnieje, a klucz obcy wymaga istniejącego użytkownika).
  const ownerNow = `(SELECT user_id FROM producer WHERE id = '${P}')`;
  const documents = (await insertsFor("document", `product_id in ${PRODUCT_IDS}`)).map((statement) =>
    ONLY_ITEMS ? statement.split(quote(IMPORT_USER_ID)).join(ownerNow) : statement,
  );
  write(
    "04-dokumenty.sql",
    "Przemysław Wencel: dokumenty (zdjęcia, rzuty, realizacje), odwołania do plików już wgranych do bucketa R2.",
    documents,
  );

  // 00: kontrola wstępna, że prod ma każdą kolumnę, której użyją pliki 01 do 04 (bez migracji).
  const required: [string, string][] = [];
  for (const [table, columns] of used) for (const column of columns) required.push([table, column]);
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
    RAISE EXCEPTION 'Na tej bazie brakuje kolumn (najpierw wdróż wcześniejsze migracje): %', missing;
  END IF;
END $$;`;
  // Tryb --only zakłada, że producent, jego konto i grupy opcji już są na produkcji, a adresy produktów wolne.
  const slugs = ONLY_ITEMS ? (await sql.query(`select slug from product where id in (${ONLY_ITEMS.map((i) => `'${i.id}'`).join(", ")})`)) as { slug: string }[] : [];
  const onlyChecks = ONLY_ITEMS
    ? `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM producer WHERE id = '${P}') THEN
    RAISE EXCEPTION 'Na tej bazie nie ma producenta Wencela (najpierw wgraj pełną paczkę _promote_wencel_to_prod), przerywam';
  END IF;
  IF (SELECT count(*) FROM product_option_group WHERE producer_id = '${P}' AND deleted_at IS NULL) < 4 THEN
    RAISE EXCEPTION 'Na tej bazie brakuje grup opcji Wencela, przerywam';
  END IF;
  IF EXISTS (SELECT 1 FROM product WHERE slug IN (${slugs.map((r) => quote(r.slug)).join(", ")})
             AND id NOT IN (${ONLY_ITEMS.map((i) => `'${i.id}'`).join(", ")})) THEN
    RAISE EXCEPTION 'Adres (slug) jednego z produktów jest już zajęty przez inny produkt, przerywam';
  END IF;
END $$;`
    : "";
  writeFileSync(
    path.join(OUT_DIR, "00-kontrola.sql"),
    ["-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.", preflight + onlyChecks, ""].join("\n"),
    "utf8",
  );
  console.log(`00-kontrola.sql: ${required.length} kolumn do sprawdzenia`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
