import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// @/lib/observability pulls in "server-only"/@sentry/nextjs, which don't
// resolve under plain Vitest/jsdom — same boundary problem offer-actions.test.ts
// and product-photo-actions.test.ts already work around. resolveProductDocumentPhotos
// (./projects) reports a broken R2 config through captureError.
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

// r2Mock.shouldThrow lets one test (the R2-outage regression test below)
// simulate a missing R2_PUBLIC_DOMAIN without touching the real env var
// vitest.setup.ts loads for every other test in this file; buildPublicUrl
// otherwise delegates to the real implementation so the document-sourced
// cover/gallery assertions above keep exercising real URL building.
const r2Mock = vi.hoisted(() => ({ shouldThrow: false }));
vi.mock("@/lib/storage/r2-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/r2-client")>();
  return {
    ...actual,
    buildPublicUrl: (key: string) => {
      if (r2Mock.shouldThrow) throw new Error("R2_PUBLIC_DOMAIN nie jest ustawione");
      return actual.buildPublicUrl(key);
    },
  };
});

import { db } from "@/lib/db/client";
import {
  auditLog,
  costLineItem,
  document,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  product,
  productCountryEligibility,
  productTimelineStage,
  productVariant,
  users,
} from "@/lib/db/schema";
import {
  getEligibilityByCountry,
  getFeaturedProjectByFamily,
  getProducerVolumeProfile,
  getProjectById,
  getProjects,
  getPublishedProductIds,
  getVerifiedVolumeManufacturerProjects,
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
  const featuredContainerId = crypto.randomUUID();
  // spec 0026: extra rows covering the new attribute/price/subcategory/search filters.
  const heatPumpDomId = crypto.randomUUID();
  const gasHeatedDomId = crypto.randomUUID();
  const priceOnRequestDomId = crypto.randomUUID();
  const saunaSpaId = crypto.randomUUID();
  const searchableDomId = crypto.randomUUID();
  // getFeaturedProjectByFamily has no ORDER BY/LIMIT, so it assumes at most
  // one published+featured row per family (lib/data/projects.ts). The dev DB
  // already seeds a real featured kontenery-modulowe product; neutralize it for this test's
  // duration so the assertion below isn't racing real seed data, then
  // restore it in afterAll regardless of pass/fail.
  let otherFeaturedContainerIds: string[] = [];

  beforeAll(async () => {
    const conflicting = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.family, "kontenery-modulowe"), eq(product.featured, true), eq(product.status, "published")));
    otherFeaturedContainerIds = conflicting.map((row) => row.id);
    if (otherFeaturedContainerIds.length > 0) {
      await db.update(product).set({ featured: false }).where(inArray(product.id, otherFeaturedContainerIds));
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
        id: featuredContainerId,
        producerId,
        family: "kontenery-modulowe",
        status: "published",
        featured: true,
        name: "Featured Test Container",
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
      .where(inArray(productCountryEligibility.productId, [publishedDomId, draftDomId, featuredContainerId]));
    await db.delete(product).where(eq(product.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
    if (otherFeaturedContainerIds.length > 0) {
      await db.update(product).set({ featured: true }).where(inArray(product.id, otherFeaturedContainerIds));
    }
  });

  it("returns only published dom products by default", async () => {
    const projects = await getProjects();
    const ids = projects.map((p) => p.id);

    expect(ids).toContain(publishedDomId);
    expect(ids).not.toContain(draftDomId);
    expect(ids).not.toContain(featuredContainerId);
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
    expect(ids.has(featuredContainerId)).toBe(true);
    expect(ids.has(saunaSpaId)).toBe(true);
    expect(ids.has(draftDomId)).toBe(false);
  });

  it("filters by an explicit family", async () => {
    const projects = await getProjects({ family: "kontenery-modulowe" });

    expect(projects.map((p) => p.id)).toContain(featuredContainerId);
    expect(projects.map((p) => p.id)).not.toContain(publishedDomId);
  });

  // spec 0035 AC-2: the "wiecej-niz-dom" sentinel resolves through FAMILY_GROUPS
  // to an IN (...) across every family in the group (today spa-modulowe + kontenery-modulowe).
  it("filters by the wiecej-niz-dom group, combining spa-modulowe and kontenery-modulowe but excluding dom", async () => {
    const projects = await getProjects({ family: "wiecej-niz-dom" });

    expect(projects.map((p) => p.id)).toContain(featuredContainerId);
    expect(projects.map((p) => p.id)).toContain(saunaSpaId);
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

  it("getProjectById returns null for a malformed (non-uuid) id instead of the database rejecting the query", async () => {
    expect(await getProjectById("prj-modulor-family-90")).toBeNull();
    expect(await getProjectById("nieistniejace-id")).toBeNull();
  });

  it("getProjectById maps a known row, including its producer name", async () => {
    const project = await getProjectById(publishedDomId);

    expect(project?.name).toBe("Published Test Dom");
    expect(project?.producerName).toBe("Test Producer");
  });

  it("getFeaturedProjectByFamily returns the one published, featured row for that family", async () => {
    const featured = await getFeaturedProjectByFamily("kontenery-modulowe");

    expect(featured?.id).toBe(featuredContainerId);
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

  // Regression test for the 2026-09-11 production outage: a missing
  // R2_PUBLIC_DOMAIN made buildPublicUrl throw, which crashed every screen
  // that lists projects (uncaught in the home page's Promise.all). getProjects
  // must degrade to the legacy mock cover instead of rejecting.
  it("getProjects falls back to the legacy cover instead of rejecting when R2 is misconfigured", async () => {
    r2Mock.shouldThrow = true;
    try {
      const projects = await getProjects({ family: "dom" });

      const migrated = projects.find((p) => p.id === migratedProductId);
      expect(migrated?.coverImageUrl).toBe("/images/houses/legacy-mock-cover.jpg");
      expect(captureErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ path: "resolveProductDocumentPhotos" }),
      );
    } finally {
      r2Mock.shouldThrow = false;
    }
  });
});

// spec 0038 AC-13/AC-15: own producer, own products, own capacity profile —
// deliberately not the shared fixture above, so this suite never depends on
// the manual Budman seed (Build plan task 11) existing on any given
// environment.
describe.skipIf(!process.env.DATABASE_URL)("lib/data/projects: verified volume manufacturers", () => {
  const userId = crypto.randomUUID();
  const approvedProducerId = crypto.randomUUID();
  const publishedProductId = crypto.randomUUID();
  const draftProductId = crypto.randomUUID();
  // spec 0038 aktualizacja (pasek wyszukiwania): drugi, wyszukiwalny produkt tego
  // samego producenta z odrębnym metrażem, żeby testy sizeMin/sizeMax i słowa
  // kluczowego mogły odróżnić "producent zniknął" od "jeden z jego projektów zniknął".
  const largeProductId = crypto.randomUUID();

  const unapprovedUserId = crypto.randomUUID();
  const unapprovedProducerId = crypto.randomUUID();
  const unapprovedProductId = crypto.randomUUID();

  // Drugi zatwierdzony producent, dostarczający wyłącznie do DE (spec 0038
  // AC-20): pozwala odróżnić "kraj zawęża listę producentów" od "kraj zawęża
  // tylko projekty w obrębie jednego producenta".
  const secondUserId = crypto.randomUUID();
  const secondApprovedProducerId = crypto.randomUUID();
  const secondProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userId, email: `vvm-${userId}@example.test`, phone: "+48000000030", role: "producer" },
      { id: unapprovedUserId, email: `vvm-${unapprovedUserId}@example.test`, phone: "+48000000031", role: "producer" },
      { id: secondUserId, email: `vvm-${secondUserId}@example.test`, phone: "+48000000032", role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: approvedProducerId,
        userId,
        nip: `VVM${approvedProducerId.slice(0, 9)}`,
        name: "Verified Volume Test Producer",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: unapprovedProducerId,
        userId: unapprovedUserId,
        nip: `VVM${unapprovedProducerId.slice(0, 9)}`,
        name: "Unapproved Test Producer",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: secondApprovedProducerId,
        userId: secondUserId,
        nip: `VVM${secondApprovedProducerId.slice(0, 9)}`,
        name: "Second Verified Volume Test Producer",
        countryCode: "DE",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values([
      {
        id: publishedProductId,
        producerId: approvedProducerId,
        family: "dom",
        status: "published",
        name: "VVM Published Product",
        floorAreaM2: 80,
      },
      { id: draftProductId, producerId: approvedProducerId, family: "dom", status: "draft", name: "VVM Draft Product" },
      {
        id: largeProductId,
        producerId: approvedProducerId,
        family: "dom",
        status: "published",
        name: "Vvmsearchtoken Product",
        description: "Duzy dom testowy do wyszukiwania.",
        floorAreaM2: 150,
      },
      { id: unapprovedProductId, producerId: unapprovedProducerId, family: "dom", status: "published", name: "Unapproved Producer Product" },
      {
        id: secondProductId,
        producerId: secondApprovedProducerId,
        family: "dom",
        status: "published",
        name: "Second VVM Product",
        floorAreaM2: 200,
      },
    ]);
    await db.insert(producerCapacityProfile).values([
      {
        producerId: approvedProducerId,
        unitsPerMonth: 15,
        certifications: ["Test certification"],
        volumeVerificationStatus: "approved",
      },
      {
        producerId: secondApprovedProducerId,
        unitsPerMonth: 20,
        certifications: ["Second test certification"],
        volumeVerificationStatus: "approved",
      },
    ]);
    await db.insert(producerDeliveryCountry).values([
      { producerId: approvedProducerId, countryCode: "PL" },
      { producerId: approvedProducerId, countryCode: "NL" },
      { producerId: secondApprovedProducerId, countryCode: "DE" },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(product)
      .where(inArray(product.id, [publishedProductId, draftProductId, largeProductId, unapprovedProductId, secondProductId]));
    await db
      .delete(producerDeliveryCountry)
      .where(inArray(producerDeliveryCountry.producerId, [approvedProducerId, secondApprovedProducerId]));
    await db
      .delete(producerCapacityProfile)
      .where(inArray(producerCapacityProfile.producerId, [approvedProducerId, secondApprovedProducerId]));
    await db.delete(producer).where(inArray(producer.id, [approvedProducerId, unapprovedProducerId, secondApprovedProducerId]));
    await db.delete(users).where(inArray(users.id, [userId, unapprovedUserId, secondUserId]));
  });

  describe("getVerifiedVolumeManufacturerProjects", () => {
    it("returns only the approved producer, with its published products and delivery countries (AC-13)", async () => {
      const results = await getVerifiedVolumeManufacturerProjects("pl");
      const match = results.find((item) => item.producerId === approvedProducerId);

      expect(match).toBeDefined();
      expect(match?.unitsPerMonth).toBe(15);
      expect(match?.certifications).toEqual(["Test certification"]);
      expect(match?.deliveryCountries.sort()).toEqual(["NL", "PL"]);
      expect(match?.projects.map((project) => project.id).sort()).toEqual([largeProductId, publishedProductId].sort());
      expect(results.some((item) => item.producerId === unapprovedProducerId)).toBe(false);
    });
  });

  describe("getVerifiedVolumeManufacturerProjects with filter (spec 0038 AC-19 to AC-23)", () => {
    it("narrows the producer list by delivery country before querying products (AC-20)", async () => {
      const results = await getVerifiedVolumeManufacturerProjects("pl", { countryCode: "DE" });

      expect(results.some((item) => item.producerId === secondApprovedProducerId)).toBe(true);
      // approvedProducerId delivers only to PL/NL, not DE, so it disappears
      // entirely even though it has published products (AC-20).
      expect(results.some((item) => item.producerId === approvedProducerId)).toBe(false);
    });

    it("filters a producer's projects by floor area without dropping the producer (AC-21)", async () => {
      const results = await getVerifiedVolumeManufacturerProjects("pl", { sizeMin: 100 });
      const match = results.find((item) => item.producerId === approvedProducerId);

      expect(match).toBeDefined();
      expect(match?.projects.map((project) => project.id)).toEqual([largeProductId]);
      expect(results.some((item) => item.producerId === secondApprovedProducerId)).toBe(true);
    });

    it("drops a producer entirely once none of its projects match the filter (AC-23)", async () => {
      const results = await getVerifiedVolumeManufacturerProjects("pl", { sizeMin: 180 });

      // approvedProducerId's two products (80/150 m²) both fall below 180.
      expect(results.some((item) => item.producerId === approvedProducerId)).toBe(false);
      expect(results.some((item) => item.producerId === secondApprovedProducerId)).toBe(true);
    });

    it("filters projects by keyword using the same full-text search as getProjects (AC-22)", async () => {
      const results = await getVerifiedVolumeManufacturerProjects("pl", { q: "Vvmsearchtok" });
      const match = results.find((item) => item.producerId === approvedProducerId);

      expect(match).toBeDefined();
      expect(match?.projects.map((project) => project.id)).toEqual([largeProductId]);
      // Zero matching projects for the second producer means it disappears too.
      expect(results.some((item) => item.producerId === secondApprovedProducerId)).toBe(false);
    });
  });

  describe("getProducerVolumeProfile", () => {
    it("returns the capacity profile for an approved producer (AC-15 gate)", async () => {
      const profile = await getProducerVolumeProfile(approvedProducerId);
      expect(profile?.unitsPerMonth).toBe(15);
      expect(profile?.deliveryCountries.sort()).toEqual(["NL", "PL"]);
    });

    it("returns null for a producer without an approved capacity profile", async () => {
      expect(await getProducerVolumeProfile(unapprovedProducerId)).toBeNull();
    });

    it("returns null for a non-uuid id instead of throwing", async () => {
      expect(await getProducerVolumeProfile("not-a-uuid")).toBeNull();
    });
  });

  // spec 0042: getProjectById assembles Project.variants (with nested
  // costLineItems/timelineStages), Project.roomLayout and Project.documents
  // from the real product_variant/cost_line_item/product_timeline_stage/
  // document tables, replacing the old flat Project.commercial.
  describe("getProjectById reads variants, room layout and documents (spec 0042)", () => {
    const variantsUserId = crypto.randomUUID();
    const variantsProducerId = crypto.randomUUID();
    const variantsProductId = crypto.randomUUID();
    const rawVariantId = crypto.randomUUID();
    const turnkeyVariantId = crypto.randomUUID();
    const onRequestVariantId = crypto.randomUUID();
    const noVariantProductId = crypto.randomUUID();

    beforeAll(async () => {
      await db.insert(users).values([
        { id: variantsUserId, email: `data-projects-variants-${variantsUserId}@example.test`, phone: "+48000000001", role: "producer" },
      ]);
      await db.insert(producer).values({
        id: variantsProducerId,
        userId: variantsUserId,
        nip: `DPV${variantsProducerId.slice(0, 8)}`,
        name: "Test Variant Producer",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      });
      await db.insert(product).values([
        {
          id: variantsProductId,
          producerId: variantsProducerId,
          status: "published",
          family: "dom",
          name: "Test Variant Product",
          floorAreaM2: 90,
          roomLayout: [
            { name: "Salon", areaM2: 28, function: "Dzienna" },
            { name: "Antresola", function: "Sypialnia", isMezzanine: true },
          ],
          // Spec 0050 AC-23, AC-35.
          clientRequirements: [
            { id: "req-fundament", key: "fundament", label: "Fundament", custom: false },
            { id: "req-custom-1", key: null, label: "Wyburzenie starej szopy", custom: true },
          ],
          currency: "EUR",
        },
        {
          id: noVariantProductId,
          producerId: variantsProducerId,
          status: "published",
          family: "dom",
          name: "Test No-Variant Product",
          floorAreaM2: 60,
          currency: "EUR",
        },
      ]);
      await db.insert(productVariant).values([
        {
          id: rawVariantId,
          productId: variantsProductId,
          completionStandard: "surowy-zamkniety",
          priceMinCents: 13800000,
          priceMaxCents: 16800000,
          scopeSummary: "Bryła zamknięta.",
          // Spec 0050 AC-13, AC-24, AC-36.
          excludedScope: "Przyłącza mediów i instalacja fotowoltaiczna.",
          isDefault: false,
          sortOrder: 1,
        },
        {
          id: turnkeyVariantId,
          productId: variantsProductId,
          completionStandard: "pod-klucz",
          priceMinCents: 20700000,
          priceMaxCents: 22000000,
          scopeSummary: "Gotowy do zamieszkania.",
          isDefault: true,
          sortOrder: 2,
        },
        {
          id: onRequestVariantId,
          productId: variantsProductId,
          completionStandard: "deweloperski",
          // Spec 0050 AC-13, AC-37: CHECK product_variant_price_on_request wymaga
          // NULL cen, gdy priceOnRequest = true.
          priceMinCents: null,
          priceMaxCents: null,
          priceOnRequest: true,
          isDefault: false,
          sortOrder: 3,
        },
      ]);
      await db.insert(costLineItem).values([
        { productVariantId: rawVariantId, label: "Fundament", status: "po-stronie-klienta", sortOrder: 1 },
        { productVariantId: turnkeyVariantId, label: "Fundament", status: "w-cenie", sortOrder: 1 },
      ]);
      await db.insert(productTimelineStage).values([
        { productVariantId: turnkeyVariantId, stageKey: "montaz", durationMinDays: 3, durationMaxDays: 5 },
        { productVariantId: turnkeyVariantId, stageKey: "produkcja", durationMinDays: 84, durationMaxDays: 112 },
      ]);
      await db.insert(document).values([
        {
          ownerUserId: variantsUserId,
          productId: variantsProductId,
          purpose: "product_floor_plan",
          r2Key: "test/floor-plan.webp",
          filename: "floor-plan.webp",
          mimeType: "image/webp",
          sizeBytes: 10,
        },
        {
          ownerUserId: variantsUserId,
          productId: variantsProductId,
          productVariantId: turnkeyVariantId,
          purpose: "product_realization_photo",
          r2Key: "test/realization.webp",
          filename: "realization.webp",
          mimeType: "image/webp",
          sizeBytes: 10,
        },
      ]);
    });

    afterAll(async () => {
      await db.delete(document).where(inArray(document.productId, [variantsProductId, noVariantProductId]));
      await db.delete(productTimelineStage).where(inArray(productTimelineStage.productVariantId, [rawVariantId, turnkeyVariantId]));
      await db.delete(costLineItem).where(inArray(costLineItem.productVariantId, [rawVariantId, turnkeyVariantId]));
      await db.delete(productVariant).where(inArray(productVariant.id, [rawVariantId, turnkeyVariantId, onRequestVariantId]));
      await db.delete(product).where(inArray(product.id, [variantsProductId, noVariantProductId]));
      await db.delete(producer).where(eq(producer.id, variantsProducerId));
      await db.delete(users).where(eq(users.id, variantsUserId));
    });

    it("assembles every variant with its own costLineItems and timelineStages, sorted by sort_order", async () => {
      const project = await getProjectById(variantsProductId);
      expect(project?.variants.map((variant) => variant.completionStandard)).toEqual([
        "surowy-zamkniety",
        "pod-klucz",
        "deweloperski",
      ]);

      const rawVariant = project?.variants.find((variant) => variant.completionStandard === "surowy-zamkniety");
      expect(rawVariant?.priceMin).toBe(138000);
      expect(rawVariant?.priceMax).toBe(168000);
      expect(rawVariant?.isDefault).toBe(false);
      expect(rawVariant?.costLineItems).toEqual([
        { id: expect.any(String), label: "Fundament", status: "po-stronie-klienta", responsibleParty: undefined },
      ]);

      const turnkeyVariant = project?.variants.find((variant) => variant.completionStandard === "pod-klucz");
      expect(turnkeyVariant?.isDefault).toBe(true);
      // Kolejność stała (formalności/produkcja/transport/montaż/wykończenie),
      // nie kolejność wstawienia (spec 0042 AC-6).
      expect(turnkeyVariant?.timelineStages.map((stage) => stage.stageKey)).toEqual(["produkcja", "montaz"]);
    });

    // Spec 0050 AC-13, AC-24, AC-36, AC-37.
    it("reads priceOnRequest and excludedScope per variant", async () => {
      const project = await getProjectById(variantsProductId);

      const rawVariant = project?.variants.find((variant) => variant.completionStandard === "surowy-zamkniety");
      expect(rawVariant?.priceOnRequest).toBe(false);
      expect(rawVariant?.excludedScope).toBe("Przyłącza mediów i instalacja fotowoltaiczna.");

      const onRequestVariant = project?.variants.find((variant) => variant.completionStandard === "deweloperski");
      expect(onRequestVariant?.priceOnRequest).toBe(true);
      expect(onRequestVariant?.priceMin).toBeUndefined();
      expect(onRequestVariant?.priceMax).toBeUndefined();
    });

    // Spec 0050 AC-23, AC-35.
    it("reads clientRequirements from product.client_requirements, undefined when empty", async () => {
      const withRequirements = await getProjectById(variantsProductId);
      expect(withRequirements?.clientRequirements).toEqual([
        { id: "req-fundament", key: "fundament", label: "Fundament", custom: false },
        { id: "req-custom-1", key: null, label: "Wyburzenie starej szopy", custom: true },
      ]);

      const withoutRequirements = await getProjectById(noVariantProductId);
      expect(withoutRequirements?.clientRequirements).toBeUndefined();
    });

    it("mirrors the trigger-derived product.price_min/max_cents at the top level, matching the default variant", async () => {
      const project = await getProjectById(variantsProductId);
      expect(project?.priceOnRequest).toBeFalsy();
      expect(project?.priceMin).toBe(207000);
      expect(project?.priceMax).toBe(220000);
    });

    it("reads roomLayout from product.room_layout, undefined when empty (spec 0042 AC-4)", async () => {
      const withRooms = await getProjectById(variantsProductId);
      expect(withRooms?.roomLayout).toEqual([
        { name: "Salon", areaM2: 28, function: "Dzienna", floorLevel: "parter" },
        { name: "Antresola", function: "Sypialnia", floorLevel: "poddasze" },
      ]);

      const withoutRooms = await getProjectById(noVariantProductId);
      expect(withoutRooms?.roomLayout).toBeUndefined();
    });

    it("resolves documents by purpose, and a document assigned to one variant only appears there (spec 0042 AC-7, AC-8)", async () => {
      const project = await getProjectById(variantsProductId);
      const floorPlan = project?.documents.find((doc) => doc.purpose === "product_floor_plan");
      const realization = project?.documents.find((doc) => doc.purpose === "product_realization_photo");

      expect(floorPlan?.productVariantId).toBeUndefined();
      expect(realization?.productVariantId).toBe(turnkeyVariantId);
    });

    it("treats a product with zero active variants exactly like priceOnRequest, never a mixed range (spec 0042 AC-11)", async () => {
      const project = await getProjectById(noVariantProductId);
      expect(project?.variants).toEqual([]);
      expect(project?.priceOnRequest).toBe(true);
      expect(project?.priceMin).toBe(0);
      expect(project?.priceMax).toBe(0);
    });
  });
});
