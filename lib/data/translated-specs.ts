import { getTechnicalSpecsSchema, type OutdoorKitchenTechnicalSpecs } from "@/lib/product-technical-specs";

// Czyste helpery tłumaczenia typowanych technicalSpecs (bez lib/db/client), wydzielone z
// projects.ts, żeby testy komponentów i tego modułu nie uruchamiały klienta Neon.

// Sauna (spec 0061) ma typowany odczyt technicalSpecs po angielskich kluczach
// (claddingMaterial, ...), więc tłumaczenie bierze wartość z tego samego
// kształtu `{ specs: { "<klucz>": { value } } }` co outdoor-tv wyżej, tylko
// kluczem jest nazwa pola schematu, nie polski napis. Brak tłumaczenia albo
// pusta wartość spada na polski tekst (ten sam fallback AC-6).
export function resolveTranslatedSpecValue(base: string | undefined, translated: unknown, key: string): string {
  const specs = translated && typeof translated === "object" ? (translated as { specs?: unknown }).specs : undefined;
  const entry = specs && typeof specs === "object" ? (specs as Record<string, unknown>)[key] : undefined;
  const value =
    entry && typeof entry === "object" && typeof (entry as { value?: unknown }).value === "string"
      ? (entry as { value: string }).value.trim()
      : "";
  return value || (base ?? "");
}

// Kuchnia ogrodowa (spec 0086 AC-7): typowany odczyt na outdoorKitchenSpecsShape. Wiersz,
// który nie przechodzi schematu, daje undefined (strona pokazuje wtedy resztę bez sekcji
// wymiarów), nigdy wyjątek. Tekstowe pola tłumaczy ten sam kształt `{ specs: { klucz: { value } } }`
// co saunę, a listę standardu cała tablica `standardFeatures` (tej samej długości co polska,
// inaczej fallback na polską listę, żeby nie mieszać języków).
export function resolveOutdoorKitchenSpecs(
  raw: unknown,
  translated: unknown,
): OutdoorKitchenTechnicalSpecs | undefined {
  const parsed = getTechnicalSpecsSchema("outdoor-kitchen", "published").safeParse(raw);
  if (!parsed.success) return undefined;
  const base = parsed.data as OutdoorKitchenTechnicalSpecs;
  const optional = (value: string | undefined, key: string) =>
    value === undefined ? undefined : resolveTranslatedSpecValue(value, translated, key);
  const translatedList =
    translated && typeof translated === "object"
      ? (translated as { standardFeatures?: unknown }).standardFeatures
      : undefined;
  const standardFeatures =
    Array.isArray(translatedList) &&
    translatedList.length === base.standardFeatures.length &&
    translatedList.every((item) => typeof item === "string" && item.trim().length > 0)
      ? (translatedList as string[])
      : base.standardFeatures;
  return {
    ...base,
    bodyMaterial: resolveTranslatedSpecValue(base.bodyMaterial, translated, "bodyMaterial"),
    worktopMaterial: optional(base.worktopMaterial, "worktopMaterial"),
    foundationRequirement: optional(base.foundationRequirement, "foundationRequirement"),
    deliveryNote: resolveTranslatedSpecValue(base.deliveryNote, translated, "deliveryNote"),
    standardFeatures,
  };
}
