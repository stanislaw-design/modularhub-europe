import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/lib/observability pulls in "server-only", which doesn't resolve under
// plain Vitest/jsdom (same boundary problem offer-actions.test.ts works around).
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  product,
  projectRequest,
  projectRequestTargetProducer,
  users,
} from "@/lib/db/schema";
import { submitBulkProductInquiry, submitProjectRequest } from "./project-request-actions";

// Hits the real dev database (spec 0037, mirrors lib/offer-actions.test.ts's
// convention): only observability I/O is mocked at its boundary. No auth
// mock needed, both actions under test are deliberately unauthenticated
// (AC-1, AC-4).
describe.skipIf(!process.env.DATABASE_URL)("lib/project-request-actions: real DB, mocked observability", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const publishedProductId = crypto.randomUUID();
  const draftProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: producerUserId,
      email: `pra-producer-${producerUserId}@example.test`,
      phone: "+48000000010",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `PRA${producerId.slice(0, 9)}`,
      name: "Project Request Actions Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values([
      { id: publishedProductId, producerId, family: "dom", status: "published", name: "PRA Published Product" },
      { id: draftProductId, producerId, family: "dom", status: "draft", name: "PRA Draft Product" },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(inArray(product.id, [publishedProductId, draftProductId]));
    await db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, producerId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  afterEach(async () => {
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
  });

  async function cleanupRequestsFor(email: string) {
    const requests = await db.select({ id: projectRequest.id }).from(projectRequest).where(eq(projectRequest.contactEmail, email));
    for (const row of requests) {
      await db.delete(projectRequestTargetProducer).where(eq(projectRequestTargetProducer.projectRequestId, row.id));
    }
    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, email));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.contactEmail, email));
  }

  describe("submitProjectRequest", () => {
    it("rejects an invalid email, writes nothing", async () => {
      const result = await submitProjectRequest({
        contactName: "Bad Email",
        contactEmail: "not-an-email",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 12,
      });

      expect(result.ok).toBe(false);
    });

    it("rejects unitCountMin below 10", async () => {
      const result = await submitProjectRequest({
        contactName: "Too Few",
        contactEmail: `pra-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 5,
      });

      expect(result.ok).toBe(false);
    });

    it("rejects unitCountMax below unitCountMin, writes nothing", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "Bad Range",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 20,
        unitCountMax: 10,
      });

      expect(result.ok).toBe(false);
      const rows = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email));
      expect(rows).toHaveLength(0);
    });

    it("creates an open project_request with the email normalized to lower case, no clientId (AC-1)", async () => {
      const email = `PRA-${crypto.randomUUID()}@Example.TEST`;
      const result = await submitProjectRequest({
        contactName: "Happy Path",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 12,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.status).toBe("open");
      expect(row.clientId).toBeNull();
      expect(row.contactEmail).toBe(email.toLowerCase());
      expect(trackEventMock).toHaveBeenCalledWith("project_request_submitted", expect.objectContaining({ countryCode: "PL" }), result.id);

      await cleanupRequestsFor(row.contactEmail);
    });

    // AC-2: no producer is verified+delivering to this country -> zero target
    // rows, not an error (spec 0037 Key invariants).
    it("creates the request with zero target producers when none are verified for the country", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "No Match",
        contactEmail: email,
        countryCode: "DE",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 12,
      });

      expect(result.ok).toBe(true);
      const targets = await db.select().from(projectRequestTargetProducer).where(eq(projectRequestTargetProducer.projectRequestId, result.id!));
      expect(targets).toHaveLength(0);

      await cleanupRequestsFor(email);
    });

    // AC-2: a producer verified for volume and delivering to the request's
    // country is auto targeted.
    it("auto-targets a producer that is volume-verified and delivers to the request's country", async () => {
      await db
        .insert(producerCapacityProfile)
        .values({ producerId, volumeVerificationStatus: "approved" })
        .onConflictDoUpdate({ target: producerCapacityProfile.producerId, set: { volumeVerificationStatus: "approved" } });
      await db.insert(producerDeliveryCountry).values({ producerId, countryCode: "NL" }).onConflictDoNothing();

      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "Match",
        contactEmail: email,
        countryCode: "NL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 12,
      });

      expect(result.ok).toBe(true);
      const targets = await db.select().from(projectRequestTargetProducer).where(eq(projectRequestTargetProducer.projectRequestId, result.id!));
      expect(targets).toHaveLength(1);
      expect(targets[0]?.producerId).toBe(producerId);
      expect(targets[0]?.status).toBe("invited");

      await cleanupRequestsFor(email);
      await db.delete(producerDeliveryCountry).where(and(eq(producerDeliveryCountry.producerId, producerId), eq(producerDeliveryCountry.countryCode, "NL")));
      await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    });

    // AC-10, /debug regression: the 4th unresolved request for one email is
    // rejected with the specific, readable message, not a generic fallback.
    it("rejects a 4th unresolved request for the same email with the clear limit message", async () => {
      const email = `pra-limit-${crypto.randomUUID()}@example.test`;
      for (let index = 0; index < 3; index += 1) {
        const result = await submitProjectRequest({
          contactName: `Limit ${index}`,
          contactEmail: email,
          countryCode: "PL",
          projectType: "resort",
          families: ["dom"],
          unitCountMin: 10 + index,
        });
        expect(result.ok).toBe(true);
      }

      const fourth = await submitProjectRequest({
        contactName: "Limit 4",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 15,
      });

      expect(fourth.ok).toBe(false);
      expect(fourth.error).toMatch(/3 nierozstrzygnięte zgłoszenia/);

      await cleanupRequestsFor(email);
    });
  });

  describe("submitBulkProductInquiry", () => {
    it("rejects a request for a draft (unpublished) product", async () => {
      const email = `pra-bulk-${crypto.randomUUID()}@example.test`;
      const result = await submitBulkProductInquiry({
        productId: draftProductId,
        contactName: "Draft Buyer",
        contactEmail: email,
        unitCountMin: 15,
        deliveryCountryCode: "PL",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/opublikowanego produktu/);
      const rows = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.contactEmail, email));
      expect(rows).toHaveLength(0);
    });

    it("rejects a request for a non-existent product", async () => {
      const result = await submitBulkProductInquiry({
        productId: crypto.randomUUID(),
        contactName: "Ghost Buyer",
        contactEmail: `pra-bulk-${crypto.randomUUID()}@example.test`,
        unitCountMin: 15,
        deliveryCountryCode: "PL",
      });

      expect(result.ok).toBe(false);
    });

    it("creates a bulk_product_inquiry for a published product, tracks the event (AC-4)", async () => {
      const email = `pra-bulk-${crypto.randomUUID()}@example.test`;
      const result = await submitBulkProductInquiry({
        productId: publishedProductId,
        contactName: "Bulk Buyer",
        contactEmail: email,
        unitCountMin: 30,
        deliveryCountryCode: "PL",
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.id, result.id!));
      expect(row.status).toBe("open");
      expect(row.productId).toBe(publishedProductId);
      expect(trackEventMock).toHaveBeenCalledWith(
        "bulk_product_inquiry_submitted",
        expect.objectContaining({ productId: publishedProductId }),
        result.id,
      );

      await cleanupRequestsFor(email);
    });

    // AC-10: the 3-unresolved-request limit counts project_request and
    // bulk_product_inquiry together, by normalized email, not per table.
    it("counts project_request and bulk_product_inquiry together against the same email's limit", async () => {
      const email = `pra-shared-limit-${crypto.randomUUID()}@example.test`;
      const r1 = await submitProjectRequest({ contactName: "S1", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 10 });
      const r2 = await submitBulkProductInquiry({ productId: publishedProductId, contactName: "S2", contactEmail: email, unitCountMin: 15, deliveryCountryCode: "PL" });
      const r3 = await submitProjectRequest({ contactName: "S3", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 11 });
      expect([r1.ok, r2.ok, r3.ok]).toEqual([true, true, true]);

      const r4 = await submitBulkProductInquiry({ productId: publishedProductId, contactName: "S4", contactEmail: email, unitCountMin: 16, deliveryCountryCode: "PL" });

      expect(r4.ok).toBe(false);
      expect(r4.error).toMatch(/3 nierozstrzygnięte zgłoszenia/);

      await cleanupRequestsFor(email);
    });
  });
});
