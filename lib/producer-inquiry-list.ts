import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { country, inquiry, inquiryItem, product } from "@/lib/db/schema";
import { getProductInquiriesForProducer } from "@/lib/db/queries";

// Spec 0074 AC-7: jedna lista dwóch źródeł zapytań producenta. Lista nigdy nie wybiera
// kolumn kontaktowych klienta (imię, e-mail, telefon), a wszystko jest ograniczone do
// producerId wyprowadzonego z sesji przez wywołującego (AC-15).

export const INQUIRY_LIST_STATUSES = ["needs-offer", "decision", "offered", "closed"] as const;
export type InquiryListStatus = (typeof INQUIRY_LIST_STATUSES)[number];
export type InquiryListFilter = InquiryListStatus | "all";
export type InquiryListSource = "shortlist" | "product";

export interface MergedInquiryRow {
  id: string;
  source: InquiryListSource;
  title: string;
  countryName: string;
  status: InquiryListStatus;
  // Data zapytania: wiek w wierszu i kolejność "Wymaga oferty" od najstarszego.
  createdAt: Date;
  href: string;
  // Tylko zapytania z listy porównań: klient podjął decyzję, jeszcze nieobejrzaną.
  unreadDecision: boolean;
}

type OwnOutcome = "active" | "accepted" | "rejected" | "superseded" | null;

// Wspólna część reguł statusu: decyzja klienta i oferta wysłana wynikają z własnej oferty
// albo wyceny producenta.
function statusFromOwnOutcome(outcome: OwnOutcome): InquiryListStatus | null {
  if (outcome === "accepted" || outcome === "rejected") return "decision";
  if (outcome === "active" || outcome === "superseded") return "offered";
  return null;
}

export function deriveShortlistStatus(
  inquiryStatus: "open" | "offered" | "closed",
  ownOffer: OwnOutcome,
): InquiryListStatus {
  if (ownOffer === "accepted" || ownOffer === "rejected") return "decision";
  if (inquiryStatus === "open") return "needs-offer";
  if (inquiryStatus === "offered") return "offered";
  return "closed";
}

export function deriveProductInquiryStatus(acceptingQuotes: boolean, ownQuote: OwnOutcome): InquiryListStatus {
  const fromOutcome = statusFromOwnOutcome(ownQuote);
  if (fromOutcome) return fromOutcome;
  return acceptingQuotes ? "needs-offer" : "closed";
}

// "Wymaga oferty" od najstarszego, potem pozostałe od najnowszego.
export function sortMergedInquiries(rows: MergedInquiryRow[]): MergedInquiryRow[] {
  return [...rows].sort((a, b) => {
    const aFirst = a.status === "needs-offer";
    const bFirst = b.status === "needs-offer";
    if (aFirst !== bFirst) return aFirst ? -1 : 1;
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    return aFirst ? diff : -diff;
  });
}

export function parseInquiryListFilter(value: string | string[] | undefined): InquiryListFilter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all") return "all";
  return (INQUIRY_LIST_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as InquiryListStatus) : null;
}

// Kolumny zewnętrznej tabeli nazwane wprost: w zapytaniu bez aliasu drizzle gubi kwalifikator w podzapytaniu.
const INQUIRY_ID = sql.raw(`"inquiry"."id"`);

async function getShortlistRowsForProducer(producerId: string, hrefBase: string): Promise<MergedInquiryRow[]> {
  const rows = await db
    .select({
      id: inquiry.id,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
      countryName: country.name,
      productName: product.name,
      ownOffer: sql<OwnOutcome>`(
        select o.status from offer o
        where o.inquiry_id = ${INQUIRY_ID} and o.producer_id = ${producerId}
        order by o.submitted_at desc limit 1
      )`,
      unreadDecision: sql<boolean>`exists (
        select 1 from offer o
        where o.inquiry_id = ${INQUIRY_ID} and o.producer_id = ${producerId}
          and o.status in ('accepted', 'rejected') and o.producer_decision_viewed_at is null
      )`,
    })
    .from(inquiry)
    .innerJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .innerJoin(product, and(eq(product.id, inquiryItem.productId), eq(product.producerId, producerId)))
    .innerJoin(country, eq(country.code, inquiry.deliveryCountryCode))
    .where(eq(inquiry.stage, "legacy_direct"));

  const byId = new Map<string, MergedInquiryRow>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (existing) {
      if (row.productName) existing.title = `${existing.title}, ${row.productName}`;
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      source: "shortlist",
      title: row.productName ?? "",
      countryName: row.countryName,
      status: deriveShortlistStatus(row.status, row.ownOffer),
      createdAt: row.receivedAt,
      href: `${hrefBase}/inquiries/${row.id}`,
      unreadDecision: row.unreadDecision === true,
    });
  }
  return [...byId.values()];
}

// Obie listy w jednym wywołaniu; `hrefBase` to `/${locale}/producer/panel`.
export async function getMergedInquiriesForProducer(producerId: string, hrefBase: string): Promise<MergedInquiryRow[]> {
  const [shortlist, productInquiries] = await Promise.all([
    getShortlistRowsForProducer(producerId, hrefBase),
    getProductInquiriesForProducer(producerId),
  ]);
  const fromProducts: MergedInquiryRow[] = productInquiries.map((row) => ({
    id: row.id,
    source: "product",
    title: row.productName,
    countryName: row.countryName,
    status: deriveProductInquiryStatus(row.acceptingQuotes, row.ownQuoteStatus),
    createdAt: row.createdAt,
    href: `${hrefBase}/product-inquiries/${row.id}`,
    unreadDecision: false,
  }));
  return sortMergedInquiries([...shortlist, ...fromProducts]);
}
