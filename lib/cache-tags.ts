import { updateTag } from "next/cache";

// Spec 0078 AC-8: jedyne miejsce, które zna schemat tagów cache danych
// publicznych. Czytniki w `lib/data/public-cache.ts` ustawiają te same tagi.
// `updateTag` działa tylko w akcjach serwerowych; route handler używa
// `revalidateTag(tag, { expire: 0 })` (patrz `app/api/revalidate/route.ts`).

export const CACHE_TAGS = {
  products: "products",
  producers: "producers",
} as const;

/** Tagi dozwolone w `POST /api/revalidate`. */
export const REVALIDATABLE_TAGS: readonly string[] = [CACHE_TAGS.products, CACHE_TAGS.producers];

export const productTag = (id: string) => `product:${id}`;
export const producerTag = (id: string) => `producer:${id}`;

/** Po zapisie produktu, wariantów, opcji, zdjęć lub tłumaczeń. */
export function invalidateProduct(productId?: string) {
  updateTag(CACHE_TAGS.products);
  if (productId) updateTag(productTag(productId));
}

/** Po zapisie producenta, certyfikatów lub danych firmy (zmienia też karty produktów). */
export function invalidateProducer(producerId?: string) {
  updateTag(CACHE_TAGS.producers);
  updateTag(CACHE_TAGS.products);
  if (producerId) updateTag(producerTag(producerId));
}
