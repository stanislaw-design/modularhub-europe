// Eksport katalogu Logbar Domy z bazy DEV do plików SQL dla PROD (spec 0069 + import Logbar).
// Tylko czyta dev, niczego nie zapisuje do żadnej bazy. Wynik: drizzle/_promote_logbar_to_prod/NN-*.sql,
// które człowiek uruchamia po kolei w Neon SQL Editor na produkcji (ten sam wzorzec co import MOHO).
//
// Użycie: npx tsx --env-file=.env.local scripts/export-logbar-prod-sql.ts
//
// Pliki R2 (zdjęcia, rzuty) leżą w tym samym buckecie co na dev, więc dokumenty tylko odwołują się
// do istniejących kluczy r2_key. Wszystkie INSERT-y mają ON CONFLICT DO NOTHING, więc ponowne
// uruchomienie pliku niczego nie dubluje.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { IMPORT_USER_ID, PRODUCER_ID } from "./data/logbar-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const OUT_DIR = path.join(process.cwd(), "drizzle", "_promote_logbar_to_prod");
const MIGRATION_FILE = "0053_uneven_fixer";

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
const PRODUCT_IDS = `(select id from product where producer_id = '${P}')`;
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

  // 01: producent, użytkownik techniczny, grupy i opcje konfiguratora, słowniki tłumaczeń.
  const part1 = [
    ...(await insertsFor("users", `id = $1`, [IMPORT_USER_ID])),
    ...(await insertsFor("producer", `id = $1`, [P])),
    ...(await insertsFor("producer_delivery_country", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_member", `producer_id = $1`, [P])),
    ...(await insertsFor("producer_translation", `producer_id = $1`, [P])),
    ...(await insertsFor("product_option_group", `producer_id = $1`, [P])),
    ...(await insertsFor("product_option", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_group_translation", `group_id in ${GROUP_IDS}`)),
    ...(await insertsFor("product_option_translation", `option_id in ${OPTION_IDS}`)),
    ...(await insertsFor(
      "cost_line_item_label_translation",
      `label_pl in (select label from cost_line_item where product_variant_id in ${VARIANT_IDS})`,
    )),
    ...(await insertsFor(
      "reference_text_translation",
      `source_pl in (select reason from product_country_eligibility where product_id in ${PRODUCT_IDS})`,
    )),
  ];
  write("01-producent-i-opcje.sql", "Logbar Domy: producent, grupy i opcje konfiguratora, słowniki tłumaczeń.", part1);

  // 02: produkty (po jednym pliku na 6 produktów, bo teksty są długie).
  const products = (await sql.query(`select id, name from product where producer_id = $1 order by name`, [P])) as { id: string; name: string }[];
  const chunk = 6;
  for (let start = 0; start < products.length; start += chunk) {
    const ids = products.slice(start, start + chunk).map((p) => p.id);
    const list = `(${ids.map(quote).join(", ")})`;
    const variantList = `(select id from product_variant where product_id in ${list})`;
    const statements = [
      ...(await insertsFor("product", `id in ${list}`)),
      ...(await insertsFor("product_translation", `product_id in ${list}`)),
      ...(await insertsFor("product_country_eligibility", `product_id in ${list}`)),
      ...(await insertsFor("product_variant", `product_id in ${list}`)),
      ...(await insertsFor("product_variant_translation", `product_variant_id in ${variantList}`)),
      ...(await insertsFor("cost_line_item", `product_variant_id in ${variantList}`)),
      ...(await insertsFor("product_option_group_assignment", `product_id in ${list}`)),
    ];
    write(
      `02-produkty-${String(start / chunk + 1).padStart(2, "0")}.sql`,
      `Logbar Domy: produkty ${products.slice(start, start + chunk).map((p) => p.name).join(", ")}.`,
      statements,
    );
  }

  // 03: wersje układu wnętrz (spec 0069) i dokumenty (odwołania do istniejących plików R2).
  const part3 = [
    ...(await insertsFor("product_option_layout", `option_id in ${OPTION_IDS}`)),
    ...(await insertsFor("product_option_layout_translation", `option_id in ${OPTION_IDS}`)),
  ];
  write("03-wersje-ukladu.sql", "Logbar Domy: wersje układu wnętrz opcji (spec 0069).", part3);

  const documents = await insertsFor("document", `product_id in ${PRODUCT_IDS}`);
  for (let start = 0; start < documents.length; start += 150) {
    write(
      `04-dokumenty-${String(start / 150 + 1).padStart(2, "0")}.sql`,
      "Logbar Domy: dokumenty (zdjęcia i rzuty), odwołania do plików już wgranych do bucketa R2.",
      documents.slice(start, start + 150),
    );
  }

  // 00: kontrola wstępna i migracja 0053. Kontrola sprawdza każdą kolumnę, której użyją pliki 01 do 04,
  // z wyjątkiem tego, co tworzy migracja 0053.
  const created: Record<string, string[]> = {
    product_option_layout: ["*"],
    product_option_layout_translation: ["*"],
    document: ["product_option_id", "floor_level"],
  };
  const required: [string, string][] = [];
  for (const [table, columns] of used) {
    for (const column of columns) {
      const skip = created[table]?.includes("*") || created[table]?.includes(column);
      if (!skip) required.push([table, column]);
    }
  }
  const migrationSql = readFileSync(path.join(process.cwd(), "drizzle", `${MIGRATION_FILE}.sql`));
  const hash = createHash("sha256").update(migrationSql).digest("hex");
  const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const when = journal.entries.find((entry) => entry.tag === MIGRATION_FILE)?.when;
  if (!when) throw new Error("Brak wpisu migracji w _journal.json");

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

  const migrationBody = migrationSql
    .toString("utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const registry = `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT ${quote(hash)}, ${when}
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${quote(hash)});`;

  writeFileSync(
    path.join(OUT_DIR, "00-kontrola-i-migracja-0053.sql"),
    [
      `-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu), potem migracja ${MIGRATION_FILE} (spec 0069).`,
      "-- Uruchom to PRZED wdrożeniem kodu: nowy kod czyta kolumny i tabele z tej migracji na każdej stronie produktu.",
      "-- Migracja jest addytywna (nowe tabele, puste kolumny), nic nie zmienia w istniejących danych.",
      "BEGIN;",
      preflight,
      ...migrationBody.map((statement) => (statement.endsWith(";") ? statement : `${statement};`)),
      registry,
      "COMMIT;",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`00-kontrola-i-migracja-0053.sql: ${required.length} kolumn do sprawdzenia, hash ${hash.slice(0, 12)}…`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
