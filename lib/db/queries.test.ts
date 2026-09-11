import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import {
  getAllProductsForAdmin,
  getInquiryDetailForClient,
  getInquiryDetailForProducer,
  getOffersByInquiryIdForAdmin,
  getProductFamilyCounts,
  getProductForAdmin,
  getProductPhotosForAdmin,
  getProductsForProducer,
  getUnreadDecisionInquiryIds,
  getUnreadOfferInquiryIds,
} from "./queries";
import { auditLog, client, document, inquiry, inquiryItem, offer, offerItem, producer, product, users } from "./schema";

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
  const publishedPergolaId = crypto.randomUUID();
  let domCalorocznyBefore = 0;
  let pergolaDrewnianaBefore = 0;

  beforeAll(async () => {
    const before = await getProductFamilyCounts();
    domCalorocznyBefore =
      before.find((row) => row.family === "dom" && row.subcategory === "caloroczny")?.count ?? 0;
    pergolaDrewnianaBefore =
      before.find((row) => row.family === "pergola" && row.subcategory === "drewniana")?.count ?? 0;

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
        id: publishedPergolaId,
        producerId,
        family: "pergola",
        pergolaSubcategory: "drewniana",
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

  it("counts the published pergola row under its own subcategory (exactly one more than before)", async () => {
    const after = await getProductFamilyCounts();
    const pergolaDrewnianaAfter =
      after.find((row) => row.family === "pergola" && row.subcategory === "drewniana")?.count ?? 0;

    expect(pergolaDrewnianaAfter).toBe(pergolaDrewnianaBefore + 1);
  });

  it("keeps every one of the three families represented, zero-filled when a family has no rows", async () => {
    const results = await getProductFamilyCounts();
    const families = new Set(results.map((row) => row.family));

    expect(families).toEqual(new Set(["dom", "spa-modulowe", "pergola"]));
  });
});

// Confirms spec 0031 AC-2/AC-9: /internal/produkty's data layer. Real DB, same
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
