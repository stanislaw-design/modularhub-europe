// Skrypt kontrolny tłumaczeń (spec 0067 AC-8, AC-9). Tylko czyta bazę.
// Wypisuje braki per język, encja i pole dla opublikowanych produktów, kończy
// się kodem 1 przy brakach. Brak = tekst źródłowy niepusty, a tłumaczenie
// puste, same spacje albo nieistniejące. Nie ocenia, czy tłumaczenie jest
// aktualne wobec zmienionego polskiego źródła (spec 0067 Follow-up).
//
// Użycie:
//   npm run check:translations                      (baza z .env.local, czyli dev)
//   DATABASE_URL=<prod, najlepiej rola tylko do odczytu> npx tsx scripts/check-translations.ts
//
// Przy nieprawidłowym DATABASE_URL zakończy się błędem importu klienta.

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  CHECKED_LOCALES,
  findTranslationGaps,
  formatTranslationGaps,
  layoutTranslationItems,
  type CheckedLocale,
  type TranslationCheckItem,
} from "@/lib/translations/gaps";

type Row = Record<string, string | null>;

async function query(statement: ReturnType<typeof sql>): Promise<Row[]> {
  const result = await db.execute<Row>(statement);
  return result.rows;
}

// Opublikowane, nieusunięte produkty: wspólny zakres wszystkich kontroli.
const PUBLISHED = sql`p.status = 'published' and p.deleted_at is null`;

// Zamienia wiersze tłumaczeń (klucz, locale, tekst) na mapę klucz -> locale -> tekst.
function groupByLocale(rows: Row[], keyColumn: string, textColumn: string) {
  const map = new Map<string, Partial<Record<CheckedLocale, string | null>>>();
  for (const row of rows) {
    const key = row[keyColumn];
    const locale = row.locale as CheckedLocale | null;
    if (!key || !locale) continue;
    const entry = map.get(key) ?? {};
    entry[locale] = row[textColumn];
    map.set(key, entry);
  }
  return map;
}

async function collectItems(): Promise<TranslationCheckItem[]> {
  const items: TranslationCheckItem[] = [];

  // 1. Grupy i opcje konfiguratora przypisane do opublikowanych produktów.
  const groups = await query(sql`
    select distinct g.id, g.name as source, pr.name as producer_name
    from product_option_group_assignment a
    join product p on p.id = a.product_id
    join product_option_group g on g.id = a.group_id and g.deleted_at is null
    join producer pr on pr.id = g.producer_id
    where ${PUBLISHED}`);
  const groupTranslations = groupByLocale(
    await query(sql`select group_id as key, locale::text as locale, name as text from product_option_group_translation`),
    "key",
    "text",
  );
  for (const row of groups) {
    items.push({
      entity: "product_option_group",
      field: "name",
      ref: `${row.producer_name} / ${row.source}`,
      source: row.source,
      translations: groupTranslations.get(row.id!) ?? {},
    });
  }

  const options = await query(sql`
    select distinct o.id, o.label as source, g.name as group_name, pr.name as producer_name
    from product_option_group_assignment a
    join product p on p.id = a.product_id
    join product_option_group g on g.id = a.group_id and g.deleted_at is null
    join product_option o on o.group_id = g.id and o.deleted_at is null
    join producer pr on pr.id = g.producer_id
    where ${PUBLISHED}`);
  const optionTranslations = groupByLocale(
    await query(sql`select option_id as key, locale::text as locale, label as text from product_option_translation`),
    "key",
    "text",
  );
  for (const row of options) {
    items.push({
      entity: "product_option",
      field: "label",
      ref: `${row.producer_name} / ${row.group_name} / ${row.source}`,
      source: row.source,
      translations: optionTranslations.get(row.id!) ?? {},
    });
  }

  // 2. Producenci z opublikowanymi produktami.
  const producers = await query(sql`
    select distinct pr.id, pr.name, pr.description, pr.showroom_visit_note, pr.inquiry_response_time_label
    from producer pr
    join product p on p.producer_id = pr.id
    where pr.deleted_at is null and ${PUBLISHED}`);
  const producerTranslations = new Map<string, Record<string, Partial<Record<CheckedLocale, string | null>>>>();
  for (const row of await query(sql`
    select producer_id, locale::text as locale, description, showroom_visit_note, inquiry_response_time_label
    from producer_translation`)) {
    const entry = producerTranslations.get(row.producer_id!) ?? {};
    for (const field of ["description", "showroom_visit_note", "inquiry_response_time_label"]) {
      (entry[field] ??= {})[row.locale as CheckedLocale] = row[field];
    }
    producerTranslations.set(row.producer_id!, entry);
  }
  for (const row of producers) {
    for (const field of ["description", "showroom_visit_note", "inquiry_response_time_label"]) {
      items.push({
        entity: "producer",
        field,
        ref: row.name!,
        source: row[field],
        translations: producerTranslations.get(row.id!)?.[field] ?? {},
      });
    }
  }

  // 3. Certyfikaty producentów z opublikowanymi produktami.
  const certifications = await query(sql`
    select distinct c.id, c.name as source, pr.name as producer_name
    from producer_certification c
    join producer pr on pr.id = c.producer_id
    join product p on p.producer_id = pr.id
    where ${PUBLISHED}`);
  const certificationTranslations = groupByLocale(
    await query(
      sql`select certification_id as key, locale::text as locale, name as text from producer_certification_translation`,
    ),
    "key",
    "text",
  );
  for (const row of certifications) {
    items.push({
      entity: "producer_certification",
      field: "name",
      ref: `${row.producer_name} / ${row.source}`,
      source: row.source,
      translations: certificationTranslations.get(row.id!) ?? {},
    });
  }

  // 4. Pola produktu w product_translation (nowe z tego speca oraz opis i
  // foundation_options, które istniały wcześniej).
  const productFields = [
    "description",
    "foundation_options",
    "construction_system",
    "roof_type",
    "customization_scope",
    "service_scope_description",
  ];
  const products = await query(sql`
    select p.id, p.name, p.description, p.foundation_options, p.construction_system, p.roof_type,
           p.customization_scope, p.service_scope_description
    from product p where ${PUBLISHED}`);
  const productTranslations = new Map<string, Record<string, Partial<Record<CheckedLocale, string | null>>>>();
  for (const row of await query(sql`
    select product_id, locale::text as locale, description, foundation_options, construction_system, roof_type,
           customization_scope, service_scope_description
    from product_translation`)) {
    const entry = productTranslations.get(row.product_id!) ?? {};
    for (const field of productFields) (entry[field] ??= {})[row.locale as CheckedLocale] = row[field];
    productTranslations.set(row.product_id!, entry);
  }
  for (const row of products) {
    for (const field of productFields) {
      items.push({
        entity: "product",
        field,
        ref: `${row.name} (${row[field]?.slice(0, 40) ?? ""})`,
        source: row[field],
        translations: productTranslations.get(row.id!)?.[field] ?? {},
      });
    }
  }

  // 5. Słownik po polskim tekście: powody zgodności, odpowiedzialny i start
  // etapu harmonogramu.
  const dictionary = new Map<string, Partial<Record<CheckedLocale, string | null>>>();
  for (const row of await query(sql`select source_pl, locale::text as locale, translated from reference_text_translation`)) {
    const entry = dictionary.get(row.source_pl!) ?? {};
    entry[row.locale as CheckedLocale] = row.translated;
    dictionary.set(row.source_pl!, entry);
  }
  const dictionarySources: { entity: string; field: string; rows: Row[] }[] = [
    {
      entity: "product_country_eligibility",
      field: "reason",
      rows: await query(sql`
        select distinct e.reason as source from product_country_eligibility e
        join product p on p.id = e.product_id where ${PUBLISHED}`),
    },
    {
      entity: "product_compliance_assessment",
      field: "reason",
      rows: await query(sql`
        select distinct a.reason as source from product_compliance_assessment a
        join product p on p.id = a.product_id where ${PUBLISHED}`),
    },
    {
      entity: "product_timeline_stage",
      field: "responsible_party",
      rows: await query(sql`
        select distinct s.responsible_party as source from product_timeline_stage s
        join product_variant v on v.id = s.product_variant_id and v.deleted_at is null
        join product p on p.id = v.product_id where ${PUBLISHED}`),
    },
    {
      entity: "product_timeline_stage",
      field: "starts_from_label",
      rows: await query(sql`
        select distinct s.starts_from_label as source from product_timeline_stage s
        join product_variant v on v.id = s.product_variant_id and v.deleted_at is null
        join product p on p.id = v.product_id where ${PUBLISHED}`),
    },
  ];
  for (const { entity, field, rows } of dictionarySources) {
    for (const row of rows) {
      items.push({ entity, field, ref: row.source ?? "", source: row.source, translations: dictionary.get(row.source ?? "") ?? {} });
    }
  }

  // 6. Etykiety pozycji kosztowych (istniejący słownik, spec 0041).
  const costLabels = new Map<string, Partial<Record<CheckedLocale, string | null>>>();
  for (const row of await query(
    sql`select label_pl, locale::text as locale, translated_label from cost_line_item_label_translation`,
  )) {
    const entry = costLabels.get(row.label_pl!) ?? {};
    entry[row.locale as CheckedLocale] = row.translated_label;
    costLabels.set(row.label_pl!, entry);
  }
  for (const row of await query(sql`
    select distinct c.label as source from cost_line_item c
    join product_variant v on v.id = c.product_variant_id and v.deleted_at is null
    join product p on p.id = v.product_id where ${PUBLISHED}`)) {
    items.push({
      entity: "cost_line_item",
      field: "label",
      ref: row.source ?? "",
      source: row.source,
      translations: costLabels.get(row.source ?? "") ?? {},
    });
  }

  // 7. Wersje układu wnętrz opcji (spec 0069 AC-7): opis i nazwy pomieszczeń,
  // dla opcji grup przypisanych do opublikowanych produktów.
  const layouts = await query(sql`
    select distinct l.option_id as id, l.description, l.room_layout::text as room_layout,
           o.label as option_label, g.name as group_name, pr.name as producer_name
    from product_option_layout l
    join product_option o on o.id = l.option_id and o.deleted_at is null
    join product_option_group g on g.id = o.group_id and g.deleted_at is null
    join product_option_group_assignment a on a.group_id = g.id
    join product p on p.id = a.product_id
    join producer pr on pr.id = g.producer_id
    where ${PUBLISHED}`);
  const layoutTranslations = new Map<
    string,
    Partial<Record<CheckedLocale, { description: string | null; roomLayout: unknown }>>
  >();
  for (const row of await query(sql`
    select option_id, locale::text as locale, description, room_layout::text as room_layout
    from product_option_layout_translation`)) {
    const entry = layoutTranslations.get(row.option_id!) ?? {};
    entry[row.locale as CheckedLocale] = {
      description: row.description,
      roomLayout: row.room_layout ? JSON.parse(row.room_layout) : null,
    };
    layoutTranslations.set(row.option_id!, entry);
  }
  for (const row of layouts) {
    items.push(
      ...layoutTranslationItems({
        ref: `${row.producer_name} / ${row.group_name} / ${row.option_label}`,
        description: row.description,
        roomLayout: row.room_layout ? JSON.parse(row.room_layout) : null,
        translations: layoutTranslations.get(row.id!) ?? {},
      }),
    );
  }

  return items;
}

async function main() {
  const gaps = findTranslationGaps(await collectItems());
  console.log(formatTranslationGaps(gaps));
  console.log(`\nSprawdzone języki: ${CHECKED_LOCALES.join(", ")}`);
  process.exit(gaps.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
