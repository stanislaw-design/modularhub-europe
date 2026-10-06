import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { referenceTextTranslation } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/routing";
import { resolveReferenceText } from "@/lib/i18n/resolve-translated-text";

// Słownik po dokładnym polskim tekście (spec 0067 AC-5): jedno zapytanie dla
// wszystkich tekstów naraz. Dla pl i dla pustej listy nie dotyka bazy (AC-7).
// Zwraca funkcję, która tłumaczy lub zwraca polski tekst (AC-6).
export async function loadReferenceTranslator(
  texts: (string | null | undefined)[],
  locale: Locale,
): Promise<(source: string) => string> {
  const unique = [...new Set(texts.filter((text): text is string => typeof text === "string" && text.length > 0))];
  if (locale === "pl" || unique.length === 0) return (source) => source;

  const rows = await db
    .select({ sourcePl: referenceTextTranslation.sourcePl, translated: referenceTextTranslation.translated })
    .from(referenceTextTranslation)
    .where(and(inArray(referenceTextTranslation.sourcePl, unique), eq(referenceTextTranslation.locale, locale)));
  const map = new Map(rows.map((row) => [row.sourcePl, row.translated]));
  return (source) => resolveReferenceText(source, map.get(source));
}
