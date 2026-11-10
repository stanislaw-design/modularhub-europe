import { cacheLife, cacheTag } from "next/cache";
import { getProducerById, getProducerPhotoUrl, getProducers } from "@/lib/data/producers";
import { productTag, producerTag } from "@/lib/cache-tags";
import { getInteriorStylesForProduct, getProducerContentItems, getProductOptionGroups } from "@/lib/db/queries";
import {
  getFeaturedProjectByFamily,
  getProducerVolumeProfile,
  getProductEnvelopeParameters,
  getProductOptionLayouts,
  getProjectById,
  getProjectBySlugOrId,
  getProjects,
  getSaunaProducerOptions,
  getVerifiedVolumeManufacturerProjects,
} from "@/lib/data/projects";
import type { Locale } from "@/lib/i18n/routing";

// Spec 0078 AC-7: cienkie wrappery z "use cache" dla publicznych czytników.
// Zasady (spec Key invariants):
// - w środku nie ma cookies(), headers(), searchParams ani sesji: wartości
//   przychodzą jako argumenty (język i filtry trafiają do klucza cache);
// - błąd bazy przy chybieniu leci dalej i NIE jest zapisany w cache, a
//   wywołujący łapie go sam (strona pokazuje komunikat, Sentry dostaje błąd);
// - tagi: `products`, `product:{id}`, `producers`, `producer:{id}`. Akcje i
//   endpoint /api/revalidate unieważniają je (lib/cache-tags.ts).
// Czytniki zależne od oglądającego (np. getFavoritesForClient) tu nie trafiają.

type GetProjectsFilters = NonNullable<Parameters<typeof getProjects>[0]>;

const MAX_QUERY_LENGTH = 80;

/**
 * Sprowadza filtry do postaci kanonicznej: tylko znane klucze, bez pustych
 * wartości, tablice posortowane, tekst wyszukiwania przycięty i w małych
 * literach. Dzięki temu bot nie rozdmucha liczby wpisów w cache losowymi
 * wartościami (spec 0078 Decision, "Filtry wyników").
 */
export function normalizeProjectFilters(filters: GetProjectsFilters = {}): GetProjectsFilters {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(filters).sort()) {
    const value = (filters as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) normalized[key] = [...value].sort();
      continue;
    }
    if (key === "q" && typeof value === "string") {
      const query = value.trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
      if (query) normalized[key] = query;
      continue;
    }
    normalized[key] = value;
  }
  return normalized as GetProjectsFilters;
}

// --- produkty ---------------------------------------------------------------

/** Dla strony statycznej (szkielet): wpis w pamięci instancji. */
export async function getProjectsCached(filters?: GetProjectsFilters) {
  "use cache";
  cacheLife("public");
  cacheTag("products");
  return getProjects(normalizeProjectFilters(filters));
}

/** Dla zapytań czytanych w czasie żądania (zależnych od searchParams): wspólny cache między instancjami. */
export async function getProjectsForRequestCached(filters?: GetProjectsFilters) {
  "use cache: remote";
  cacheLife("public");
  cacheTag("products");
  return getProjects(normalizeProjectFilters(filters));
}

export async function getProjectByIdCached(id: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("products", `product:${id}`);
  return getProjectById(id, locale);
}

export async function getProjectBySlugOrIdCached(value: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("products");
  return getProjectBySlugOrId(value, locale);
}

export async function getFeaturedProjectByFamilyCached(
  family: Parameters<typeof getFeaturedProjectByFamily>[0],
  locale: Locale = "pl",
) {
  "use cache";
  cacheLife("public");
  cacheTag("products");
  return getFeaturedProjectByFamily(family, locale);
}

export async function getSaunaProducerOptionsCached() {
  "use cache";
  cacheLife("public");
  cacheTag("products", "producers");
  return getSaunaProducerOptions();
}

export async function getVerifiedVolumeManufacturerProjectsCached(
  ...args: Parameters<typeof getVerifiedVolumeManufacturerProjects>
) {
  "use cache";
  cacheLife("public");
  cacheTag("products", "producers");
  return getVerifiedVolumeManufacturerProjects(...args);
}

// --- dane jednego produktu (strony szczegółów) -------------------------------

export async function getProductOptionGroupsCached(productId: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("products", productTag(productId));
  return getProductOptionGroups(productId, locale);
}

export async function getInteriorStylesForProductCached(productId: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("products", productTag(productId));
  return getInteriorStylesForProduct(productId, locale);
}

export async function getProducerContentItemsCached(
  ...args: Parameters<typeof getProducerContentItems>
) {
  "use cache";
  cacheLife("public");
  cacheTag("products", "producers");
  return getProducerContentItems(...args);
}

export async function getProductOptionLayoutsCached(productId: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("products", productTag(productId));
  return getProductOptionLayouts(productId, locale);
}

export async function getProductEnvelopeParametersCached(productId: string) {
  "use cache";
  cacheLife("public");
  cacheTag("products", productTag(productId));
  return getProductEnvelopeParameters(productId);
}

export async function getProducerVolumeProfileCached(producerId: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("producers", "products", producerTag(producerId));
  return getProducerVolumeProfile(producerId, locale);
}

// --- producenci -------------------------------------------------------------

export async function getProducersCached(locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("producers");
  return getProducers(locale);
}

export async function getProducerPhotoUrlCached(producerId: string) {
  "use cache";
  cacheLife("public");
  cacheTag("producers", producerTag(producerId));
  return getProducerPhotoUrl(producerId);
}

export async function getProducerByIdCached(id: string, locale: Locale = "pl") {
  "use cache";
  cacheLife("public");
  cacheTag("producers", `producer:${id}`);
  return getProducerById(id, locale);
}
