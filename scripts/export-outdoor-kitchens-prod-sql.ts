// Eksport kuchni ogrodowych (spec 0086, 10 produktów) z bazy DEV do plików SQL dla PROD.
// Tylko czyta dev, niczego nie zapisuje do żadnej bazy. Wynik: drizzle/_promote_outdoor_kitchens_to_prod/NN-*.sql,
// które człowiek uruchamia po kolei na produkcji po migracji 0073 (wartość rodziny i producer.is_platform_brand):
//   SQL_TARGET_URL=<prod url> npx tsx scripts/run-sql-file.ts drizzle/_promote_outdoor_kitchens_to_prod/00-kontrola.sql ...
// Zdjęcia: dev i prod dzielą jeden bucket R2, więc dokumenty tylko odwołują się do istniejących kluczy r2_key.
// Producent Wooden Dream House już jest na prodzie (ten sam id), więc eksport go nie kopiuje; kopiuje tylko konto
// techniczne i producenta marki ModularHub Europe.
//
// Użycie: npx tsx --env-file=.env.local scripts/export-outdoor-kitchens-prod-sql.ts
// Wszystkie INSERT-y mają ON CONFLICT DO NOTHING, więc ponowne uruchomienie pliku niczego nie dubluje (ale też niczego
// nie aktualizuje: zmiany po pierwszej promocji trzeba robić osobnym UPDATE-em).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { BRAND_PRODUCER_ID, BRAND_USER_ID, KITCHENS, WDH_PRODUCER_ID } from "./data/outdoor-kitchens-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const OUT_DIR = path.join(process.cwd(), "drizzle", "_promote_outdoor_kitchens_to_prod");

// Kolumny wyliczane po stronie bazy: search_vector jest GENERATED ALWAYS, price_min_cents/price_max_cents liczy
// wyzwalacz z wariantu domyślnego.
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
  const rows = (await sql.query(
    `select ${columns.map((c) => `"${c.name}"`).join(", ")} from "${table}" where ${where}`,
    params,
  )) as Record<string, unknown>[];
  const set = used.get(table) ?? new Set<string>();
  for (const column of columns) set.add(column.name);
  used.set(table, set);
  const header = `INSERT INTO "${table}" (${columns.map((c) => `"${c.name}"`).join(", ")}) VALUES`;
  return rows.map((row) => `${header} (${columns.map((c) => literal(row[c.name], c)).join(", ")}) ON CONFLICT DO NOTHING;`);
}

const PRODUCT_IDS = `(select id from product where family = 'outdoor-kitchen')`;
const GROUP_IDS = `(select group_id from product_option_group_assignment where product_id in ${PRODUCT_IDS})`;
const OPTION_IDS = `(select id from product_option where group_id in ${GROUP_IDS})`;

function write(name: string, header: string, statements: string[]): void {
  const body = ["-- " + header, "BEGIN;", ...statements, "COMMIT;", ""].join("\n");
  writeFileSync(path.join(OUT_DIR, name), body, "utf8");
  console.log(`${name}: ${statements.length} instrukcji, ${(body.length / 1024).toFixed(0)} KB`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const project = (await sql.query(`select current_setting('neon.project_id', true) as p`)) as { p: string }[];
  if (project[0]?.p !== "bold-tree-78265613") throw new Error(`Eksport tylko z dev, a to jest ${project[0]?.p}`);
  const count = (await sql.query(
    `select count(*)::int as n from product where family = 'outdoor-kitchen' and status = 'published' and deleted_at is null`,
  )) as { n: number }[];
  if (count[0].n !== KITCHENS.length) throw new Error(`Na dev jest ${count[0].n} kuchni, oczekiwano ${KITCHENS.length}`);

  const part1 = [
    ...(await insertsFor("users", `id = $1`, [BRAND_USER_ID])),
    ...(await insertsFor("producer", `id = $1`, [BRAND_PRODUCER_ID])),
    ...(await insertsFor("producer_delivery_country", `producer_id = $1`, [BRAND_PRODUCER_ID])),
    ...(await insertsFor("producer_member", `producer_id = $1`, [BRAND_PRODUCER_ID])),
    // Grupy opcji należą do producenta (WDH albo marki), wchodzą przed produktami.
    ...(await insertsFor("product_option_group", `id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_group_translation", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_translation", `option_id in ${OPTION_IDS}`)),
  ];
  write("01-producent-i-opcje.sql", "Kuchnie ogrodowe: konto techniczne i producent ModularHub Europe, grupy opcji z tłumaczeniami.", part1);

  const part2 = [
    ...(await insertsFor("product", `family = 'outdoor-kitchen'`)),
    ...(await insertsFor("product_translation", `product_id in ${PRODUCT_IDS}`)),
  ];
  write("02-produkty.sql", "Kuchnie ogrodowe: 10 produktów z tłumaczeniami.", part2);

  const part3 = [
    ...(await insertsFor("product_variant", `product_id in ${PRODUCT_IDS}`)),
    ...(await insertsFor("product_option_group_assignment", `product_id in ${PRODUCT_IDS}`)),
  ];
  write("03-warianty-i-przypisania.sql", "Kuchnie ogrodowe: wariant katalogowy z ceną od, przypisania grup opcji.", part3);

  write(
    "04-dokumenty.sql",
    "Kuchnie ogrodowe: dokumenty (zdjęcia WebP), odwołania do plików już wgranych do bucketa R2.",
    await insertsFor("document", `product_id in ${PRODUCT_IDS} and deleted_at is null`),
  );

  // 00: kontrola wstępna na prodzie. Nic nie zapisuje.
  const required: [string, string][] = [];
  for (const [table, columns] of used) for (const column of columns) required.push([table, column]);
  const slugs = (await sql.query(`select slug from product where family = 'outdoor-kitchen'`)) as { slug: string }[];
  const owners = (await sql.query(
    `select distinct owner_user_id as id from document where product_id in ${PRODUCT_IDS} and owner_user_id <> $1`,
    [BRAND_USER_ID],
  )) as { id: string }[];
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
    RAISE EXCEPTION 'Na tej bazie brakuje kolumn (najpierw wdróż migrację 0073): %', missing;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'product_family' AND e.enumlabel = 'outdoor-kitchen') THEN
    RAISE EXCEPTION 'Typ product_family nie ma wartości outdoor-kitchen (najpierw wdróż migrację 0073)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM producer WHERE id = '${WDH_PRODUCER_ID}' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Na tej bazie nie ma producenta Wooden Dream House (${WDH_PRODUCER_ID})';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[${owners.map((o) => quote(o.id)).join(", ") || "NULL"}]::text[]) AS o(id) WHERE o.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.id)) THEN
    RAISE EXCEPTION 'Brakuje konta właściciela zdjęć Wooden Dream House na tej bazie';
  END IF;
  IF EXISTS (SELECT 1 FROM producer WHERE nip = 'MHE-OWN' AND id <> '${BRAND_PRODUCER_ID}') THEN
    RAISE EXCEPTION 'NIP MHE-OWN jest już zajęty przez inny wiersz, przerywam';
  END IF;
  IF EXISTS (SELECT 1 FROM product WHERE slug IN (${slugs.map((r) => quote(r.slug)).join(", ")}) AND id NOT IN (${KITCHENS.length > 0 ? `SELECT id FROM product WHERE family = 'outdoor-kitchen'` : "NULL"})) THEN
    RAISE EXCEPTION 'Adres (slug) jednej z kuchni jest już zajęty przez inny produkt, przerywam';
  END IF;
END $$;`;
  writeFileSync(
    path.join(OUT_DIR, "00-kontrola.sql"),
    ["-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.", preflight, ""].join("\n"),
    "utf8",
  );
  console.log(`00-kontrola.sql: ${required.length} kolumn do sprawdzenia, ${KITCHENS.length} produktów`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
