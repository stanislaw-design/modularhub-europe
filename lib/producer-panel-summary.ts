import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { producerMatchesProjectRequestSql } from "@/lib/db/project-request-matching";
import {
  bulkProductInquiry,
  inquiry,
  inquiryItem,
  offer,
  producerCertification,
  product,
  projectQuote,
  projectRequest,
} from "@/lib/db/schema";
import { getProducerVolumeVerificationStatus } from "@/lib/db/queries";

// Spec 0074 (redesign panelu producenta): liczniki pulpitu i menu w jednym miejscu.
// Każda funkcja dostaje producerId wyprowadzony z sesji przez wywołującego
// (requirePanelProducerSession + getProducerIdForUser), nigdy z przeglądarki (AC-15).
// Bez migracji: wszystko wynika z istniejących tabel.

// Statusy, w których zapytanie przyjmuje wyceny (jak BOARD_OPEN_STATUSES w queries.ts).
const OPEN_STATUSES = ["open", "quoted", "published"] as const;
const LEGACY_STAGE = "legacy_direct" as const;

// Jak PRODUCT_ID niżej: zapytanie z jedną tabelą traci kwalifikator kolumny w podzapytaniu.
const REQUEST_ID = sql.raw(`"project_request"."id"`);

export type VolumeVerificationStatus = NonNullable<Awaited<ReturnType<typeof getProducerVolumeVerificationStatus>>>;

export interface PanelNavCounts {
  needsOfferCount: number;
  unreadDecisionCount: number;
  // 0, gdy producent nie ma zatwierdzonej weryfikacji wolumenowej (AC-2).
  boardWithoutQuoteCount: number;
  volumeVerificationStatus: VolumeVerificationStatus;
}

export interface NeedsOfferSummary {
  count: number;
  oldestAt: Date | null;
}

// Zapytania z listy porównań (legacy_direct, status open) z produktem tego producenta,
// plus zapytania o jego produkty, które nadal przyjmują wyceny i nie mają jego wyceny.
export async function getNeedsOfferSummary(producerId: string): Promise<NeedsOfferSummary> {
  const [legacyRows, bulkRows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(distinct ${inquiry.id})::int`,
        oldest: sql<string | null>`min(${inquiry.receivedAt})`,
      })
      .from(inquiry)
      .innerJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
      .innerJoin(product, and(eq(product.id, inquiryItem.productId), eq(product.producerId, producerId)))
      .where(and(eq(inquiry.stage, LEGACY_STAGE), eq(inquiry.status, "open"))),
    db
      .select({
        count: sql<number>`count(*)::int`,
        oldest: sql<string | null>`min(${bulkProductInquiry.createdAt})`,
      })
      .from(bulkProductInquiry)
      .innerJoin(product, and(eq(product.id, bulkProductInquiry.productId), eq(product.producerId, producerId)))
      .where(
        and(
          inArray(bulkProductInquiry.status, [...OPEN_STATUSES]),
          isNull(bulkProductInquiry.selectedQuoteId),
          sql`${bulkProductInquiry.deadlineAt} >= now()`,
          sql`not exists (
            select 1 from project_quote q
            where q.bulk_product_inquiry_id = ${bulkProductInquiry.id} and q.producer_id = ${producerId}
          )`,
        ),
      ),
  ]);

  // Agregat `min(...)` wraca z sterownika jako tekst, nie Date.
  const dates = [legacyRows[0]?.oldest, bulkRows[0]?.oldest]
    .filter((value): value is string => value != null)
    .map((value) => new Date(value));
  return {
    count: (legacyRows[0]?.count ?? 0) + (bulkRows[0]?.count ?? 0),
    oldestAt: dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null,
  };
}

// Otwarte, dopasowane ogłoszenia z tablicy, które nadal przyjmują wyceny i nie mają
// wyceny tego producenta. `count(*)` bez stronicowania; 0 bez zatwierdzonej weryfikacji.
export async function getBoardWithoutQuoteCount(producerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectRequest)
    .where(
      and(
        inArray(projectRequest.status, [...OPEN_STATUSES]),
        isNull(projectRequest.selectedQuoteId),
        sql`${projectRequest.deadlineAt} >= now()`,
        producerMatchesProjectRequestSql(producerId),
        sql`not exists (
          select 1 from project_quote q
          where q.project_request_id = ${REQUEST_ID} and q.producer_id = ${producerId}
        )`,
      ),
    );
  return row?.count ?? 0;
}

// Trzy lekkie liczniki dla menu (układ ładuje je przy każdym wejściu w panel).
export async function getPanelNavCounts(
  producerId: string,
  unreadDecisionCount: number,
): Promise<PanelNavCounts> {
  const verification = (await getProducerVolumeVerificationStatus(producerId)) ?? "not_submitted";
  const [needsOffer, boardWithoutQuoteCount] = await Promise.all([
    getNeedsOfferSummary(producerId),
    verification === "approved" ? getBoardWithoutQuoteCount(producerId) : Promise.resolve(0),
  ]);
  return {
    needsOfferCount: needsOffer.count,
    unreadDecisionCount,
    boardWithoutQuoteCount,
    volumeVerificationStatus: verification,
  };
}

// Wycena `active` tego producenta (obie ścieżki), kafelek "Moje wyceny" i zakładka.
export async function getActiveQuotesCount(producerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectQuote)
    .where(and(eq(projectQuote.producerId, producerId), eq(projectQuote.status, "active")));
  return row?.count ?? 0;
}

// Wszystkie wyceny producenta (zakładka "Moje wyceny" na tablicy, AC-9).
export async function getAllQuotesCount(producerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectQuote)
    .where(eq(projectQuote.producerId, producerId));
  return row?.count ?? 0;
}

// Liczba wysłanych ofert z listy porównań (status `active`), linijka kafelka "Otwarte zapytania".
export async function getSentOffersCount(producerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offer)
    .innerJoin(inquiry, eq(inquiry.id, offer.inquiryId))
    .where(and(eq(offer.producerId, producerId), eq(offer.status, "active"), eq(inquiry.stage, LEGACY_STAGE)));
  return row?.count ?? 0;
}

// Kolumna zapytania zewnętrznego nazwana wprost: w zapytaniu z jedną tabelą drizzle pomija kwalifikator,
// a samo `id` w podzapytaniu wskazałoby jego własną tabelę (patrz lib/db/project-request-matching.ts).
const PRODUCT_ID = sql.raw(`"product"."id"`);

export type ProductMissing = "draft" | "photo" | "price" | "translation";

export interface ProductCompleteness {
  productId: string;
  status: "draft" | "published";
  // Kolejność z AC-10: szkic, zdjęcie, cena, tłumaczenie. Pierwszy element to "pierwszy brak".
  missing: ProductMissing[];
}

// Brak (AC-10) w jednym zapytaniu zamiast N+1: zdjęcie produktu (dokument
// `product_photo`), cena (domyślny wariant z ceną albo wyceną indywidualną),
// tłumaczenie nazwy w en, de i nl (tylko opublikowane), szkic.
export async function getProductCompleteness(producerId: string): Promise<ProductCompleteness[]> {
  const rows = await db
    .select({
      productId: product.id,
      status: product.status,
      hasPhoto: sql<boolean>`exists (
        select 1 from document d
        where d.product_id = ${PRODUCT_ID} and d.purpose = 'product_photo' and d.deleted_at is null
      )`,
      hasPrice: sql<boolean>`exists (
        select 1 from product_variant v
        where v.product_id = ${PRODUCT_ID} and v.is_default and v.deleted_at is null
          and (v.price_min_cents is not null or v.price_on_request)
      )`,
      translationCount: sql<number>`(
        select count(distinct t.locale)::int from product_translation t
        where t.product_id = ${PRODUCT_ID} and t.locale in ('en', 'de', 'nl') and btrim(coalesce(t.name, '')) <> ''
      )`,
    })
    .from(product)
    .where(and(eq(product.producerId, producerId), isNull(product.deletedAt)));

  return rows.map((row) => {
    const missing: ProductMissing[] = [];
    if (row.status === "draft") missing.push("draft");
    if (!row.hasPhoto) missing.push("photo");
    if (!row.hasPrice) missing.push("price");
    if (row.status === "published" && row.translationCount < 3) missing.push("translation");
    return { productId: row.productId, status: row.status, missing };
  });
}

export interface ProductsSummary {
  publishedCount: number;
  // Opublikowane z jakimkolwiek brakiem (AC-5, AC-6).
  incompleteCount: number;
}

export function summarizeProducts(completeness: ProductCompleteness[]): ProductsSummary {
  const published = completeness.filter((entry) => entry.status === "published");
  return {
    publishedCount: published.length,
    incompleteCount: published.filter((entry) => entry.missing.length > 0).length,
  };
}

export async function getCertificationsCount(producerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(producerCertification)
    .where(eq(producerCertification.producerId, producerId));
  return row?.count ?? 0;
}
