import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { auditLog, producer, product, productCountryEligibility, users } from "@/lib/db/schema";
import { getEligibilityByCountry, getFeaturedProjectByFamily, getProjectById, getProjects } from "./projects";

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
