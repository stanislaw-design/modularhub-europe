import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  auditLog,
  bulkProductInquiry,
  client,
  document,
  inquiry,
  inquiryItem,
  offer,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  productTranslation,
  productVariant,
  projectQuote,
  projectRequest,
  users,
} from "@/lib/db/schema";
import {
  getActiveQuotesCount,
  getBoardWithoutQuoteCount,
  getNeedsOfferSummary,
  getPanelNavCounts,
  getProductCompleteness,
  getSentOffersCount,
  summarizeProducts,
} from "./producer-panel-summary";
import { getMergedInquiriesForProducer } from "./producer-inquiry-list";

// Hits the real dev database (spec 0074 AC-2, AC-3, AC-5, AC-10, AC-15): liczniki
// pulpitu i menu, w tym izolacja między dwoma producentami.
describe.skipIf(!process.env.DATABASE_URL)("producer panel summary", () => {
  const id = () => crypto.randomUUID();
  const clientUserId = id();
  const clientId = id();
  const userA = id();
  const userB = id();
  const producerA = id();
  const producerB = id();
  const productA1 = id(); // opublikowany, kompletny
  const productA2 = id(); // opublikowany, bez zdjęcia, ceny i tłumaczeń
  const productA3 = id(); // szkic
  const productB1 = id();
  const legacyOpen = id();
  const legacyOffered = id();
  const legacyForB = id();
  const bulkNoQuote = id();
  const bulkWithQuote = id();
  const bulkExpired = id();
  const requestMatching = id();
  const requestWithQuote = id();
  const requestExpired = id();
  const quoteBulk = id();
  const quoteRequest = id();
  const offerId = id();
  const documentId = id();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `pps-client-${clientUserId}@example.test`, phone: "+48000000031", role: "client" },
      { id: userA, email: `pps-a-${userA}@example.test`, phone: "+48000000032", role: "producer" },
      { id: userB, email: `pps-b-${userB}@example.test`, phone: "+48000000033", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values([
      { id: producerA, userId: userA, nip: `PA${producerA.slice(0, 9)}`, name: "PPS Producer A", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producerB, userId: userB, nip: `PB${producerB.slice(0, 9)}`, name: "PPS Producer B", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: producerA, userId: userA },
      { producerId: producerB, userId: userB },
    ]);
    await db.insert(producerCapacityProfile).values({ producerId: producerA, volumeVerificationStatus: "approved" });
    await db.insert(product).values([
      { id: productA1, producerId: producerA, family: "dom", status: "published", name: "PPS A1" },
      { id: productA2, producerId: producerA, family: "dom", status: "published", name: "PPS A2" },
      { id: productA3, producerId: producerA, family: "dom", status: "draft", name: "PPS A3" },
      { id: productB1, producerId: producerB, family: "dom", status: "published", name: "PPS B1" },
    ]);
    // A1 kompletny: zdjęcie, domyślny wariant z ceną, tłumaczenia en, de, nl.
    await db.insert(productVariant).values({
      productId: productA1,
      completionStandard: "deweloperski",
      priceMinCents: 100_000_00,
      isDefault: true,
    });
    await db.insert(document).values({
      id: documentId,
      r2Key: `pps/${documentId}.jpg`,
      filename: "a1.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 10,
      purpose: "product_photo",
      ownerUserId: userA,
      productId: productA1,
      producerId: producerA,
    });
    await db.insert(productTranslation).values(
      (["en", "de", "nl"] as const).map((locale) => ({ productId: productA1, locale, name: `PPS A1 ${locale}` })),
    );

    const base = {
      clientId,
      name: "PPS Client",
      email: `pps-client-${clientUserId}@example.test`,
      phone: "+48000000031",
      deliveryCountryCode: "PL",
    };
    await db.insert(inquiry).values([
      { ...base, id: legacyOpen, stage: "legacy_direct", status: "open", idempotencyKey: `pps-${legacyOpen}` },
      { ...base, id: legacyOffered, stage: "legacy_direct", status: "offered", idempotencyKey: `pps-${legacyOffered}` },
      { ...base, id: legacyForB, stage: "legacy_direct", status: "open", idempotencyKey: `pps-${legacyForB}` },
    ]);
    await db.insert(inquiryItem).values([
      { inquiryId: legacyOpen, productId: productA1 },
      { inquiryId: legacyOffered, productId: productA1 },
      { inquiryId: legacyForB, productId: productB1 },
    ]);
    await db.insert(offer).values({
      id: offerId,
      inquiryId: legacyOffered,
      producerId: producerA,
      installationPriceCents: 1,
      transportPriceCents: 1,
      status: "active",
    });

    const bulkBase = { productId: productA1, contactName: "PPS Bulk", contactEmail: `pps-bulk-${clientUserId}@example.test`, unitCount: 5, deliveryCountryCode: "PL" };
    await db.insert(bulkProductInquiry).values([
      { ...bulkBase, id: bulkNoQuote },
      { ...bulkBase, id: bulkWithQuote },
      { ...bulkBase, id: bulkExpired, deadlineAt: new Date(Date.now() - 86_400_000) },
    ]);
    await db.insert(projectQuote).values({
      id: quoteBulk,
      bulkProductInquiryId: bulkWithQuote,
      producerId: producerA,
      totalPriceCents: 50_000_000,
      status: "active",
    });

    const requestBase = {
      contactName: "PPS Investor",
      contactEmail: `pps-investor-${clientUserId}@example.test`,
      countryCode: "DE",
      projectType: "resort" as const,
      families: ["dom" as const],
      unitCount: 4,
    };
    await db.insert(projectRequest).values([
      { ...requestBase, id: requestMatching },
      { ...requestBase, id: requestWithQuote },
      { ...requestBase, id: requestExpired, deadlineAt: new Date(Date.now() - 86_400_000) },
    ]);
    await db.insert(projectQuote).values({
      id: quoteRequest,
      projectRequestId: requestWithQuote,
      producerId: producerA,
      totalPriceCents: 60_000_000,
      status: "active",
    });
  });

  afterAll(async () => {
    const quoteIds = [quoteBulk, quoteRequest];
    await db.delete(projectQuote).where(inArray(projectQuote.id, quoteIds));
    await db.delete(projectRequest).where(inArray(projectRequest.id, [requestMatching, requestWithQuote, requestExpired]));
    await db.delete(bulkProductInquiry).where(inArray(bulkProductInquiry.id, [bulkNoQuote, bulkWithQuote, bulkExpired]));
    await db.delete(offer).where(eq(offer.id, offerId));
    const inquiryIds = [legacyOpen, legacyOffered, legacyForB];
    await db.delete(inquiryItem).where(inArray(inquiryItem.inquiryId, inquiryIds));
    await db.delete(inquiry).where(inArray(inquiry.id, inquiryIds));
    await db.delete(document).where(eq(document.id, documentId));
    await db.delete(productTranslation).where(eq(productTranslation.productId, productA1));
    await db.delete(productVariant).where(eq(productVariant.productId, productA1));
    const productIds = [productA1, productA2, productA3, productB1];
    await db.delete(product).where(inArray(product.id, productIds));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerA));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [producerA, producerB]));
    await db.delete(producer).where(inArray(producer.id, [producerA, producerB]));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(inArray(users.id, [clientUserId, userA, userB]));
    await db
      .delete(auditLog)
      .where(
        inArray(auditLog.recordId, [
          ...inquiryIds,
          ...productIds,
          ...quoteIds,
          producerA,
          producerB,
          userA,
          userB,
          clientUserId,
          clientId,
          offerId,
          documentId,
        ]),
      );
  });

  it("counts inquiries waiting for an offer from both sources, ignoring quoted, expired and other producers", async () => {
    const summary = await getNeedsOfferSummary(producerA);

    // legacyOpen (shortlist) + bulkNoQuote (zapytanie o produkt); oferta wysłana, wycena złożona i termin minął nie liczą się.
    expect(summary.count).toBe(2);
    expect(summary.oldestAt).toBeInstanceOf(Date);
    expect((await getNeedsOfferSummary(producerB)).count).toBe(1);
  });

  it("counts open matching board listings without an own quote, only for an approved producer", async () => {
    // requestMatching: dopasowane, bez wyceny. requestWithQuote ma wycenę, requestExpired jest po terminie.
    const before = await getBoardWithoutQuoteCount(producerA);
    expect(before).toBeGreaterThanOrEqual(1);
    await db.delete(projectQuote).where(eq(projectQuote.id, quoteRequest));
    // Po usunięciu wyceny ogłoszenie z wyceną wraca do liczby (dowód, że własna wycena je wyklucza).
    expect(await getBoardWithoutQuoteCount(producerA)).toBe(before + 1);
    expect(await getBoardWithoutQuoteCount(producerB)).toBe(0);
    await db.insert(projectQuote).values({
      id: quoteRequest,
      projectRequestId: requestWithQuote,
      producerId: producerA,
      totalPriceCents: 60_000_000,
      status: "active",
    });
  });

  it("returns zero for the board in the nav when the producer is not approved", async () => {
    const counts = await getPanelNavCounts(producerB, 0);

    expect(counts).toMatchObject({ needsOfferCount: 1, boardWithoutQuoteCount: 0, volumeVerificationStatus: "not_submitted" });
  });

  it("passes the unread decision count through and reports the approved status", async () => {
    const counts = await getPanelNavCounts(producerA, 3);

    expect(counts).toMatchObject({ unreadDecisionCount: 3, volumeVerificationStatus: "approved" });
  });

  it("counts own active quotes and sent offers per producer", async () => {
    expect(await getActiveQuotesCount(producerA)).toBe(2);
    expect(await getActiveQuotesCount(producerB)).toBe(0);
    expect(await getSentOffersCount(producerA)).toBe(1);
    expect(await getSentOffersCount(producerB)).toBe(0);
  });

  it("reports what is missing on each product, in the AC-10 order", async () => {
    const completeness = await getProductCompleteness(producerA);
    const byId = new Map(completeness.map((entry) => [entry.productId, entry]));

    expect(completeness).toHaveLength(3);
    expect(byId.get(productA1)?.missing).toEqual([]);
    expect(byId.get(productA2)?.missing).toEqual(["photo", "price", "translation"]);
    expect(byId.get(productA3)?.missing).toEqual(["draft", "photo", "price"]);
    expect(completeness.map((entry) => entry.productId)).not.toContain(productB1);
  });

  it("summarizes published and incomplete products, leaving drafts out", async () => {
    expect(summarizeProducts(await getProductCompleteness(producerA))).toEqual({ publishedCount: 2, incompleteCount: 1 });
  });

  it("merges both inquiry sources with the AC-7 statuses, scoped to the producer and without contact data", async () => {
    const rows = await getMergedInquiriesForProducer(producerA, "/pl/producer/panel");
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get(legacyOpen)).toMatchObject({ source: "shortlist", status: "needs-offer", href: `/pl/producer/panel/inquiries/${legacyOpen}` });
    expect(byId.get(legacyOffered)?.status).toBe("offered");
    expect(byId.get(bulkNoQuote)).toMatchObject({ source: "product", status: "needs-offer", href: `/pl/producer/panel/product-inquiries/${bulkNoQuote}` });
    expect(byId.get(bulkWithQuote)?.status).toBe("offered");
    expect(byId.has(legacyForB)).toBe(false);
    // "Wymaga oferty" na górze.
    expect(rows.slice(0, 2).every((row) => row.status === "needs-offer")).toBe(true);
    expect(JSON.stringify(rows)).not.toMatch(/PPS Client|PPS Bulk|@example\.test|\+48000000031/);

    const rowsB = await getMergedInquiriesForProducer(producerB, "/pl/producer/panel");
    expect(rowsB.map((row) => row.id)).toEqual([legacyForB]);
  });
});
