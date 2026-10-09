// Czysty rdzeń skryptu `npm run check:translations` (spec 0067 AC-8, AC-9):
// brak tłumaczenia to pole, w którym tekst źródłowy jest niepusty, a
// tłumaczenie w danym języku puste, same spacje albo nie istnieje. Źródło
// puste nigdy nie jest brakiem. Nie ocenia, czy tłumaczenie jest aktualne
// wobec zmienionego polskiego źródła (spec 0067 Follow-up).

export const CHECKED_LOCALES = ["en", "de", "nl"] as const;
export type CheckedLocale = (typeof CHECKED_LOCALES)[number];

export interface TranslationCheckItem {
  entity: string;
  field: string;
  // Czytelny opis wiersza (nazwa produktu lub producenta plus tekst źródłowy).
  ref: string;
  source: string | null | undefined;
  translations: Partial<Record<CheckedLocale, string | null | undefined>>;
}

export interface TranslationGap {
  locale: CheckedLocale;
  entity: string;
  field: string;
  ref: string;
  source: string;
}

function isFilled(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function findTranslationGaps(items: TranslationCheckItem[]): TranslationGap[] {
  const gaps: TranslationGap[] = [];
  for (const item of items) {
    if (!isFilled(item.source)) continue;
    for (const locale of CHECKED_LOCALES) {
      if (isFilled(item.translations[locale])) continue;
      gaps.push({ locale, entity: item.entity, field: item.field, ref: item.ref, source: item.source });
    }
  }
  return gaps;
}

export interface LayoutCheckInput {
  // Czytelny opis opcji układu (producent, produkt, nazwa opcji).
  ref: string;
  description: string | null | undefined;
  // product_option_layout.room_layout: [{id, name, ...}], surowy jsonb.
  roomLayout: unknown;
  // product_option_layout_translation per język: opis i [{id, name}].
  translations: Partial<Record<CheckedLocale, { description: string | null | undefined; roomLayout: unknown } | undefined>>;
}

// Wersja układu opcji (spec 0069 AC-7): opis i nazwa każdego pomieszczenia to
// osobne pola do przetłumaczenia, pomieszczenia dopasowane po `id`.
export function layoutTranslationItems(input: LayoutCheckInput): TranslationCheckItem[] {
  const items: TranslationCheckItem[] = [
    {
      entity: "product_option_layout",
      field: "description",
      ref: input.ref,
      source: input.description,
      translations: Object.fromEntries(CHECKED_LOCALES.map((locale) => [locale, input.translations[locale]?.description])),
    },
  ];
  const rooms = Array.isArray(input.roomLayout) ? input.roomLayout : [];
  for (const room of rooms) {
    if (!room || typeof room !== "object") continue;
    const { id, name } = room as { id?: unknown; name?: unknown };
    if (typeof id !== "string" || typeof name !== "string") continue;
    const translations: Partial<Record<CheckedLocale, string | null>> = {};
    for (const locale of CHECKED_LOCALES) {
      const translated = input.translations[locale]?.roomLayout;
      const match = Array.isArray(translated)
        ? translated.find((entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === id)
        : undefined;
      const translatedName = match ? (match as { name?: unknown }).name : undefined;
      translations[locale] = typeof translatedName === "string" ? translatedName : null;
    }
    items.push({ entity: "product_option_layout", field: "room_layout.name", ref: `${input.ref} / ${name}`, source: name, translations });
  }
  return items;
}

// Wypis per język, encja i pole, z listą wierszy (ucięta do `limit` na grupę).
export function formatTranslationGaps(gaps: TranslationGap[], limit = 20): string {
  if (gaps.length === 0) return "Brak braków w tłumaczeniach (en, de, nl).";
  const groups = new Map<string, TranslationGap[]>();
  for (const gap of gaps) {
    const key = `${gap.locale} | ${gap.entity}.${gap.field}`;
    const list = groups.get(key) ?? [];
    list.push(gap);
    groups.set(key, list);
  }
  const lines = [`Braki w tłumaczeniach: ${gaps.length}`];
  for (const [key, list] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`\n${key}: ${list.length}`);
    for (const gap of list.slice(0, limit)) lines.push(`  - ${gap.ref}`);
    if (list.length > limit) lines.push(`  ... i ${list.length - limit} więcej`);
  }
  return lines.join("\n");
}
