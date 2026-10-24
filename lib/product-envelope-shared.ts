import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { product, productEnvelopeParameter } from "@/lib/db/schema";
import type { ParsedProductEnvelopeParameter } from "@/lib/product-envelope-parameters";

// Wspólne dla akcji producenta (lib/product-envelope-actions.ts) i administratora
// (lib/product-envelope-admin-actions.ts). Bez "use server", bo ten plik eksportuje
// też zwykłe stałe i funkcje pomocnicze, nie tylko akcje.

export const STALE_ERROR = "Wpis został zmieniony od ostatniego odczytu. Odśwież stronę i spróbuj ponownie.";
export const NOT_FOUND_ERROR = "Nie znaleziono wpisu.";
export const DUPLICATE_ERROR = "Parametr dla tej przegrody i wielkości już istnieje.";
export const FAMILY_NOT_SUPPORTED_ERROR =
  "Parametry izolacji można dodać tylko do domu albo kontenera mieszkalnego.";
export const UNIQUE_VIOLATION = "23505";

export interface EnvelopeProductRef {
  id: string;
  producerId: string;
  family: string;
  containerSubcategory: string | null;
}

export async function loadEnvelopeProduct(productId: string): Promise<EnvelopeProductRef | null> {
  const [row] = await db
    .select({
      id: product.id,
      producerId: product.producerId,
      family: product.family,
      containerSubcategory: product.containerSubcategory,
    })
    .from(product)
    .where(eq(product.id, productId));
  return row ?? null;
}

// Pola, których zmiana cofa potwierdzenie (spec 0075 AC-9). Wyrażenia w SET widzą
// wartości sprzed zmiany, więc porównanie "changed" zestawia nową wartość z tą,
// która jest jeszcze w bazie. method_note celowo nie cofa potwierdzenia.
export function envelopeUpdateSet(parsed: ParsedProductEnvelopeParameter) {
  const t = productEnvelopeParameter;
  const value = parsed.value.toFixed(3);
  const changed = sql`(${t.element} IS DISTINCT FROM ${parsed.element} OR ${t.quantity} IS DISTINCT FROM ${parsed.quantity} OR ${t.value} IS DISTINCT FROM ${value}::numeric OR ${t.method} IS DISTINCT FROM ${parsed.method} OR ${t.asOfDate} IS DISTINCT FROM ${parsed.asOfDate}::date)`;
  return {
    element: parsed.element,
    quantity: parsed.quantity,
    value,
    method: parsed.method,
    methodNote: parsed.methodNote,
    asOfDate: parsed.asOfDate,
    confirmationStatus: sql`CASE WHEN ${changed} THEN 'self_reported' ELSE ${t.confirmationStatus} END`,
    confirmedAt: sql`CASE WHEN ${changed} THEN NULL ELSE ${t.confirmedAt} END`,
    confirmedBy: sql`CASE WHEN ${changed} THEN NULL ELSE ${t.confirmedBy} END`,
    version: sql`${t.version} + 1`,
    updatedAt: new Date(),
  };
}

export function envelopeInsertValues(productId: string, parsed: ParsedProductEnvelopeParameter) {
  return {
    productId,
    element: parsed.element,
    quantity: parsed.quantity,
    value: parsed.value.toFixed(3),
    method: parsed.method,
    methodNote: parsed.methodNote,
    asOfDate: parsed.asOfDate,
  };
}
