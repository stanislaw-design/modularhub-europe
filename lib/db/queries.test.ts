import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import {
  getAllProductsForAdmin,
  getInquiryDetailForClient,
  getInquiryDetailForProducer,
  getOffersByInquiryIdForAdmin,
  getOpenProjectRequestsForBoard,
  getProducerProductForEdit,
  getProducerVariantsForEdit,
  getProducerVolumeVerificationStatus,
  getProductFamilyCounts,
  getProductForAdmin,
  getProductOptionGroups,
  getProductPhotosForAdmin,
  getProductsForProducer,
  getProjectQuotesForProducer,
  getProjectRequestForBoardDetail,
  getProjectRequestsWithQuotesForClient,
  getUnreadDecisionInquiryIds,
  getUnreadOfferInquiryIds,
} from "./queries";
import {
  auditLog,
  bulkProductInquiry,
  client,
  costLineItem,
  document,
  inquiry,
  inquiryItem,
  offer,
  offerItem,
  producer,
  producerCapacityProfile,
  product,
  productOption,
  productOptionGroup,
  productOptionGroupAssignment,
  productOptionGroupTranslation,
  productOptionTranslation,
  productTimelineStage,
  productTranslation,
  productVariant,
  projectQuote,
  projectRequest,
  users,
} from "./schema";

// Confirms AC-5 (spec 0018): a query scoped by producer_id never returns
// another producer's rows. Hits the real dev Neon database (vitest.setup.ts
// loads .env.local), skipped where no DATABASE_URL is configured.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: producer isolation", () => {
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const producerAId = crypto.randomUUID();
  const producerBId = crypto.randomUUID();
  const productAId = crypto.randomUUID();
  const productBId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userAId, email: `producer-a-${userAId}@example.test`, phone: "+48000000000", role: "producer" },
      { id: userBId, email: `producer-b-${userBId}@example.test`, phone: "+48000000000", role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: producerAId,
        userId: userAId,
        nip: `A${producerAId.slice(0, 9)}`,
        name: "Producer A",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: producerBId,
        userId: userBId,
        nip: `B${producerBId.slice(0, 9)}`,
        name: "Producer B",
        countryCode: "PL",
        technology: "beton-modulowy",
      },
    ]);
    await db.insert(product).values([
      { id: productAId, producerId: producerAId, family: "dom", name: "Product A" },
      { id: productBId, producerId: producerBId, family: "dom", name: "Product B" },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.producerId, producerAId));
    await db.delete(product).where(eq(product.producerId, producerBId));
    await db.delete(producer).where(eq(producer.id, producerAId));
    await db.delete(producer).where(eq(producer.id, producerBId));
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(users).where(eq(users.id, userBId));
    // users/producer are audited tables (spec 0018 Key invariants): the
    // trigger leaves rows behind on purpose. This is a test fixture, not a
    // real event, so sweep it rather than leave synthetic noise in audit_log.
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [userAId, userBId, producerAId, producerBId]));
  });

  it("returns only the requesting producer's own products, not another producer's", async () => {
    const results = await getProductsForProducer(producerAId);

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(productAId);
    expect(results.some((row) => row.id === productBId)).toBe(false);
  });

  it("returns an empty result, not an error, for a producer with no products", async () => {
    const results = await getProductsForProducer(crypto.randomUUID());

    expect(results).toEqual([]);
  });
});

// Confirms AC-8 (spec 0022): getProductFamilyCounts() counts only status =
// 'published' products, grouped by family and subcategory, and every family
// stays represented even when it has zero rows. A before/after delta (rather
// than an exact total) keeps this robust against any other data already in
// the dev database.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: getProductFamilyCounts", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const publishedDomId = crypto.randomUUID();
  const draftDomId = crypto.randomUUID();
  const publishedContainerId = crypto.randomUUID();
  let domCalorocznyBefore = 0;
  let containerMieszkalneBefore = 0;

  beforeAll(async () => {
    const before = await getProductFamilyCounts();
    domCalorocznyBefore =
      before.find((row) => row.family === "dom" && row.subcategory === "caloroczny")?.count ?? 0;
    containerMieszkalneBefore =
      before.find((row) => row.family === "kontenery-modulowe" && row.subcategory === "mieszkalne")?.count ?? 0;

    await db.insert(users).values({
      id: userId,
      email: `family-counts-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `FC${producerId.slice(0, 8)}`,
      name: "Family Counts Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      {
        id: publishedDomId,
        producerId,
        family: "dom",
        category: "caloroczny",
        status: "published",
      },
      {
        id: draftDomId,
        producerId,
        family: "dom",
        category: "caloroczny",
        status: "draft",
      },
      {
        id: publishedContainerId,
        producerId,
        family: "kontenery-modulowe",
        containerSubcategory: "mieszkalne",
        status: "published",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("counts the published dom row but not the draft one (exactly one more than before), grouped by category", async () => {
    const after = await getProductFamilyCounts();
    const domCalorocznyAfter =
      after.find((row) => row.family === "dom" && row.subcategory === "caloroczny")?.count ?? 0;

    // Two dom/caloroczny rows were inserted (one published, one draft); if the
    // status filter were missing this would be +2, not +1.
    expect(domCalorocznyAfter).toBe(domCalorocznyBefore + 1);
  });

  it("counts the published kontenery-modulowe row under its own subcategory (exactly one more than before)", async () => {
    const after = await getProductFamilyCounts();
    const containerMieszkalneAfter =
      after.find((row) => row.family === "kontenery-modulowe" && row.subcategory === "mieszkalne")?.count ?? 0;

    expect(containerMieszkalneAfter).toBe(containerMieszkalneBefore + 1);
  });

  it("keeps every one of the four families represented, zero-filled when a family has no rows", async () => {
    const results = await getProductFamilyCounts();
    const families = new Set(results.map((row) => row.family));

    expect(families).toEqual(new Set(["dom", "spa-modulowe", "kontenery-modulowe", "outdoor-tv"]));
  });
});

// Confirms spec 0031 AC-2/AC-9: /internal/products's data layer. Real DB, same
// convention as the describe blocks above.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: admin product-photo queries", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productWithPhotosId = crypto.randomUUID();
  const productWithoutPhotosId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `admin-queries-${userId}@example.test`,
      phone: "+48000000000",
      role: "admin",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `AQ${producerId.slice(0, 8)}`,
      name: "Admin Queries Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      { id: productWithPhotosId, producerId, family: "dom", name: "Product With Photos" },
      { id: productWithoutPhotosId, producerId, family: "dom", name: "Product Without Photos" },
    ]);
    // Celowo poza kolejnością (sortOrder 1 wstawiony przed 0) i z okładką na
    // drugim wierszu — getProductPhotosForAdmin musi sam posortować, nie polegać
    // na kolejności wstawiania.
    await db.insert(document).values([
      {
        r2Key: "admin-queries-second.jpg",
        filename: "second.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: false,
        sortOrder: 1,
        ownerUserId: userId,
        productId: productWithPhotosId,
      },
      {
        r2Key: "admin-queries-first.jpg",
        filename: "first.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: true,
        sortOrder: 0,
        ownerUserId: userId,
        productId: productWithPhotosId,
      },
    ]);
  });

  afterAll(async () => {
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.productId, productWithPhotosId));
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.recordId, docIds));
      await db.delete(document).where(inArray(document.id, docIds));
    }
    await db.delete(product).where(inArray(product.id, [productWithPhotosId, productWithoutPhotosId]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("getAllProductsForAdmin: reports the real photo count per product, 0 for a product with none", async () => {
    const results = await getAllProductsForAdmin();

    const withPhotos = results.find((row) => row.id === productWithPhotosId);
    const withoutPhotos = results.find((row) => row.id === productWithoutPhotosId);
    expect(withPhotos).toMatchObject({ photoCount: 2, producerName: "Admin Queries Test Producer" });
    expect(withoutPhotos).toMatchObject({ photoCount: 0 });
  });

  it("getProductForAdmin: returns the product's name and producer name", async () => {
    const result = await getProductForAdmin(productWithPhotosId);
    expect(result).toMatchObject({ id: productWithPhotosId, name: "Product With Photos", producerName: "Admin Queries Test Producer" });
  });

  it("getProductForAdmin: returns null for an unknown id", async () => {
    const result = await getProductForAdmin(crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("getProductPhotosForAdmin: returns photos sorted by sortOrder ascending regardless of insert order, with the cover flag intact", async () => {
    const results = await getProductPhotosForAdmin(productWithPhotosId);

    expect(results.map((r) => r.filename)).toEqual(["first.jpg", "second.jpg"]);
    expect(results[0]).toMatchObject({ isCover: true, sortOrder: 0 });
    expect(results[1]).toMatchObject({ isCover: false, sortOrder: 1 });
    expect(results[0].url).toMatch(/admin-queries-first\.jpg$/);
  });

  it("getProductPhotosForAdmin: returns an empty array for a product with no photos", async () => {
    const results = await getProductPhotosForAdmin(productWithoutPhotosId);
    expect(results).toEqual([]);
  });
});

// Confirms spec 0033's data layer: inquiry/offer detail reads for producer,
// client, and admin, plus the two unread-signal sets. Same real-DB
// convention as the describe blocks above. One shared fixture: a client with
// one inquiry carrying products from two producers; producer2 has both a
// superseded and an active offer (revision history), producer1 has one
// active offer.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: offer/inquiry detail (spec 0033)", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producer1UserId = crypto.randomUUID();
  const producer1Id = crypto.randomUUID();
  const producer2UserId = crypto.randomUUID();
  const producer2Id = crypto.randomUUID();
  const product1Id = crypto.randomUUID();
  const product2Id = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const offerAId = crypto.randomUUID(); // producer1, active
  const offerBOldId = crypto.randomUUID(); // producer2, superseded
  const offerBNewId = crypto.randomUUID(); // producer2, active

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `qd-client-${clientUserId}@example.test`, phone: "+48000000001", role: "client" },
      { id: producer1UserId, email: `qd-producer1-${producer1UserId}@example.test`, phone: "+48000000002", role: "producer" },
      { id: producer2UserId, email: `qd-producer2-${producer2UserId}@example.test`, phone: "+48000000003", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values([
      { id: producer1Id, userId: producer1UserId, nip: `QD1${producer1Id.slice(0, 7)}`, name: "Query Detail Producer 1", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer2Id, userId: producer2UserId, nip: `QD2${producer2Id.slice(0, 7)}`, name: "Query Detail Producer 2", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(product).values([
      { id: product1Id, producerId: producer1Id, family: "dom", status: "published", name: "Query Detail Product 1" },
      { id: product2Id, producerId: producer2Id, family: "dom", status: "published", name: "Query Detail Product 2" },
    ]);
    await db.insert(inquiry).values({
      id: inquiryId,
      clientId,
      name: "Query Detail Test Client",
      email: `qd-client-${clientUserId}@example.test`,
      phone: "+48000000001",
      deliveryCountryCode: "PL",
      status: "offered",
      idempotencyKey: `queries-detail-test-${inquiryId}`,
    });
    await db.insert(inquiryItem).values([
      { inquiryId, productId: product1Id },
      { inquiryId, productId: product2Id },
    ]);
    await db.insert(offer).values([
      { id: offerAId, inquiryId, producerId: producer1Id, status: "active", installationPriceCents: 180000, transportPriceCents: 320000, submittedAt: new Date("2026-01-03") },
      { id: offerBOldId, inquiryId, producerId: producer2Id, status: "superseded", installationPriceCents: 100000, transportPriceCents: 200000, submittedAt: new Date("2026-01-01") },
      { id: offerBNewId, inquiryId, producerId: producer2Id, status: "active", installationPriceCents: 150000, transportPriceCents: 280000, submittedAt: new Date("2026-01-02") },
    ]);
    await db.insert(offerItem).values([
      { offerId: offerAId, productId: product1Id, housePriceCents: 4000000 },
      { offerId: offerBOldId, productId: product2Id, housePriceCents: 3500000 },
      { offerId: offerBNewId, productId: product2Id, housePriceCents: 3600000 },
    ]);
  });

  afterAll(async () => {
    await db.delete(offerItem).where(inArray(offerItem.offerId, [offerAId, offerBOldId, offerBNewId]));
    await db.delete(offer).where(inArray(offer.id, [offerAId, offerBOldId, offerBNewId]));
    await db.delete(inquiryItem).where(eq(inquiryItem.inquiryId, inquiryId));
    await db.delete(inquiry).where(eq(inquiry.id, inquiryId));
    await db.delete(product).where(inArray(product.id, [product1Id, product2Id]));
    await db.delete(producer).where(inArray(producer.id, [producer1Id, producer2Id]));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(inArray(users.id, [clientUserId, producer1UserId, producer2UserId]));
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [clientUserId, producer1UserId, producer2UserId, producer1Id, producer2Id, clientId, product1Id, product2Id, inquiryId]));
  });

  describe("getInquiryDetailForProducer", () => {
    it("returns only the calling producer's own inquiry items and offers, newest offer first", async () => {
      const result = await getInquiryDetailForProducer(inquiryId, producer2Id);

      expect(result).not.toBeNull();
      expect(result?.items).toEqual([{ productId: product2Id, productName: "Query Detail Product 2", available: true }]);
      expect(result?.offers.map((o) => o.id)).toEqual([offerBNewId, offerBOldId]); // desc by submittedAt
      expect(result?.offers[0]?.items).toEqual([{ productId: product2Id, productName: "Query Detail Product 2", housePriceCents: 3600000 }]);
    });

    it("never includes another producer's products or offers", async () => {
      const result = await getInquiryDetailForProducer(inquiryId, producer1Id);

      expect(result?.items.map((i) => i.productId)).toEqual([product1Id]);
      expect(result?.offers.map((o) => o.id)).toEqual([offerAId]);
    });

    it("returns null for a producer with no products on this inquiry", async () => {
      const result = await getInquiryDetailForProducer(inquiryId, crypto.randomUUID());
      expect(result).toBeNull();
    });

    it("returns null for an unknown inquiry id", async () => {
      const result = await getInquiryDetailForProducer(crypto.randomUUID(), producer1Id);
      expect(result).toBeNull();
    });
  });

  describe("getInquiryDetailForClient", () => {
    it("returns every offer from every producer on the inquiry, any status, newest first", async () => {
      const result = await getInquiryDetailForClient(inquiryId, clientId);

      expect(result).not.toBeNull();
      expect(result?.productNames.sort()).toEqual(["Query Detail Product 1", "Query Detail Product 2"]);
      expect(result?.offers.map((o) => o.id)).toEqual([offerAId, offerBNewId, offerBOldId]);
      const offerA = result?.offers.find((o) => o.id === offerAId);
      expect(offerA).toMatchObject({ producerId: producer1Id, producerName: "Query Detail Producer 1", transportPriceCents: 320000 });
    });

    it("returns null when the inquiry belongs to a different client", async () => {
      const result = await getInquiryDetailForClient(inquiryId, crypto.randomUUID());
      expect(result).toBeNull();
    });

    it("returns null for an unknown inquiry id", async () => {
      const result = await getInquiryDetailForClient(crypto.randomUUID(), clientId);
      expect(result).toBeNull();
    });
  });

  describe("getUnreadOfferInquiryIds / getUnreadDecisionInquiryIds", () => {
    it("getUnreadOfferInquiryIds includes the inquiry while an active offer is unviewed, and stops once every active offer is viewed", async () => {
      const before = await getUnreadOfferInquiryIds(clientId);
      expect(before.has(inquiryId)).toBe(true);

      await db.update(offer).set({ clientViewedAt: new Date() }).where(inArray(offer.id, [offerAId, offerBNewId]));
      const after = await getUnreadOfferInquiryIds(clientId);
      expect(after.has(inquiryId)).toBe(false);

      // Cleanup so later tests in this block see the original unread state.
      await db.update(offer).set({ clientViewedAt: null }).where(inArray(offer.id, [offerAId, offerBNewId]));
    });

    it("getUnreadOfferInquiryIds never leaks another client's unread offers", async () => {
      const result = await getUnreadOfferInquiryIds(crypto.randomUUID());
      expect(result.has(inquiryId)).toBe(false);
    });

    it("getUnreadDecisionInquiryIds ignores a producer whose offer is still active (no decision yet)", async () => {
      const result = await getUnreadDecisionInquiryIds(producer1Id);
      expect(result.has(inquiryId)).toBe(false);
    });

    it("getUnreadDecisionInquiryIds includes the inquiry once a decision lands, and clears once viewed", async () => {
      await db.update(offer).set({ status: "rejected" }).where(eq(offer.id, offerAId));

      const before = await getUnreadDecisionInquiryIds(producer1Id);
      expect(before.has(inquiryId)).toBe(true);

      await db.update(offer).set({ producerDecisionViewedAt: new Date() }).where(eq(offer.id, offerAId));
      const after = await getUnreadDecisionInquiryIds(producer1Id);
      expect(after.has(inquiryId)).toBe(false);

      // Restore for any later test relying on offerA being active.
      await db.update(offer).set({ status: "active", producerDecisionViewedAt: null }).where(eq(offer.id, offerAId));
    });
  });

  describe("getOffersByInquiryIdForAdmin", () => {
    it("groups every offer (any status) by inquiry id, with producer name and items attached", async () => {
      const map = await getOffersByInquiryIdForAdmin();
      const offers = map.get(inquiryId);

      expect(offers).toBeDefined();
      expect(offers?.map((o) => o.id).sort()).toEqual([offerAId, offerBNewId, offerBOldId].sort());
      const offerA = offers?.find((o) => o.id === offerAId);
      expect(offerA).toMatchObject({ producerName: "Query Detail Producer 1" });
      expect(offerA?.items).toEqual([{ productId: product1Id, productName: "Query Detail Product 1", housePriceCents: 4000000 }]);
    });

    it("has no entry for an inquiry with no offers", async () => {
      const map = await getOffersByInquiryIdForAdmin();
      expect(map.get(crypto.randomUUID())).toBeUndefined();
    });
  });
});

// Zasila krok "Warianty i cennik" w ProductEditWizard (spec 0045 Build plan
// zadanie 5/13): potwierdza, że odczyt składa cost_line_item i
// product_timeline_stage przy właściwym wariancie, a nie miesza ich między
// dwoma wariantami tego samego produktu.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: getProducerVariantsForEdit", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const emptyProductId = crypto.randomUUID();
  const defaultVariantId = crypto.randomUUID();
  const otherVariantId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `variant-edit-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `VED${producerId.slice(0, 9)}`,
      name: "Variant Edit Query Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      { id: productId, producerId, family: "dom", name: "Variant Edit Query Test Product" },
      { id: emptyProductId, producerId, family: "dom", name: "Variant Edit Query Test Product (no variants)" },
    ]);
    await db.insert(productVariant).values([
      {
        id: defaultVariantId,
        productId,
        completionStandard: "deweloperski",
        isDefault: true,
        priceMinCents: 10_000_000,
        sortOrder: 0,
      },
      {
        id: otherVariantId,
        productId,
        completionStandard: "pod-klucz",
        isDefault: false,
        priceMinCents: 15_000_000,
        sortOrder: 1,
      },
    ]);
    await db.insert(costLineItem).values([
      { productVariantId: defaultVariantId, label: "Fundament", status: "w-cenie" },
      { productVariantId: otherVariantId, label: "Instalacja fotowoltaiczna", status: "opcja" },
    ]);
    await db.insert(productTimelineStage).values([
      { productVariantId: defaultVariantId, stageKey: "formalnosci", durationMinDays: 2, durationMaxDays: 4 },
    ]);
  });

  afterAll(async () => {
    await db.delete(costLineItem).where(inArray(costLineItem.productVariantId, [defaultVariantId, otherVariantId]));
    await db.delete(productTimelineStage).where(inArray(productTimelineStage.productVariantId, [defaultVariantId, otherVariantId]));
    await db.delete(productVariant).where(inArray(productVariant.id, [defaultVariantId, otherVariantId]));
    await db.delete(product).where(inArray(product.id, [productId, emptyProductId]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("returns variants ordered by sortOrder, each with its own cost items and timeline stages", async () => {
    const results = await getProducerVariantsForEdit(productId);

    expect(results.map((row) => row.id)).toEqual([defaultVariantId, otherVariantId]);

    const defaultVariant = results[0];
    expect(defaultVariant).toMatchObject({
      completionStandard: "deweloperski",
      isDefault: true,
      priceMinCents: 10_000_000,
      priceOnRequest: false,
    });
    expect(defaultVariant.costLineItems).toEqual([
      { id: expect.any(String), label: "Fundament", status: "w-cenie", responsibleParty: null },
    ]);
    expect(defaultVariant.timelineStages).toEqual([
      { stageKey: "formalnosci", durationMinDays: 2, durationMaxDays: 4, startsFromLabel: null, responsibleParty: null },
    ]);

    const otherVariant = results[1];
    expect(otherVariant.costLineItems).toEqual([
      { id: expect.any(String), label: "Instalacja fotowoltaiczna", status: "opcja", responsibleParty: null },
    ]);
    expect(otherVariant.timelineStages).toEqual([]);
  });

  it("returns an empty array for a product with no variants", async () => {
    const results = await getProducerVariantsForEdit(emptyProductId);
    expect(results).toEqual([]);
  });
});

// Spec 0059 AC-1, AC-5: grupy opcji konfiguratora dla produktów katalogowych.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: getProductOptionGroups", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const unassignedProductId = crypto.randomUUID();
  const insulationGroupId = crypto.randomUUID();
  const extrasGroupId = crypto.randomUUID();
  const deletedGroupId = crypto.randomUUID();
  const standardOptionId = crypto.randomUUID();
  const premiumOptionId = crypto.randomUUID();
  const fireplaceOptionId = crypto.randomUUID();
  const deletedOptionId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `option-groups-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `OPG${producerId.slice(0, 9)}`,
      name: "Option Groups Query Test Producer",
      countryCode: "PL",
      technology: "modulowa-stal-lekka",
    });
    await db.insert(product).values([
      { id: productId, producerId, family: "kontenery-modulowe", name: "Option Groups Query Test Product" },
      { id: unassignedProductId, producerId, family: "kontenery-modulowe", name: "Product Without Options" },
    ]);
    await db.insert(productOptionGroup).values([
      { id: insulationGroupId, producerId, name: "Poziom ocieplenia", selectionType: "single", sortOrder: 0 },
      { id: extrasGroupId, producerId, name: "Dodatki", selectionType: "multi", sortOrder: 1 },
      // Miękko usunięta grupa: nie powinna się nigdy pojawić, choć wciąż jest przypisana.
      { id: deletedGroupId, producerId, name: "Usunięta grupa", selectionType: "single", deletedAt: new Date() },
    ]);
    await db.insert(productOption).values([
      {
        id: standardOptionId,
        groupId: insulationGroupId,
        label: "Standard",
        priceCents: 650_000,
        isDefault: true,
        sortOrder: 0,
        imageUrl: "https://konfigurator.dampol-investment.com/static/thumbnail/shop-configurator-option/med/168.webp",
      },
      {
        id: premiumOptionId,
        groupId: insulationGroupId,
        label: "Premium",
        priceCents: 980_000,
        isDefault: false,
        sortOrder: 1,
      },
      { id: fireplaceOptionId, groupId: extrasGroupId, label: "Kominek", priceCents: 250_000, sortOrder: 0 },
      // Miękko usunięta opcja tej samej, żywej grupy: nie powinna się pojawić.
      { id: deletedOptionId, groupId: extrasGroupId, label: "Usunięta opcja", priceCents: 0, deletedAt: new Date() },
    ]);
    await db.insert(productOptionGroupAssignment).values([
      { productId, groupId: insulationGroupId },
      { productId, groupId: extrasGroupId },
      { productId, groupId: deletedGroupId },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(productOptionGroupAssignment)
      .where(inArray(productOptionGroupAssignment.groupId, [insulationGroupId, extrasGroupId, deletedGroupId]));
    await db
      .delete(productOption)
      .where(inArray(productOption.id, [standardOptionId, premiumOptionId, fireplaceOptionId, deletedOptionId]));
    await db
      .delete(productOptionGroup)
      .where(inArray(productOptionGroup.id, [insulationGroupId, extrasGroupId, deletedGroupId]));
    await db.delete(product).where(inArray(product.id, [productId, unassignedProductId]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("returns assigned groups with their options, ordered by sortOrder, excluding soft-deleted rows (AC-1)", async () => {
    const results = await getProductOptionGroups(productId);

    expect(results.map((group) => group.id)).toEqual([insulationGroupId, extrasGroupId]);

    const insulation = results[0];
    expect(insulation).toMatchObject({ name: "Poziom ocieplenia", selectionType: "single" });
    expect(insulation.options).toEqual([
      {
        id: standardOptionId,
        label: "Standard",
        sourceLabel: "Standard",
        priceCents: 650_000,
        priceOnRequest: false,
        isDefault: true,
        imageUrl: "https://konfigurator.dampol-investment.com/static/thumbnail/shop-configurator-option/med/168.webp",
      },
      { id: premiumOptionId, label: "Premium", sourceLabel: "Premium", priceCents: 980_000, priceOnRequest: false, isDefault: false, imageUrl: null },
    ]);

    const extras = results[1];
    expect(extras).toMatchObject({ name: "Dodatki", selectionType: "multi" });
    expect(extras.options).toEqual([
      {
        id: fireplaceOptionId,
        label: "Kominek",
        sourceLabel: "Kominek",
        priceCents: 250_000,
        priceOnRequest: false,
        isDefault: false,
        imageUrl: null,
      },
    ]);
  });

  it("returns translated names and labels for en, keeps the Polish source, falls back per field (spec 0067 AC-1, AC-6)", async () => {
    await db.insert(productOptionGroupTranslation).values([
      { groupId: insulationGroupId, locale: "en", name: "Insulation level" },
      { groupId: extrasGroupId, locale: "en", name: "   " },
    ]);
    await db.insert(productOptionTranslation).values([
      { optionId: standardOptionId, locale: "en", label: "Standard (EN)" },
      { optionId: fireplaceOptionId, locale: "en", label: "Fireplace" },
    ]);
    try {
      const results = await getProductOptionGroups(productId, "en");
      expect(results[0]).toMatchObject({ name: "Insulation level", sourceName: "Poziom ocieplenia" });
      expect(results[0].options.map((o) => [o.label, o.sourceLabel])).toEqual([
        ["Standard (EN)", "Standard"],
        ["Premium", "Premium"],
      ]);
      // Whitespace only translation falls back to Polish.
      expect(results[1]).toMatchObject({ name: "Dodatki", sourceName: "Dodatki" });
      expect(results[1].options[0]).toMatchObject({ label: "Fireplace", sourceLabel: "Kominek" });

      const polish = await getProductOptionGroups(productId, "pl");
      expect(polish[0].name).toBe("Poziom ocieplenia");
      expect(polish[0].options[0].label).toBe("Standard");
    } finally {
      await db.delete(productOptionTranslation).where(inArray(productOptionTranslation.optionId, [standardOptionId, fireplaceOptionId]));
      await db.delete(productOptionGroupTranslation).where(inArray(productOptionGroupTranslation.groupId, [insulationGroupId, extrasGroupId]));
    }
  });

  it("returns an empty array for a product with no assigned group (AC-5)", async () => {
    const results = await getProductOptionGroups(unassignedProductId);
    expect(results).toEqual([]);
  });
});

// Spec 0053 AC-6: confirms the edit screen's read path resolves
// externalDimensions/foundationOptions from product and foundationOptions'
// three translation variants from product_translation, the same shape
// buildProductValues/translationRow (lib/producer-product-actions.ts) wrote.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: getProducerProductForEdit foundation fields (spec 0053)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const emptyProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `foundation-edit-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `FE${producerId.slice(0, 9)}`,
      name: "Foundation Edit Query Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      {
        id: productId,
        producerId,
        family: "dom",
        name: "Foundation Edit Query Test Product",
        externalDimensions: "12m x 9m x 6m",
        foundationOptions: "Płyta fundamentowa lub ławy",
      },
      { id: emptyProductId, producerId, family: "dom", name: "Foundation Edit Query Test Product (empty)" },
    ]);
    await db.insert(productTranslation).values([
      { productId, locale: "en", foundationOptions: "Concrete slab or strip footings" },
      { productId, locale: "nl", foundationOptions: "Betonplaat of stroken funderingen" },
    ]);
  });

  afterAll(async () => {
    await db.delete(productTranslation).where(eq(productTranslation.productId, productId));
    await db.delete(product).where(inArray(product.id, [productId, emptyProductId]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("returns externalDimensions/foundationOptions from product, plus foundationOptionsEn/Nl/De from product_translation", async () => {
    const row = await getProducerProductForEdit(producerId, productId);

    expect(row?.externalDimensions).toBe("12m x 9m x 6m");
    expect(row?.foundationOptions).toBe("Płyta fundamentowa lub ławy");
    expect(row?.foundationOptionsEn).toBe("Concrete slab or strip footings");
    expect(row?.foundationOptionsNl).toBe("Betonplaat of stroken funderingen");
    // No "de" row inserted (partial translation, AC-4): falls back to null,
    // not to the Polish source — that fallback happens client-side only
    // (lib/data/projects.ts#resolveTranslatedText), never in this edit read.
    expect(row?.foundationOptionsDe).toBeNull();
  });

  it("returns null for both fields on a product that never had them filled in", async () => {
    const row = await getProducerProductForEdit(producerId, emptyProductId);

    expect(row?.externalDimensions).toBeNull();
    expect(row?.foundationOptions).toBeNull();
    expect(row?.foundationOptionsEn).toBeNull();
  });
});

// Tablica ogłoszeń B2B (spec 0062): confirms the contact-masking guarantees
// live at the SQL query level (AC-2, AC-15), not just in what a page renders.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: project request board (spec 0062)", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const unapprovedProducerUserId = crypto.randomUUID();
  const unapprovedProducerId = crypto.randomUUID();
  const bulkProductId = crypto.randomUUID();
  const openRequestId = crypto.randomUUID();
  const closedRequestId = crypto.randomUUID();
  const bulkInquiryId = crypto.randomUUID();
  const revealedQuoteId = crypto.randomUUID();
  const activeQuoteId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `qb-client-${clientUserId}@example.test`, phone: "+48000000020", role: "client" },
      { id: producerUserId, email: `qb-producer-${producerUserId}@example.test`, phone: "+48000000021", role: "producer" },
      { id: unapprovedProducerUserId, email: `qb-producer2-${unapprovedProducerUserId}@example.test`, phone: "+48000000022", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values([
      { id: producerId, userId: producerUserId, nip: `QB1${producerId.slice(0, 7)}`, name: "Board Query Producer", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: unapprovedProducerId, userId: unapprovedProducerUserId, nip: `QB2${unapprovedProducerId.slice(0, 7)}`, name: "Board Query Producer (unapproved)", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(product).values({ id: bulkProductId, producerId, family: "dom", status: "published", name: "QB Bulk Product" });
    await db.insert(projectRequest).values([
      {
        id: openRequestId,
        clientId,
        contactName: "Board Query Investor",
        contactEmail: `qb-investor-${openRequestId}@example.test`,
        contactPhone: "+48000000099",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 15,
        status: "open",
      },
      {
        id: closedRequestId,
        contactName: "Closed Investor",
        contactEmail: `qb-closed-${closedRequestId}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 10,
        status: "closed",
      },
    ]);
    await db.insert(bulkProductInquiry).values({
      id: bulkInquiryId,
      clientId,
      productId: bulkProductId,
      contactName: "Bulk Board Investor",
      contactEmail: `qb-bulk-${bulkInquiryId}@example.test`,
      contactPhone: "+48000000098",
      unitCountMin: 20,
      deliveryCountryCode: "PL",
      status: "open",
    });
    await db.insert(projectQuote).values([
      {
        id: revealedQuoteId,
        projectRequestId: openRequestId,
        producerId,
        totalPriceCents: 1_000_000,
        status: "accepted",
        contactRevealedAt: new Date(),
      },
      {
        id: activeQuoteId,
        bulkProductInquiryId: bulkInquiryId,
        producerId,
        totalPriceCents: 2_000_000,
        status: "active",
      },
    ]);
    // spec 0063 AC-8: revealedQuoteId has an attached PDF, activeQuoteId does
    // not -- hasPdf must reflect this per quote, true only for the former.
    await db.insert(document).values({
      r2Key: `qb-quote-pdf-${revealedQuoteId}.pdf`,
      filename: "wycena.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      purpose: "project_quote_pdf",
      ownerUserId: producerUserId,
      projectQuoteId: revealedQuoteId,
    });
  });

  afterAll(async () => {
    await db.delete(document).where(inArray(document.projectQuoteId, [revealedQuoteId, activeQuoteId]));
    await db.delete(projectQuote).where(inArray(projectQuote.id, [revealedQuoteId, activeQuoteId]));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, bulkInquiryId));
    await db.delete(projectRequest).where(inArray(projectRequest.id, [openRequestId, closedRequestId]));
    await db.delete(product).where(eq(product.id, bulkProductId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producer).where(inArray(producer.id, [producerId, unapprovedProducerId]));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(inArray(users.id, [clientUserId, producerUserId, unapprovedProducerUserId]));
  });

  describe("getProducerVolumeVerificationStatus", () => {
    it("returns the status for a producer with a capacity profile row", async () => {
      expect(await getProducerVolumeVerificationStatus(producerId)).toBe("approved");
    });

    it("returns null for a producer with no capacity profile row at all", async () => {
      expect(await getProducerVolumeVerificationStatus(unapprovedProducerId)).toBeNull();
    });
  });

  describe("getOpenProjectRequestsForBoard", () => {
    it("lists an open request without any contact column, hides a closed one", async () => {
      const { items, totalCount } = await getOpenProjectRequestsForBoard({ page: 1 });

      const row = items.find((item) => item.id === openRequestId);
      expect(row).toBeDefined();
      expect(row).not.toHaveProperty("contactName");
      expect(row).not.toHaveProperty("contactEmail");
      expect(row).not.toHaveProperty("contactPhone");
      expect(items.find((item) => item.id === closedRequestId)).toBeUndefined();
      expect(totalCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getProjectRequestForBoardDetail", () => {
    it("returns the masked detail plus this producer's own quote status (the fixture's accepted quote)", async () => {
      const detail = await getProjectRequestForBoardDetail(openRequestId, producerId);

      expect(detail).not.toBeNull();
      expect(detail).not.toHaveProperty("contactEmail");
      expect(detail?.ownQuoteStatus).toBe("accepted");
    });

    it("returns null ownQuoteStatus for a producer who has not quoted this request yet", async () => {
      const detail = await getProjectRequestForBoardDetail(openRequestId, unapprovedProducerId);

      expect(detail).not.toBeNull();
      expect(detail?.ownQuoteStatus).toBeNull();
    });

    it("returns null for a producer with no quote once the request is closed", async () => {
      const detail = await getProjectRequestForBoardDetail(closedRequestId, unapprovedProducerId);
      expect(detail).toBeNull();
    });

    it("still returns detail for a producer who already quoted, even after the request closed", async () => {
      const quotedClosedId = crypto.randomUUID();
      await db.insert(projectRequest).values({
        id: quotedClosedId,
        contactName: "Quoted Then Closed",
        contactEmail: `qb-quoted-closed-${quotedClosedId}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 10,
        status: "closed",
      });
      const quoteId = crypto.randomUUID();
      await db.insert(projectQuote).values({ id: quoteId, projectRequestId: quotedClosedId, producerId, totalPriceCents: 500_000, status: "rejected" });

      const detail = await getProjectRequestForBoardDetail(quotedClosedId, producerId);

      expect(detail).not.toBeNull();
      expect(detail?.ownQuoteStatus).toBe("rejected");

      await db.delete(projectQuote).where(eq(projectQuote.id, quoteId));
      await db.delete(projectRequest).where(eq(projectRequest.id, quotedClosedId));
    });
  });

  describe("getProjectQuotesForProducer", () => {
    // AC-15: the contact columns come back null at the SQL level for a
    // non-revealed row, present only for the row whose contactRevealedAt is set.
    it("reveals contact only on the accepted (contactRevealedAt set) row, never on the active one", async () => {
      const rows = await getProjectQuotesForProducer(producerId);

      const revealed = rows.find((row) => row.id === revealedQuoteId);
      const notRevealed = rows.find((row) => row.id === activeQuoteId);
      expect(revealed?.contactEmail).toBe(`qb-investor-${openRequestId}@example.test`);
      expect(notRevealed?.contactEmail).toBeNull();
      expect(notRevealed?.contactName).toBeNull();
      expect(notRevealed?.contactPhone).toBeNull();
    });

    it("tags the source correctly for each quote", async () => {
      const rows = await getProjectQuotesForProducer(producerId);

      expect(rows.find((row) => row.id === revealedQuoteId)?.source).toBe("project_request");
      expect(rows.find((row) => row.id === activeQuoteId)?.source).toBe("bulk_product_inquiry");
    });

    // AC-8: hasPdf reflects the per-quote document, never a flat true/false for every row.
    it("reports hasPdf true only for the quote with an attached document", async () => {
      const rows = await getProjectQuotesForProducer(producerId);

      expect(rows.find((row) => row.id === revealedQuoteId)?.hasPdf).toBe(true);
      expect(rows.find((row) => row.id === activeQuoteId)?.hasPdf).toBe(false);
    });
  });

  describe("getProjectRequestsWithQuotesForClient", () => {
    it("returns the client's own project_request and bulk_product_inquiry, each with its quotes and the producer's public name", async () => {
      const items = await getProjectRequestsWithQuotesForClient(clientId);

      const requestItem = items.find((item) => item.source === "project_request" && item.id === openRequestId);
      const bulkItem = items.find((item) => item.source === "bulk_product_inquiry" && item.id === bulkInquiryId);
      expect(requestItem?.quotes).toHaveLength(1);
      expect(requestItem?.quotes[0]).toMatchObject({ id: revealedQuoteId, producerName: "Board Query Producer", status: "accepted", hasPdf: true });
      expect(bulkItem?.quotes).toHaveLength(1);
      expect(bulkItem?.quotes[0]).toMatchObject({ id: activeQuoteId, producerName: "Board Query Producer", status: "active", hasPdf: false });
    });
  });
});
