// Aktualizacje katalogu Przemysława Wencela, które trzeba przenieść z dev na PROD, bo wiersze już tam są
// (export-wencel-prod-sql.ts wstawia je z ON CONFLICT DO NOTHING i nie zmieni istniejących): opisy dopłat opcji
// (product_option.price_note), opcje domyślne, dane produktów (czas realizacji, gwarancja, Dworek).
// Tylko czyta dev, niczego nie zapisuje. Wynik: drizzle/_update_wencel_options_to_prod/NN-*.sql, uruchamiane na
// produkcji przez scripts/run-promote-sql.ts. Wymaga wcześniej wdrożonej migracji 0065 (kolumny price_note).
//
// Użycie: npx tsx --env-file=.env.local scripts/export-wencel-updates-sql.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { PRODUCER_ID } from "./data/wencel-catalog";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const OUT_DIR = path.join(process.cwd(), "drizzle", "_update_wencel_options_to_prod");

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const lit = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return `${quote(JSON.stringify(value))}::jsonb`;
  return quote(String(value));
};

type Row = Record<string, unknown>;
const q = async (text: string): Promise<Row[]> => (await sql.query(text)) as Row[];

function write(name: string, header: string, statements: string[]): void {
  const body = ["-- " + header, "BEGIN;", ...statements, "COMMIT;", ""].join("\n");
  writeFileSync(path.join(OUT_DIR, name), body, "utf8");
  console.log(`${name}: ${statements.length} instrukcji`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const project = await q(`select current_setting('neon.project_id', true) as p`);
  if (project[0]?.p !== "bold-tree-78265613") throw new Error(`Eksport tylko z dev, a to jest ${project[0]?.p}`);

  const P = PRODUCER_ID;
  const GROUPS = `(select id from product_option_group where producer_id = '${P}')`;

  writeFileSync(
    path.join(OUT_DIR, "00-kontrola.sql"),
    `-- Krok 1 na PROD: kontrola wstępna (musi przejść bez błędu). Nic nie zapisuje.
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
        AND ((table_name = 'product_option' AND column_name = 'price_note')
          OR (table_name = 'product_option_translation' AND column_name = 'price_note'))) <> 2 THEN
    RAISE EXCEPTION 'Brak kolumn price_note (najpierw wdróż aplikację z migracją 0065_product_option_price_note), przerywam';
  END IF;
  IF (SELECT count(*) FROM product WHERE producer_id = '${P}') <> 4 THEN
    RAISE EXCEPTION 'Producent Wencela nie ma na tej bazie 4 produktów, przerywam';
  END IF;
END $$;
`,
    "utf8",
  );

  // Opcje: najpierw czyścimy opcje domyślne grup (indeks: najwyżej jedna domyślna na grupę), potem ustawiamy docelowe wartości.
  const options = await q(
    `select o.id, o.label, o.price_cents, o.price_on_request, o.is_default, o.price_note, o.sort_order, o.image_url
     from product_option o where o.group_id in ${GROUPS} order by o.group_id, o.sort_order`,
  );
  const translations = await q(
    `select t.option_id, t.locale, t.label, t.price_note from product_option_translation t
     where t.option_id in (select id from product_option where group_id in ${GROUPS})`,
  );
  const optionStatements = [
    `UPDATE product_option SET is_default = false WHERE group_id IN ${GROUPS};`,
    ...options.map(
      (o) =>
        `UPDATE product_option SET label = ${lit(o.label)}, price_cents = ${lit(o.price_cents)}, price_on_request = ${lit(o.price_on_request)}, ` +
        `is_default = ${lit(o.is_default)}, price_note = ${lit(o.price_note)}, sort_order = ${lit(o.sort_order)}, image_url = ${lit(o.image_url)}, ` +
        `updated_at = now() WHERE id = ${lit(o.id)};`,
    ),
    ...translations.map(
      (t) =>
        `UPDATE product_option_translation SET label = ${lit(t.label)}, price_note = ${lit(t.price_note)}, updated_at = now() ` +
        `WHERE option_id = ${lit(t.option_id)} AND locale = ${lit(t.locale)};`,
    ),
  ];
  write("01-opcje.sql", "Przemysław Wencel: opisy dopłat opcji (price_note), opcje domyślne, kolejność.", optionStatements);

  // Produkty: tylko kolumny zmienione po pierwszym wgraniu (czas realizacji, gwarancja, Dworek, tekst o dopasowaniu).
  const products = await q(
    `select id, description, construction_system, customization_scope, foundation_status, technical_specs,
            production_lead_time_weeks_min, production_lead_time_weeks_max, structural_warranty_years
     from product where producer_id = '${P}'`,
  );
  const productTranslations = await q(
    `select product_id, locale, description, construction_system, customization_scope
     from product_translation where product_id in (select id from product where producer_id = '${P}')`,
  );
  const productStatements = [
    ...products.map(
      (p) =>
        `UPDATE product SET description = ${lit(p.description)}, construction_system = ${lit(p.construction_system)}, ` +
        `customization_scope = ${lit(p.customization_scope)}, foundation_status = ${lit(p.foundation_status)}, ` +
        `technical_specs = ${lit(p.technical_specs)}, production_lead_time_weeks_min = ${lit(p.production_lead_time_weeks_min)}, ` +
        `production_lead_time_weeks_max = ${lit(p.production_lead_time_weeks_max)}, structural_warranty_years = ${lit(p.structural_warranty_years)}, ` +
        `updated_at = now() WHERE id = ${lit(p.id)};`,
    ),
    ...productTranslations.map(
      (t) =>
        `UPDATE product_translation SET description = ${lit(t.description)}, construction_system = ${lit(t.construction_system)}, ` +
        `customization_scope = ${lit(t.customization_scope)}, updated_at = now() WHERE product_id = ${lit(t.product_id)} AND locale = ${lit(t.locale)};`,
    ),
  ];
  write("02-produkty.sql", "Przemysław Wencel: czas realizacji, gwarancja, Dworek (stalowa rama, stałe posadowienie), teksty.", productStatements);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
