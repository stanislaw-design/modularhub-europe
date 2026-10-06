// Backfill tłumaczeń spec 0067 (EN/DE/NL): opcje konfiguratora, producenci,
// certyfikaty, pola produktu, słownik powodów zgodności i brakujące etykiety
// kosztów. Dane w scripts/data/translations-0067.ts, dopasowanie po dokładnym
// polskim tekście źródłowym (jedno zapytanie ze słownikiem wypełnia wszystkie
// wiersze o tym samym tekście), nigdy po pozycji.
//
// Idempotentny i bezpieczny: nowe wiersze ON CONFLICT DO NOTHING, istniejące
// tłumaczenie z niepustym tekstem nigdy nie jest nadpisywane (pole puste lub
// same spacje jest uzupełniane).
//
// Użycie (zawsze na dev, guard assertDevDatabase):
//   npx tsx --env-file=.env.local scripts/backfill-translations-0067.ts                    (dry run, tylko liczy dopasowania)
//   npx tsx --env-file=.env.local scripts/backfill-translations-0067.ts --apply            (zapis na dev)
//   npx tsx --env-file=.env.local scripts/backfill-translations-0067.ts --emit-sql <plik>  (SQL do uruchomienia na prod w Neon SQL Editor)
//
// Zapis na prod to osobny, jawny krok: wygeneruj plik --emit-sql i uruchom go ręcznie.

import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { db } from "../lib/db/client";
import {
  CERTIFICATIONS,
  CONSTRUCTION_SYSTEMS,
  COST_LINE_LABELS,
  CUSTOMIZATION_SCOPES,
  FOUNDATION_OPTIONS,
  OPTION_GROUP_NAMES,
  OPTION_LABELS,
  PRODUCER_DESCRIPTIONS,
  PRODUCT_DESCRIPTIONS,
  REFERENCE_TEXTS,
  ROOF_TYPES,
  type Entry,
} from "./data/translations-0067";

const LOCALES = ["en", "de", "nl"] as const;

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function valuesCte(entries: Entry[]): string {
  const rows: string[] = [];
  for (const [pl, en, de, nl] of entries) {
    const byLocale = { en, de, nl };
    for (const locale of LOCALES) {
      rows.push(`(${lit(pl)}, ${lit(locale)}, ${lit(byLocale[locale])})`);
    }
  }
  return `with v(pl, locale, tr) as (values ${rows.join(",\n  ")})`;
}

const LOCALE_CAST = "v.locale::product_translation_locale";
const BLANK = (column: string) => `coalesce(btrim(${column}), '') = ''`;

interface Target {
  name: string;
  entries: Entry[];
  // Zapytanie SELECT (po CTE v) zwracające wiersze do wstawienia.
  select: string;
  // INSERT INTO <tabela> (<kolumny>) ...
  insertInto: string;
  // ON CONFLICT ...
  conflict: string;
}

function productFieldTarget(name: string, field: string, entries: Entry[]): Target {
  return {
    name,
    entries,
    insertInto: `insert into product_translation (product_id, locale, ${field})`,
    select: `select p.id, ${LOCALE_CAST}, v.tr from product p join v on p.${field} = v.pl where p.deleted_at is null`,
    conflict: `on conflict (product_id, locale) do update set ${field} = excluded.${field}, updated_at = now() where ${BLANK(`product_translation.${field}`)}`,
  };
}

const TARGETS: Target[] = [
  {
    name: "product_option_group_translation.name",
    entries: OPTION_GROUP_NAMES,
    insertInto: "insert into product_option_group_translation (group_id, locale, name)",
    select: `select g.id, ${LOCALE_CAST}, v.tr from product_option_group g join v on g.name = v.pl where g.deleted_at is null`,
    conflict: "on conflict (group_id, locale) do nothing",
  },
  {
    name: "product_option_translation.label",
    entries: OPTION_LABELS,
    insertInto: "insert into product_option_translation (option_id, locale, label)",
    select: `select o.id, ${LOCALE_CAST}, v.tr from product_option o join v on o.label = v.pl where o.deleted_at is null`,
    conflict: "on conflict (option_id, locale) do nothing",
  },
  {
    name: "producer_translation.description",
    entries: PRODUCER_DESCRIPTIONS,
    insertInto: "insert into producer_translation (producer_id, locale, description)",
    select: `select pr.id, ${LOCALE_CAST}, v.tr from producer pr join v on pr.description = v.pl where pr.deleted_at is null`,
    conflict: `on conflict (producer_id, locale) do update set description = excluded.description, updated_at = now() where ${BLANK("producer_translation.description")}`,
  },
  {
    name: "producer_certification_translation.name",
    entries: CERTIFICATIONS,
    insertInto: "insert into producer_certification_translation (certification_id, locale, name)",
    select: `select c.id, ${LOCALE_CAST}, v.tr from producer_certification c join v on c.name = v.pl`,
    conflict: "on conflict (certification_id, locale) do nothing",
  },
  productFieldTarget("product_translation.foundation_options", "foundation_options", FOUNDATION_OPTIONS),
  productFieldTarget("product_translation.construction_system", "construction_system", CONSTRUCTION_SYSTEMS),
  productFieldTarget("product_translation.roof_type", "roof_type", ROOF_TYPES),
  productFieldTarget("product_translation.customization_scope", "customization_scope", CUSTOMIZATION_SCOPES),
  {
    // Opis produktu: ten sam model własności co backfill AI z 2026-09-22
    // (ai_generated_description = description, ai_translated_from_description =
    // polskie źródło), więc przyszła regeneracja widzi to pole jako "własność AI".
    name: "product_translation.description",
    entries: PRODUCT_DESCRIPTIONS,
    insertInto:
      "insert into product_translation (product_id, locale, description, ai_generated_description, ai_translated_from_description)",
    select: `select p.id, ${LOCALE_CAST}, v.tr, v.tr, p.description from product p join v on p.description = v.pl where p.deleted_at is null`,
    conflict: `on conflict (product_id, locale) do update set description = excluded.description, ai_generated_description = excluded.ai_generated_description, ai_translated_from_description = excluded.ai_translated_from_description, updated_at = now() where ${BLANK("product_translation.description")}`,
  },
  {
    name: "reference_text_translation (powody zgodności, słownik)",
    entries: REFERENCE_TEXTS,
    insertInto: "insert into reference_text_translation (source_pl, locale, translated)",
    select: `select v.pl, ${LOCALE_CAST}, v.tr from v`,
    conflict: "on conflict (source_pl, locale) do nothing",
  },
  {
    name: "cost_line_item_label_translation (luki)",
    entries: COST_LINE_LABELS,
    insertInto: "insert into cost_line_item_label_translation (label_pl, locale, translated_label)",
    select: `select v.pl, ${LOCALE_CAST}, v.tr from v`,
    conflict: "on conflict (label_pl, locale) do nothing",
  },
];

function insertSql(target: Target): string {
  return `${valuesCte(target.entries)}\n${target.insertInto}\n${target.select}\n${target.conflict};`;
}

function countSql(target: Target): string {
  return `${valuesCte(target.entries)}\nselect count(*)::int as n from (${target.select}) s;`;
}

async function main() {
  const args = process.argv.slice(2);
  const emitIndex = args.indexOf("--emit-sql");
  if (emitIndex !== -1) {
    const file = args[emitIndex + 1];
    if (!file) throw new Error("--emit-sql wymaga ścieżki pliku");
    const body = TARGETS.map((target) => `-- ${target.name}\n${insertSql(target)}`).join("\n\n");
    writeFileSync(
      file,
      `-- Spec 0067: backfill tłumaczeń EN/DE/NL na PROD (projekt modularhub, spring-rain-58383710).\n` +
        `-- Wygenerowane przez scripts/backfill-translations-0067.ts --emit-sql.\n` +
        `-- Uruchom po migracji 0052, w Neon SQL Editor, na bazie produkcyjnej. Idempotentne:\n` +
        `-- istniejące, niepuste tłumaczenia nie są nadpisywane.\n` +
        `BEGIN;\n\n${body}\n\nCOMMIT;\n`,
      "utf8",
    );
    console.log(`Zapisano ${file} (${TARGETS.length} instrukcji).`);
    return;
  }

  await assertDevDatabase();
  const apply = args.includes("--apply");

  for (const target of TARGETS) {
    if (apply) {
      await db.execute(sql.raw(insertSql(target)));
      console.log(`zapisano: ${target.name}`);
    } else {
      const result = await db.execute<{ n: number }>(sql.raw(countSql(target)));
      const matched = result.rows[0]?.n ?? 0;
      console.log(`dopasowano ${matched} par (wiersz x język): ${target.name}`);
    }
  }
  console.log(apply ? "\nGotowe (dev). Sprawdź: npm run check:translations" : "\nDry run, nic nie zapisano. Użyj --apply.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
