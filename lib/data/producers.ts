import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { offer, order, producer, producerDeliveryCountry, product } from "@/lib/db/schema";
import { resolveProductDocumentPhotos } from "./projects";
import type { CountryCode, Producer } from "./types";

// Same guard as getProjectById (spec 0020 AC-6): producer.id is a uuid
// column, so an invalid id (old fixture slug, arbitrary URL literal) would
// throw a DB error instead of returning null without this early check.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductAggregate {
  modelsCount: number;
  sizeRangeM2Min: number;
  sizeRangeM2Max: number;
}

// One aggregate query for every producer at once (never one query per row,
// same batching convention as resolveProductDocumentPhotos). Producers with
// zero published products are absent from the result on purpose (AC-17):
// modelsCount/size range would be meaningless without at least one.
async function loadProductAggregatesByProducer(producerIds?: string[]): Promise<Map<string, ProductAggregate>> {
  const conditions = [eq(product.status, "published"), isNull(product.deletedAt)];
  if (producerIds) conditions.push(inArray(product.producerId, producerIds));

  const rows = await db
    .select({
      producerId: product.producerId,
      modelsCount: sql<number>`count(*)::int`,
      sizeMin: sql<number | null>`min(${product.floorAreaM2})`,
      sizeMax: sql<number | null>`max(${product.floorAreaM2})`,
    })
    .from(product)
    .where(and(...conditions))
    .groupBy(product.producerId);

  const map = new Map<string, ProductAggregate>();
  for (const row of rows) {
    map.set(row.producerId, {
      modelsCount: row.modelsCount,
      sizeRangeM2Min: row.sizeMin ?? 0,
      sizeRangeM2Max: row.sizeMax ?? 0,
    });
  }
  return map;
}

// "Zrealizowany" = zamówienie dotarło do odbioru albo jest już w gwarancji,
// czyli dom faktycznie stoi u klienta (order.currentStage), nie tylko został
// zamówiony. Join przez offer.producerId (order nie ma własnego producentId).
async function loadCompletedOrderCountByProducer(producerIds: string[]): Promise<Map<string, number>> {
  if (producerIds.length === 0) return new Map();

  const rows = await db
    .select({ producerId: offer.producerId, count: sql<number>`count(*)::int` })
    .from(order)
    .innerJoin(offer, eq(order.offerId, offer.id))
    .where(and(inArray(offer.producerId, producerIds), inArray(order.currentStage, ["odbior", "gwarancja"])))
    .groupBy(offer.producerId);

  const map = new Map<string, number>();
  for (const row of rows) map.set(row.producerId, row.count);
  return map;
}

async function loadDeliveryCountriesByProducer(producerIds: string[]): Promise<Map<string, CountryCode[]>> {
  if (producerIds.length === 0) return new Map();

  const rows = await db
    .select({ producerId: producerDeliveryCountry.producerId, countryCode: producerDeliveryCountry.countryCode })
    .from(producerDeliveryCountry)
    .where(inArray(producerDeliveryCountry.producerId, producerIds));

  const map = new Map<string, CountryCode[]>();
  for (const row of rows) {
    const list = map.get(row.producerId) ?? [];
    list.push(row.countryCode as CountryCode);
    map.set(row.producerId, list);
  }
  return map;
}

// featuredPhotoUrl (AC-17): the cover photo of one published product per
// producer, reusing the same document-table-first, coverImageUrl-fallback
// resolution as every other screen (resolveProductDocumentPhotos, spec 0031
// strangler), never a hand rolled second image path.
async function loadFeaturedPhotoByProducer(producerIds: string[]): Promise<Map<string, string>> {
  if (producerIds.length === 0) return new Map();

  const rows = await db
    .select({ producerId: product.producerId, productId: product.id, coverImageUrl: product.coverImageUrl })
    .from(product)
    .where(
      and(eq(product.status, "published"), isNull(product.deletedAt), inArray(product.producerId, producerIds)),
    )
    .orderBy(product.createdAt);

  const pickedByProducer = new Map<string, { productId: string; coverImageUrl: string | null }>();
  for (const row of rows) {
    if (!pickedByProducer.has(row.producerId)) {
      pickedByProducer.set(row.producerId, { productId: row.productId, coverImageUrl: row.coverImageUrl });
    }
  }

  const documentPhotos = await resolveProductDocumentPhotos(
    [...pickedByProducer.values()].map((picked) => picked.productId),
  );

  const result = new Map<string, string>();
  for (const [producerId, picked] of pickedByProducer) {
    const photo = documentPhotos.get(picked.productId);
    result.set(producerId, photo?.coverUrl ?? picked.coverImageUrl ?? "");
  }
  return result;
}

function mapRowToProducer(
  row: typeof producer.$inferSelect,
  aggregate: ProductAggregate,
  deliveryCountries: CountryCode[],
  featuredPhotoUrl: string,
  completedProjectsCount: number,
): Producer {
  return {
    id: row.id,
    name: row.name,
    countryCode: row.countryCode as CountryCode,
    // rating is nullable until the producer's first review (AC-17): mapped
    // to 0 here so StarRating (which calls toFixed unconditionally) never
    // receives null.
    rating: row.rating ?? 0,
    reviewCount: row.reviewCount,
    modelsCount: aggregate.modelsCount,
    sizeRangeM2Min: aggregate.sizeRangeM2Min,
    sizeRangeM2Max: aggregate.sizeRangeM2Max,
    deliveryCountries,
    featuredPhotoUrl,
    completedProjectsCount,
    verified: row.verificationStatus === "approved",
    inquiryResponseTimeLabel: row.inquiryResponseTimeLabel ?? undefined,
    showroomVisitAvailable: row.showroomVisitAvailable,
    showroomVisitNote: row.showroomVisitNote ?? undefined,
  };
}

// Real DB read (AC-17, spec 0038): replaces the fixture data whose ids
// ("prod-budman", …) never matched a real producer uuid, so the producer
// card never actually rendered. Skips any producer with zero published
// products, same boundary as loadProductAggregatesByProducer.
export async function getProducers(): Promise<Producer[]> {
  const aggregates = await loadProductAggregatesByProducer();
  const producerIds = [...aggregates.keys()];
  if (producerIds.length === 0) return [];

  const rows = await db
    .select()
    .from(producer)
    .where(and(inArray(producer.id, producerIds), isNull(producer.deletedAt)));

  const [deliveryMap, photoMap, completedMap] = await Promise.all([
    loadDeliveryCountriesByProducer(producerIds),
    loadFeaturedPhotoByProducer(producerIds),
    loadCompletedOrderCountByProducer(producerIds),
  ]);

  return rows.map((row) =>
    mapRowToProducer(
      row,
      aggregates.get(row.id)!,
      deliveryMap.get(row.id) ?? [],
      photoMap.get(row.id) ?? "",
      completedMap.get(row.id) ?? 0,
    ),
  );
}

export async function getProducerById(id: string): Promise<Producer | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const [row] = await db
    .select()
    .from(producer)
    .where(and(eq(producer.id, id), isNull(producer.deletedAt)));
  if (!row) return null;

  const aggregates = await loadProductAggregatesByProducer([id]);
  const aggregate = aggregates.get(id);
  // Every real caller today (the /project/[id] producer card) only ever
  // passes a producer that already has the published product being viewed,
  // so this branch shouldn't occur in practice (spec 0038 AC-17) — kept as a
  // defensive null instead of a crash on the never-verified case.
  if (!aggregate) return null;

  const [deliveryMap, photoMap, completedMap] = await Promise.all([
    loadDeliveryCountriesByProducer([id]),
    loadFeaturedPhotoByProducer([id]),
    loadCompletedOrderCountByProducer([id]),
  ]);

  return mapRowToProducer(
    row,
    aggregate,
    deliveryMap.get(id) ?? [],
    photoMap.get(id) ?? "",
    completedMap.get(id) ?? 0,
  );
}
