import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  doesProducerMatchProjectRequest,
  getMatchedProducersForRequest,
  getProducerMatchesForAdmin,
} from "./project-request-matching";
import {
  auditLog,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  producerMember,
  product,
  projectRequest,
  projectRequestProducerOverride,
  users,
} from "./schema";

// Spec 0070 AC-10: jedna reguła dopasowania. Każdy producent poniżej łamie dokładnie
// jeden warunek (albo jest wyjątkiem), więc test pokazuje, który warunek go odcina.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/project-request-matching: real DB (spec 0070 AC-10)", () => {
  const adminUserId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const bigRequestId = crypto.randomUUID();
  const standardRequestId = crypto.randomUUID();

  type Spec = {
    key: string;
    volume?: "approved" | "pending" | "not_submitted";
    country?: string | null;
    products?: { family: "dom" | "spa-modulowe"; status: "published" | "draft" }[];
    unitsPerMonth?: number | null;
    standards?: ("surowy-zamkniety" | "deweloperski" | "pod-klucz")[];
    blocked?: boolean;
    deleted?: boolean;
    noProfile?: boolean;
  };

  const specs: Spec[] = [
    { key: "ok" },
    { key: "noCountry", country: null },
    { key: "otherCountry", country: "DE" },
    { key: "otherFamily", products: [{ family: "spa-modulowe", status: "published" }] },
    { key: "draftOnly", products: [{ family: "dom", status: "draft" }] },
    { key: "wrongStandard", standards: ["pod-klucz"] },
    { key: "emptyStandards", standards: [] },
    { key: "boundary", unitsPerMonth: 1 },
    { key: "nullCapacity", unitsPerMonth: null },
    { key: "pending", volume: "pending" },
    { key: "noProfile", noProfile: true },
    { key: "blocked", blocked: true },
    { key: "deleted", deleted: true },
    { key: "excluded" },
    { key: "included", country: null, products: [] },
    { key: "includedButPending", country: null, products: [], volume: "pending" },
  ];

  const ids = Object.fromEntries(
    specs.map((spec) => [spec.key, { userId: crypto.randomUUID(), producerId: crypto.randomUUID() }]),
  ) as Record<string, { userId: string; producerId: string }>;
  const allUserIds = [adminUserId, ...Object.values(ids).map((value) => value.userId)];
  const allProducerIds = Object.values(ids).map((value) => value.producerId);
  const allRequestIds = [requestId, bigRequestId, standardRequestId];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `prm-admin-${adminUserId}@example.test`, phone: "+48000000100", role: "admin" },
      ...specs.map((spec, index) => ({
        id: ids[spec.key].userId,
        email: `prm-${spec.key}-${ids[spec.key].userId}@example.test`,
        phone: `+48000000${200 + index}`,
        role: "producer" as const,
        blockedAt: spec.blocked ? new Date() : null,
      })),
    ]);
    await db.insert(producer).values(
      specs.map((spec) => ({
        id: ids[spec.key].producerId,
        userId: ids[spec.key].userId,
        nip: `PRM${spec.key.slice(0, 3)}${ids[spec.key].producerId.slice(0, 6)}`,
        name: `PRM ${spec.key}`,
        countryCode: "PL",
        technology: "szkielet-drewniany" as const,
        deletedAt: spec.deleted ? new Date() : null,
      })),
    );
    await db.insert(producerMember).values(specs.map((spec) => ({ producerId: ids[spec.key].producerId, userId: ids[spec.key].userId })));

    const profileSpecs = specs.filter((spec) => !spec.noProfile);
    await db.insert(producerCapacityProfile).values(
      profileSpecs.map((spec) => ({
        producerId: ids[spec.key].producerId,
        volumeVerificationStatus: spec.volume ?? ("approved" as const),
        unitsPerMonth: spec.unitsPerMonth === undefined ? 5 : spec.unitsPerMonth,
        completionStandardsSupported: spec.standards ?? ["deweloperski" as const],
      })),
    );
    await db.insert(producerDeliveryCountry).values(
      specs
        .filter((spec) => spec.country !== null)
        .map((spec) => ({ producerId: ids[spec.key].producerId, countryCode: spec.country ?? "PL" })),
    );
    await db.insert(product).values(
      specs.flatMap((spec) =>
        (spec.products ?? [{ family: "dom" as const, status: "published" as const }]).map((item) => ({
          producerId: ids[spec.key].producerId,
          family: item.family,
          status: item.status,
          name: `PRM product ${spec.key}`,
        })),
      ),
    );

    const base = {
      contactName: "PRM Investor",
      countryCode: "PL",
      projectType: "resort" as const,
      families: ["dom" as const],
      status: "open" as const,
    };
    await db.insert(projectRequest).values([
      { ...base, id: requestId, contactEmail: `prm-a-${requestId}@example.test`, unitCount: 12, completionStandard: "deweloperski" },
      // 13 domów: moc 1 dom/miesiąc (12 rocznie) już nie wystarcza.
      { ...base, id: bigRequestId, contactEmail: `prm-b-${bigRequestId}@example.test`, unitCount: 13, completionStandard: "deweloperski" },
      // Bez standardu wykończenia: warunek standardu nie odcina nikogo.
      { ...base, id: standardRequestId, contactEmail: `prm-c-${standardRequestId}@example.test`, unitCount: 12 },
    ]);
    await db.insert(projectRequestProducerOverride).values([
      { projectRequestId: requestId, producerId: ids.excluded.producerId, mode: "exclude", createdByUserId: adminUserId },
      { projectRequestId: requestId, producerId: ids.included.producerId, mode: "include", createdByUserId: adminUserId },
      { projectRequestId: requestId, producerId: ids.includedButPending.producerId, mode: "include", createdByUserId: adminUserId },
    ]);
  });

  afterAll(async () => {
    await db.delete(projectRequestProducerOverride).where(inArray(projectRequestProducerOverride.projectRequestId, allRequestIds));
    await db.delete(projectRequest).where(inArray(projectRequest.id, allRequestIds));
    await db.delete(product).where(inArray(product.producerId, allProducerIds));
    await db.delete(producerDeliveryCountry).where(inArray(producerDeliveryCountry.producerId, allProducerIds));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, allProducerIds));
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducerIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  async function matchedKeys(forRequestId: string): Promise<string[]> {
    const matched = new Set((await getMatchedProducersForRequest(forRequestId)).map((item) => item.producerId));
    return specs.filter((spec) => matched.has(ids[spec.key].producerId)).map((spec) => spec.key);
  }

  it("matches a producer that meets every condition", async () => {
    expect(await doesProducerMatchProjectRequest(ids.ok.producerId, requestId)).toBe(true);
  });

  it.each([
    ["has no published product in the requested family", "otherFamily"],
    ["has only a draft product", "draftOnly"],
    ["does not support the requested completion standard", "wrongStandard"],
    ["is not approved for volume (pending)", "pending"],
    ["has no capacity profile at all", "noProfile"],
    ["is blocked", "blocked"],
    ["is deleted", "deleted"],
    ["is excluded by an exception", "excluded"],
    ["has an include exception but is not approved for volume", "includedButPending"],
  ])("does not match a producer that %s", async (_label, key) => {
    expect(await doesProducerMatchProjectRequest(ids[key].producerId, requestId)).toBe(false);
  });

  // Kraj dostawy nie jest warunkiem dopasowania: producent bez tego kraju widzi zapytanie.
  it("still matches a producer that has no delivery country or delivers only to another country", async () => {
    expect(await doesProducerMatchProjectRequest(ids.noCountry.producerId, requestId)).toBe(true);
    expect(await doesProducerMatchProjectRequest(ids.otherCountry.producerId, requestId)).toBe(true);
  });

  it("treats a missing capacity value or an empty standards list as no restriction", async () => {
    expect(await doesProducerMatchProjectRequest(ids.nullCapacity.producerId, requestId)).toBe(true);
    expect(await doesProducerMatchProjectRequest(ids.emptyStandards.producerId, requestId)).toBe(true);
  });

  it("matches at the capacity boundary (units per month times 12 equals the unit count) and not above it", async () => {
    expect(await doesProducerMatchProjectRequest(ids.boundary.producerId, requestId)).toBe(true);
    expect(await doesProducerMatchProjectRequest(ids.boundary.producerId, bigRequestId)).toBe(false);
  });

  it("matches a producer with an include exception even without country or product", async () => {
    expect(await doesProducerMatchProjectRequest(ids.included.producerId, requestId)).toBe(true);
  });

  it("ignores the completion standard condition when the request has none", async () => {
    expect(await doesProducerMatchProjectRequest(ids.wrongStandard.producerId, standardRequestId)).toBe(true);
  });

  it("returns false for an unknown request", async () => {
    expect(await doesProducerMatchProjectRequest(ids.ok.producerId, crypto.randomUUID())).toBe(false);
  });

  it("the reverse function lists exactly the producers the single check accepts", async () => {
    const reverse = await matchedKeys(requestId);
    const single: string[] = [];
    for (const spec of specs) {
      if (await doesProducerMatchProjectRequest(ids[spec.key].producerId, requestId)) single.push(spec.key);
    }
    expect(reverse.sort()).toEqual(single.sort());
    expect(reverse).toEqual(expect.arrayContaining(["ok", "included", "nullCapacity", "emptyStandards", "boundary", "noCountry", "otherCountry"]));
  });

  it("returns an empty list for a request nobody matches", async () => {
    expect(await getMatchedProducersForRequest(crypto.randomUUID())).toEqual([]);
  });

  describe("getProducerMatchesForAdmin", () => {
    it("lists approved producers with their match state and exception, hiding producers that are not approved and have no exception", async () => {
      const rows = await getProducerMatchesForAdmin(requestId);
      const byId = new Map(rows.map((row) => [row.producerId, row]));

      expect(byId.get(ids.ok.producerId)).toMatchObject({ matched: true, override: null });
      expect(byId.get(ids.noCountry.producerId)).toMatchObject({ matched: true, override: null });
      expect(byId.get(ids.excluded.producerId)).toMatchObject({ matched: false, override: "exclude" });
      expect(byId.get(ids.included.producerId)).toMatchObject({ matched: true, override: "include" });
      // Niezatwierdzony z wyjątkiem zostaje na liście, żeby admin mógł zdjąć wyjątek.
      expect(byId.get(ids.includedButPending.producerId)).toMatchObject({ matched: false, override: "include" });
      expect(byId.has(ids.pending.producerId)).toBe(false);
      expect(byId.has(ids.noProfile.producerId)).toBe(false);
      expect(byId.has(ids.deleted.producerId)).toBe(false);
    });
  });

  it("an exception row can be removed again and the rule applies as before", async () => {
    await db
      .delete(projectRequestProducerOverride)
      .where(eq(projectRequestProducerOverride.producerId, ids.excluded.producerId));
    expect(await doesProducerMatchProjectRequest(ids.excluded.producerId, requestId)).toBe(true);
  });
});
