import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { auditLog, document, producer, product, productCountryEligibility, users } from "@/lib/db/schema";
import {
  getEligibilityByCountry,
  getFeaturedProjectByFamily,
  getProjectById,
  getProjects,
  getPublishedProductIds,
} from "./projects";

// Confirms spec 0023 AC-4/AC-6: getProjects/getProjectById/getEligibilityByCountry
// read real product+eligibility rows from the database instead of the retired
// fixture, mapped onto the existing Project shape. Hits the real dev Neon
// database (vitest.setup.ts loads .env.local), skipped where no DATABASE_URL
// is configured.
describe.skipIf(!process.env.DATABASE_URL)("lib/data/projects: reads from the database", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const publishedDomId = crypto.randomUUID();
  const draftDomId = crypto.randomUUID();
  const featuredPergolaId = crypto.randomUUID();
  // spec 0026: extra rows covering the new attribute/price/subcategory/search filters.
  const heatPumpDomId = crypto.randomUUID();
  const gasHeatedDomId = crypto.randomUUID();
  const priceOnRequestDomId = crypto.randomUUID();
  const saunaSpaId = crypto.randomUUID();
  const searchableDomId = crypto.randomUUID();
  // getFeaturedProjectByFamily has no ORDER BY/LIMIT, so it assumes at most
  // one published+featured row per family (lib/data/projects.ts). The dev DB
  // already seeds a real featured pergola; neutralize it for this test's
  // duration so the assertion below isn't racing real seed data, then
  // restore it in afterAll regardless of pass/fail.
  let otherFeaturedPergolaIds: string[] = [];

  beforeAll(async () => {
    const conflicting = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.family, "pergola"), eq(product.featured, true), eq(product.status, "published")));
    otherFeaturedPergolaIds = conflicting.map((row) => row.id);
    if (otherFeaturedPergolaIds.length > 0) {
      await db.update(product).set({ featured: false }).where(inArray(product.id, otherFeaturedPergolaIds));
    }

    await db.insert(users).values({
      id: userId,
      email: `data-projects-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `DP${producerId.slice(0, 8)}`,
      name: "Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      {
        id: publishedDomId,
        producerId,
        family: "dom",
        status: "published",
        name: "Published Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
      },
      {
        id: draftDomId,
        producerId,
        family: "dom",
        status: "draft",
        name: "Draft Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
      },
      {
        id: featuredPergolaId,
        producerId,
        family: "pergola",
        status: "published",
        featured: true,
        name: "Featured Test Pergola",
        countryOfProduction: "PL",
      },
      {
        id: heatPumpDomId,
        producerId,
        family: "dom",
        status: "published",
        name: "Heat Pump Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        storeys: 1,
        priceMinCents: 6000000,
        technicalSpecs: { heatSource: "pompa-ciepla-powietrze-woda", ventilation: "rekuperacja", heatTransferCoefficients: "A" },
      },
      {
        id: gasHeatedDomId,
        producerId,
        family: "dom",
        status: "published",
        name: "Gas Heated Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        storeys: 2,
        priceMinCents: 12000000,
        technicalSpecs: { heatSource: "gazowe", ventilation: "brak", heatTransferCoefficients: "C" },
      },
      {
        id: priceOnRequestDomId,
        producerId,
        family: "dom",
        status: "published",
        name: "Price On Request Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        priceMinCents: null,
        technicalSpecs: { _priceOnRequest: true },
      },
      {
        id: saunaSpaId,
        producerId,
        family: "spa-modulowe",
        status: "published",
        name: "Sauna Test Spa",
        floorAreaM2: 16,
        countryOfProduction: "PL",
        spaSubcategory: "sauna",
      },
      {
        id: searchableDomId,
        producerId,
        family: "dom",
        status: "published",
        name: "Wyjatkowytoken Dom",
        description: "Opisowy tekst do testu wyszukiwania.",
        floorAreaM2: 80,
        countryOfProduction: "PL",
      },
    ]);
    await db.insert(productCountryEligibility).values([
      { productId: publishedDomId, countryCode: "DE", status: "approved", reason: "Test" },
      { productId: publishedDomId, countryCode: "NL", status: "blocked", reason: "Test" },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(productCountryEligibility)
      .where(inArray(productCountryEligibility.productId, [publishedDomId, draftDomId, featuredPergolaId]));
    await db.delete(product).where(eq(product.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
    if (otherFeaturedPergolaIds.length > 0) {
      await db.update(product).set({ featured: true }).where(inArray(product.id, otherFeaturedPergolaIds));
    }
  });

  it("returns only published dom products by default", async () => {
    const projects = await getProjects();
    const ids = projects.map((p) => p.id);

    expect(ids).toContain(publishedDomId);
    expect(ids).not.toContain(draftDomId);
    expect(ids).not.toContain(featuredPergolaId);
  });

  // Regression: /klient/zapytanie and /klient/dzialka used to validate the
  // `projects` URL param against getProjects()'s ids, which default to
  // family "dom" — a selection from any other family (e.g. a spa-modulowe
  // sauna) silently failed knownIds.has(id) and got the client bounced back
  // to results with no error. getPublishedProductIds() must not be family
  // scoped, so a spa-modulowe id passes the same check a dom id does.
  it("getPublishedProductIds includes published products from every family, not just dom", async () => {
    const ids = await getPublishedProductIds();

    expect(ids.has(publishedDomId)).toBe(true);
    expect(ids.has(featuredPergolaId)).toBe(true);
    expect(ids.has(saunaSpaId)).toBe(true);
    expect(ids.has(draftDomId)).toBe(false);
  });

  it("filters by an explicit family", async () => {
    const projects = await getProjects({ family: "pergola" });

    expect(projects.map((p) => p.id)).toContain(featuredPergolaId);
    expect(projects.map((p) => p.id)).not.toContain(publishedDomId);
  });

  it("hides a product blocked for a country and keeps an approved one", async () => {
    const forDe = await getProjects({ countryCode: "DE" });
    const forNl = await getProjects({ countryCode: "NL" });

    expect(forDe.map((p) => p.id)).toContain(publishedDomId);
    expect(forNl.map((p) => p.id)).not.toContain(publishedDomId);
  });

  it("filters floorAreaM2 on a closed interval", async () => {
    const inRange = await getProjects({ sizeMin: 70, sizeMax: 90 });
    const outOfRange = await getProjects({ sizeMin: 200 });

    expect(inRange.map((p) => p.id)).toContain(publishedDomId);
    expect(outOfRange.map((p) => p.id)).not.toContain(publishedDomId);
  });

  // spec 0026 AC-1, AC-2: attribute filters, scoped to family "dom".
  it("filters by heatSource, expanding the pompa-ciepla shorthand to both subtypes (AC-2)", async () => {
    const heatPump = await getProjects({ heatSource: "pompa-ciepla" });
    expect(heatPump.map((p) => p.id)).toContain(heatPumpDomId);
    expect(heatPump.map((p) => p.id)).not.toContain(gasHeatedDomId);
  });

  it("filters by an exact heatSource value without expanding it", async () => {
    const gas = await getProjects({ heatSource: "gazowe" });
    expect(gas.map((p) => p.id)).toContain(gasHeatedDomId);
    expect(gas.map((p) => p.id)).not.toContain(heatPumpDomId);
  });

  it("filters by ventilation", async () => {
    const projects = await getProjects({ ventilation: "rekuperacja" });
    expect(projects.map((p) => p.id)).toContain(heatPumpDomId);
    expect(projects.map((p) => p.id)).not.toContain(gasHeatedDomId);
  });

  it("filters by energyClass (heatTransferCoefficients)", async () => {
    const projects = await getProjects({ energyClass: "A" });
    expect(projects.map((p) => p.id)).toContain(heatPumpDomId);
    expect(projects.map((p) => p.id)).not.toContain(gasHeatedDomId);
  });

  it("filters by storeys: parterowy is exactly 1, pietrowy is 2 or more", async () => {
    const parterowy = await getProjects({ storeys: "parterowy" });
    const pietrowy = await getProjects({ storeys: "pietrowy" });

    expect(parterowy.map((p) => p.id)).toContain(heatPumpDomId);
    expect(parterowy.map((p) => p.id)).not.toContain(gasHeatedDomId);
    expect(pietrowy.map((p) => p.id)).toContain(gasHeatedDomId);
    expect(pietrowy.map((p) => p.id)).not.toContain(heatPumpDomId);
  });

  it("ignores heatSource/ventilation/energyClass/storeys entirely when family is not dom (spec 0026 Key invariants)", async () => {
    // saunaSpaId has no technicalSpecs.heatSource at all; a dom-only filter must not exclude it
    // when explicitly querying family "spa-modulowe" (the filter simply does not apply).
    const projects = await getProjects({ family: "spa-modulowe", heatSource: "gazowe" });
    expect(projects.map((p) => p.id)).toContain(saunaSpaId);
  });

  // spec 0026 AC-4: price filter compares against the product's priceMin ("od"), never a range;
  // priceOnRequest never matches once a price bound is present.
  it("filters by priceMin/priceMax against the product's priceMin", async () => {
    const inRange = await getProjects({ priceMin: 50000, priceMax: 100000 });
    const tooExpensive = await getProjects({ priceMin: 150000 });

    expect(inRange.map((p) => p.id)).toContain(heatPumpDomId);
    expect(inRange.map((p) => p.id)).not.toContain(gasHeatedDomId);
    expect(tooExpensive.map((p) => p.id)).not.toContain(heatPumpDomId);
  });

  it("excludes a priceOnRequest product once a price filter is present", async () => {
    const projects = await getProjects({ priceMin: 50000 });
    expect(projects.map((p) => p.id)).not.toContain(priceOnRequestDomId);
  });

  it("includes a priceOnRequest product when no price filter is present", async () => {
    const projects = await getProjects();
    expect(projects.map((p) => p.id)).toContain(priceOnRequestDomId);
  });

  // spec 0026 AC-8: subcategory filters scoped to their own family.
  it("filters spa-modulowe by spaSubcategory", async () => {
    const sauna = await getProjects({ family: "spa-modulowe", spaSubcategory: "sauna" });
    const jacuzzi = await getProjects({ family: "spa-modulowe", spaSubcategory: "jacuzzi" });

    expect(sauna.map((p) => p.id)).toContain(saunaSpaId);
    expect(jacuzzi.map((p) => p.id)).not.toContain(saunaSpaId);
  });

  // spec 0026 AC-6: full-text search, case-insensitive, prefix matching.
  it("matches a product by a prefix of a word in its name (AC-6)", async () => {
    const projects = await getProjects({ q: "Wyjatkowytok" });
    expect(projects.map((p) => p.id)).toContain(searchableDomId);
  });

  it("matches a product by a word in its description, case-insensitively (AC-6)", async () => {
    const projects = await getProjects({ q: "OPISOWY" });
    expect(projects.map((p) => p.id)).toContain(searchableDomId);
  });

  it("returns no results for a search term that matches nothing (AC-6)", async () => {
    const projects = await getProjects({ q: "zzzniepasujacyzzz" });
    expect(projects.map((p) => p.id)).not.toContain(searchableDomId);
  });

  it("treats a whitespace-only q as no search filter (AC-6)", async () => {
    const withBlankQ = await getProjects({ q: "   " });
    const withoutQ = await getProjects();
    expect(withBlankQ.map((p) => p.id).sort()).toEqual(withoutQ.map((p) => p.id).sort());
  });

  // spec 0026 AC-10: every filter present combines with logical AND in one query.
  it("combines heatSource, price, and size filters with logical AND", async () => {
    const projects = await getProjects({ heatSource: "pompa-ciepla", priceMin: 50000, priceMax: 100000, sizeMin: 70, sizeMax: 90 });
    expect(projects.map((p) => p.id)).toContain(heatPumpDomId);

    const contradictory = await getProjects({ heatSource: "pompa-ciepla", priceMin: 150000 });
    expect(contradictory.map((p) => p.id)).not.toContain(heatPumpDomId);
  });

  it("getProjectById returns null for an unknown id instead of throwing", async () => {
    expect(await getProjectById("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("getProjectById maps a known row, including its producer name", async () => {
    const project = await getProjectById(publishedDomId);

    expect(project?.name).toBe("Published Test Dom");
    expect(project?.producerName).toBe("Test Producer");
  });

  it("getFeaturedProjectByFamily returns the one published, featured row for that family", async () => {
    const featured = await getFeaturedProjectByFamily("pergola");

    expect(featured?.id).toBe(featuredPergolaId);
  });

  it("getEligibilityByCountry returns only the rows for the requested country", async () => {
    const rows = await getEligibilityByCountry("DE");

    expect(rows.some((row) => row.projectId === publishedDomId && row.status === "approved")).toBe(true);
    expect(rows.every((row) => row.countryCode === "DE")).toBe(true);
  });
});

// spec 0031 AC-7/AC-8: cover/gallery read from the document table when rows
// exist, falling back to product.coverImageUrl/technicalSpecs._extraImageUrls
// otherwise (strangler pattern, spec 0031 Migration plan). Own producer/product
// fixtures so this describe never depends on the big shared block above.
describe.skipIf(!process.env.DATABASE_URL)("lib/data/projects: document-sourced cover/gallery (spec 0031)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const migratedProductId = crypto.randomUUID();
  const notYetMigratedProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userId, email: `doc-photos-${userId}@example.test`, phone: "+48000000000", role: "producer" },
      { id: ownerUserId, email: `doc-photos-owner-${ownerUserId}@example.test`, phone: "+48000000001", role: "admin" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `DP${producerId.slice(0, 8)}`,
      name: "Document Photos Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      {
        id: migratedProductId,
        producerId,
        family: "dom",
        status: "published",
        name: "Migrated Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        coverImageUrl: "/images/houses/legacy-mock-cover.jpg",
        technicalSpecs: { _extraImageUrls: ["/images/houses/legacy-mock-extra.jpg"] },
      },
      {
        id: notYetMigratedProductId,
        producerId,
        family: "dom",
        status: "published",
        name: "Not Yet Migrated Test Dom",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        coverImageUrl: "/images/houses/still-on-mock-cover.jpg",
        technicalSpecs: { _extraImageUrls: ["/images/houses/still-on-mock-extra.jpg"] },
      },
    ]);
    // migratedProductId dostaje realne wiersze document; notYetMigratedProductId
    // celowo żadnego, żeby sprawdzić oba ramiona fallbacku w jednym describe.
    await db.insert(document).values([
      {
        r2Key: "doc-photos-cover.jpg",
        filename: "cover.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: true,
        sortOrder: 0,
        ownerUserId,
        productId: migratedProductId,
      },
      {
        r2Key: "doc-photos-gallery-1.jpg",
        filename: "gallery-1.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: false,
        sortOrder: 1,
        ownerUserId,
        productId: migratedProductId,
      },
    ]);
  });

  afterAll(async () => {
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.productId, migratedProductId));
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.recordId, docIds));
      await db.delete(document).where(inArray(document.id, docIds));
    }
    await db.delete(product).where(inArray(product.id, [migratedProductId, notYetMigratedProductId]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(inArray(users.id, [userId, ownerUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, ownerUserId, producerId]));
  });

  it("getProjectById prefers the document-sourced cover and gallery over the legacy mock fields once document rows exist", async () => {
    const project = await getProjectById(migratedProductId);

    expect(project?.coverImageUrl).toMatch(/doc-photos-cover\.jpg$/);
    expect(project?.coverImageUrl).not.toBe("/images/houses/legacy-mock-cover.jpg");
    expect(project?.galleryImageUrls).toHaveLength(1);
    expect(project?.galleryImageUrls?.[0]).toMatch(/doc-photos-gallery-1\.jpg$/);
  });

  it("getProjectById falls back to product.coverImageUrl/_extraImageUrls when a product has no document rows yet", async () => {
    const project = await getProjectById(notYetMigratedProductId);

    expect(project?.coverImageUrl).toBe("/images/houses/still-on-mock-cover.jpg");
    expect(project?.galleryImageUrls).toEqual(["/images/houses/still-on-mock-extra.jpg"]);
  });

  it("getProjects applies the same document-sourced override in a batch call, not just getProjectById", async () => {
    const projects = await getProjects({ family: "dom" });

    const migrated = projects.find((p) => p.id === migratedProductId);
    const notYetMigrated = projects.find((p) => p.id === notYetMigratedProductId);
    expect(migrated?.coverImageUrl).toMatch(/doc-photos-cover\.jpg$/);
    expect(notYetMigrated?.coverImageUrl).toBe("/images/houses/still-on-mock-cover.jpg");
  });
});
