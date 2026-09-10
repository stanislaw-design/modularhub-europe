import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { getAllProductsForAdmin, getProductFamilyCounts, getProductForAdmin, getProductPhotosForAdmin, getProductsForProducer } from "./queries";
import { auditLog, document, producer, product, users } from "./schema";

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
