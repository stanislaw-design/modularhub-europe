import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// producers.ts imports resolveProductDocumentPhotos from ./projects, which
// pulls in @/lib/observability/errors ("server-only"/@sentry/nextjs) — same
// boundary problem projects.test.ts already works around.
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { producer, producerDeliveryCountry, product, users } from "@/lib/db/schema";
import { getProducerById, getProducers } from "./producers";

// Hits the real dev database (spec 0038, mirrors lib/data/projects.test.ts's
// convention): getProducerById/getProducers were rewritten off fixture data
// (whose ids like "prod-cocomodule" never matched a real producer uuid) onto
// real producer/product/producerDeliveryCountry rows.
describe.skipIf(!process.env.DATABASE_URL)("lib/data/producers: real DB", () => {
  const withProductsUserId = crypto.randomUUID();
  const withProductsProducerId = crypto.randomUUID();
  const publishedProductId = crypto.randomUUID();
  const draftProductId = crypto.randomUUID();

  const noProductsUserId = crypto.randomUUID();
  const noProductsProducerId = crypto.randomUUID();

  const unfilledTrustUserId = crypto.randomUUID();
  const unfilledTrustProducerId = crypto.randomUUID();
  const unfilledTrustProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: withProductsUserId, email: `producers-test-1-${withProductsUserId}@example.test`, phone: "+48000000020", role: "producer" },
      { id: noProductsUserId, email: `producers-test-2-${noProductsUserId}@example.test`, phone: "+48000000021", role: "producer" },
      { id: unfilledTrustUserId, email: `producers-test-3-${unfilledTrustUserId}@example.test`, phone: "+48000000022", role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: withProductsProducerId,
        userId: withProductsUserId,
        nip: `PDT${withProductsProducerId.slice(0, 9)}`,
        name: "Producers Test Producer",
        countryCode: "PL",
        rating: null,
        technology: "szkielet-drewniany",
        verificationStatus: "approved",
        inquiryResponseTimeLabel: "2 dni robocze",
        showroomVisitAvailable: true,
        showroomVisitNote: "Umów wizytę telefonicznie.",
      },
      {
        id: noProductsProducerId,
        userId: noProductsUserId,
        nip: `PDT${noProductsProducerId.slice(0, 9)}`,
        name: "Producers Test Producer Without Products",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: unfilledTrustProducerId,
        userId: unfilledTrustUserId,
        nip: `PDT${unfilledTrustProducerId.slice(0, 9)}`,
        name: "Producers Test Producer Without Trust Fields",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values([
      {
        id: publishedProductId,
        producerId: withProductsProducerId,
        family: "dom",
        status: "published",
        name: "Producers Test Published Product",
        floorAreaM2: 60,
        coverImageUrl: "/images/producers-test-cover.jpg",
      },
      {
        id: draftProductId,
        producerId: withProductsProducerId,
        family: "dom",
        status: "draft",
        name: "Producers Test Draft Product",
        floorAreaM2: 999,
      },
      {
        id: unfilledTrustProductId,
        producerId: unfilledTrustProducerId,
        family: "dom",
        status: "published",
        name: "Producers Test Unfilled Trust Product",
        floorAreaM2: 60,
      },
    ]);
    await db.insert(producerDeliveryCountry).values([{ producerId: withProductsProducerId, countryCode: "NL" }]);
  });

  afterAll(async () => {
    await db.delete(product).where(inArray(product.id, [publishedProductId, draftProductId, unfilledTrustProductId]));
    await db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, withProductsProducerId));
    await db.delete(producer).where(inArray(producer.id, [withProductsProducerId, noProductsProducerId, unfilledTrustProducerId]));
    await db.delete(users).where(inArray(users.id, [withProductsUserId, noProductsUserId, unfilledTrustUserId]));
  });

  describe("getProducerById", () => {
    it("returns the producer mapped from real data, rating null mapped to 0 (AC-17)", async () => {
      const result = await getProducerById(withProductsProducerId);
      expect(result?.name).toBe("Producers Test Producer");
      expect(result?.rating).toBe(0);
      expect(result?.modelsCount).toBe(1);
      expect(result?.sizeRangeM2Min).toBe(60);
      expect(result?.sizeRangeM2Max).toBe(60);
      expect(result?.deliveryCountries).toEqual(["NL"]);
      expect(result?.featuredPhotoUrl).toBe("/images/producers-test-cover.jpg");
      expect(result?.verified).toBe(true);
    });

    it("counts only published products, not drafts", async () => {
      const result = await getProducerById(withProductsProducerId);
      expect(result?.modelsCount).toBe(1);
    });

    it("returns null for an unknown id instead of throwing", async () => {
      expect(await getProducerById(crypto.randomUUID())).toBeNull();
    });

    it("returns null for an empty id", async () => {
      expect(await getProducerById("")).toBeNull();
    });

    it("returns null for a non-uuid id (old fixture-style slug)", async () => {
      expect(await getProducerById("prod-cocomodule")).toBeNull();
    });

    it("reads the trust fields added by spec 0042 (AC-9, AC-10)", async () => {
      const result = await getProducerById(withProductsProducerId);
      expect(result?.inquiryResponseTimeLabel).toBe("2 dni robocze");
      expect(result?.showroomVisitAvailable).toBe(true);
      expect(result?.showroomVisitNote).toBe("Umów wizytę telefonicznie.");
    });

    it("maps an unfilled showroomVisitAvailable to null, never a silent false (spec 0042 AC-9)", async () => {
      const result = await getProducerById(unfilledTrustProducerId);
      expect(result?.showroomVisitAvailable).toBeNull();
      expect(result?.inquiryResponseTimeLabel).toBeUndefined();
      expect(result?.showroomVisitNote).toBeUndefined();
    });
  });

  describe("getProducers", () => {
    it("includes a producer with a published product", async () => {
      const results = await getProducers();
      expect(results.some((item) => item.id === withProductsProducerId)).toBe(true);
    });

    it("skips a producer with zero published products (AC-17)", async () => {
      const results = await getProducers();
      expect(results.some((item) => item.id === noProductsProducerId)).toBe(false);
    });
  });
});
