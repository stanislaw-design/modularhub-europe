import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth and @/lib/observability pull in next/server and "server-only"
// respectively, neither of which resolve under plain Vitest/jsdom — same
// boundary problem product-photo-actions.test.ts already works around.
// vi.hoisted is required: vi.mock() is hoisted above ordinary top level
// declarations, a plain `const authMock = vi.fn()` would throw "Cannot
// access 'authMock' before initialization".
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock }));

import { db } from "@/lib/db/client";
import { auditLog, client, inquiry, inquiryItem, offer, offerItem, order, orderStageEvent, producer, product, users } from "@/lib/db/schema";
import { markOfferDecisionViewedByProducer, markOfferViewedByClient, respondToOffer, submitOffer } from "./offer-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Hits the real dev database (spec 0033, mirrors lib/product-photo-actions.test.ts's
// convention); only auth and observability I/O are mocked at their boundary.
describe.skipIf(!process.env.DATABASE_URL)("lib/offer-actions: real DB, mocked auth + observability", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const otherClientUserId = crypto.randomUUID();
  const otherClientId = crypto.randomUUID();
  const producer1UserId = crypto.randomUUID();
  const producer1Id = crypto.randomUUID();
  const producer2UserId = crypto.randomUUID();
  const producer2Id = crypto.randomUUID();
  const producer3UserId = crypto.randomUUID();
  const producer3Id = crypto.randomUUID();
  const product1Id = crypto.randomUUID();
  const product2Id = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();

  const allUserIds = [clientUserId, otherClientUserId, producer1UserId, producer2UserId, producer3UserId];
  const allProducerIds = [producer1Id, producer2Id, producer3Id];
  const allProductIds = [product1Id, product2Id];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `oa-client-${clientUserId}@example.test`, phone: "+48000000001", role: "client" },
      { id: otherClientUserId, email: `oa-other-client-${otherClientUserId}@example.test`, phone: "+48000000002", role: "client" },
      { id: producer1UserId, email: `oa-producer1-${producer1UserId}@example.test`, phone: "+48000000003", role: "producer" },
      { id: producer2UserId, email: `oa-producer2-${producer2UserId}@example.test`, phone: "+48000000004", role: "producer" },
      { id: producer3UserId, email: `oa-producer3-${producer3UserId}@example.test`, phone: "+48000000005", role: "producer" },
    ]);
    await db.insert(client).values([
      { id: clientId, userId: clientUserId },
      { id: otherClientId, userId: otherClientUserId },
    ]);
    await db.insert(producer).values([
      { id: producer1Id, userId: producer1UserId, nip: `OA1${producer1Id.slice(0, 7)}`, name: "Offer Actions Producer 1", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer2Id, userId: producer2UserId, nip: `OA2${producer2Id.slice(0, 7)}`, name: "Offer Actions Producer 2", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer3Id, userId: producer3UserId, nip: `OA3${producer3Id.slice(0, 7)}`, name: "Offer Actions Producer 3 (no products here)", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(product).values([
      { id: product1Id, producerId: producer1Id, family: "dom", status: "published", name: "Offer Actions Product 1" },
      { id: product2Id, producerId: producer2Id, family: "dom", status: "published", name: "Offer Actions Product 2" },
    ]);
    await db.insert(inquiry).values({
      id: inquiryId,
      clientId,
      name: "Offer Actions Test Client",
      email: `oa-client-${clientUserId}@example.test`,
      phone: "+48000000001",
      deliveryCountryCode: "PL",
      status: "open",
      idempotencyKey: `offer-actions-test-${inquiryId}`,
    });
    await db.insert(inquiryItem).values([
      { inquiryId, productId: product1Id },
      { inquiryId, productId: product2Id },
    ]);
  });

  afterAll(async () => {
    await db.delete(inquiryItem).where(eq(inquiryItem.inquiryId, inquiryId));
    await db.delete(inquiry).where(eq(inquiry.id, inquiryId));
    await db.delete(product).where(inArray(product.id, allProductIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(client).where(inArray(client.id, [clientId, otherClientId]));
    await db.delete(users).where(inArray(users.id, allUserIds));
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [...allUserIds, ...allProducerIds, clientId, otherClientId, product1Id, product2Id, inquiryId]));
  });

  // Every offer/order row is created fresh per test and torn down afterward,
  // so each test starts from the same clean baseline: no offers, inquiry
  // status back to 'open'.
  afterEach(async () => {
    authMock.mockReset();
    trackEventMock.mockClear();
    captureErrorMock.mockClear();

    const offerRows = await db.select({ id: offer.id }).from(offer).where(eq(offer.inquiryId, inquiryId));
    const offerIds = offerRows.map((row) => row.id);
    if (offerIds.length > 0) {
      const orderRows = await db.select({ id: order.id }).from(order).where(inArray(order.offerId, offerIds));
      const orderIds = orderRows.map((row) => row.id);
      if (orderIds.length > 0) {
        await db.delete(orderStageEvent).where(inArray(orderStageEvent.orderId, orderIds));
        await db.delete(order).where(inArray(order.id, orderIds));
      }
      await db.delete(offerItem).where(inArray(offerItem.offerId, offerIds));
      await db.delete(offer).where(inArray(offer.id, offerIds));
    }
    await db.update(inquiry).set({ status: "open" }).where(eq(inquiry.id, inquiryId));
  });

  describe("submitOffer", () => {
    it("rejects with no session, writes nothing", async () => {
      authMock.mockResolvedValue(null);

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
      const rows = await db.select().from(offer).where(eq(offer.inquiryId, inquiryId));
      expect(rows).toHaveLength(0);
    });

    it("rejects a client session", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
    });

    // AC-15: prices must be >= 0.
    it("rejects a negative house price, writes nothing", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: -100 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/ujemne/);
      const rows = await db.select().from(offer).where(eq(offer.inquiryId, inquiryId));
      expect(rows).toHaveLength(0);
    });

    it("rejects a negative transport price, writes nothing", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: -1,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/ujemne/);
      const rows = await db.select().from(offer).where(eq(offer.inquiryId, inquiryId));
      expect(rows).toHaveLength(0);
    });

    // AC-13: server never trusts a productId from the client list; a
    // foreign product is silently dropped, only the caller's own items land.
    it("drops a product belonging to another producer from the offer, keeps only its own items", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitOffer({
        inquiryId,
        items: [
          { productId: product1Id, housePriceEur: 40000 },
          { productId: product2Id, housePriceEur: 99999 }, // belongs to producer2
        ],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(true);
      const [offerRow] = await db.select().from(offer).where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producer1Id)));
      const items = await db.select().from(offerItem).where(eq(offerItem.offerId, offerRow.id));
      expect(items).toHaveLength(1);
      expect(items[0]?.productId).toBe(product1Id);
    });

    it("rejects entirely when the producer has no products on this inquiry at all", async () => {
      authMock.mockResolvedValue(sessionAs(producer3UserId, "producer"));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono zapytania/);
    });

    it("creates an active offer with the correct prices, tracks offer_submitted, flips inquiry.status to offered", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 45000 }],
        transportPriceEur: 3200,
        installationPriceEur: 1800,
      });

      expect(result.ok).toBe(true);
      const [offerRow] = await db.select().from(offer).where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producer1Id)));
      expect(offerRow).toMatchObject({ status: "active", transportPriceCents: 320000, installationPriceCents: 180000 });
      const [item] = await db.select().from(offerItem).where(eq(offerItem.offerId, offerRow.id));
      expect(item.housePriceCents).toBe(4500000);
      expect(trackEventMock).toHaveBeenCalledWith("offer_submitted", expect.objectContaining({ inquiryId }), producer1UserId);

      const [inquiryRow] = await db.select({ status: inquiry.status }).from(inquiry).where(eq(inquiry.id, inquiryId));
      expect(inquiryRow.status).toBe("offered");
    });

    // AC-3: a revision supersedes the prior active offer atomically.
    it("a second submission from the same producer supersedes the first", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 42000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(true);
      const rows = await db.select({ status: offer.status }).from(offer).where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producer1Id)));
      expect(rows).toHaveLength(2);
      expect(rows.filter((row) => row.status === "active")).toHaveLength(1);
      expect(rows.filter((row) => row.status === "superseded")).toHaveLength(1);
    });

    // AC-4: once the client has accepted, no further submit/replace is allowed.
    it("refuses a submission once the offer has been accepted, with a readable error", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 40000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });
      await db.update(offer).set({ status: "accepted" }).where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producer1Id)));

      const result = await submitOffer({
        inquiryId,
        items: [{ productId: product1Id, housePriceEur: 41000 }],
        transportPriceEur: 3000,
        installationPriceEur: 1500,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/przyjął/);
      const rows = await db.select({ status: offer.status }).from(offer).where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producer1Id)));
      expect(rows).toHaveLength(1); // still just the accepted one, no new row
    });
  });

  describe("respondToOffer", () => {
    async function insertActiveOffer(producerId: string, statusOverride: "active" | "superseded" = "active") {
      const offerId = crypto.randomUUID();
      await db.insert(offer).values({
        id: offerId,
        inquiryId,
        producerId,
        installationPriceCents: 150000,
        transportPriceCents: 300000,
        status: statusOverride,
      });
      return offerId;
    }

    it("rejects with no session", async () => {
      const offerId = await insertActiveOffer(producer1Id);
      authMock.mockResolvedValue(null);

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(false);
      const [row] = await db.select({ status: offer.status }).from(offer).where(eq(offer.id, offerId));
      expect(row.status).toBe("active");
    });

    it("rejects a producer session", async () => {
      const offerId = await insertActiveOffer(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(false);
    });

    // AC-14: a client can only respond to an offer on their own inquiry.
    it("denies a different client responding to this offer, and changes nothing", async () => {
      const offerId = await insertActiveOffer(producer1Id);
      authMock.mockResolvedValue(sessionAs(otherClientUserId, "client"));

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono oferty/);
      const [row] = await db.select({ status: offer.status }).from(offer).where(eq(offer.id, offerId));
      expect(row.status).toBe("active");
    });

    // AC-7: acceptance creates the order plus its first stage event.
    it("accept creates an order at stage produkcja and one order_stage_event, tracks offer_accepted", async () => {
      const offerId = await insertActiveOffer(producer1Id);
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(true);
      const [offerRow] = await db.select({ status: offer.status }).from(offer).where(eq(offer.id, offerId));
      expect(offerRow.status).toBe("accepted");
      const [orderRow] = await db.select().from(order).where(eq(order.offerId, offerId));
      expect(orderRow).toMatchObject({ currentStage: "produkcja" });
      const events = await db.select().from(orderStageEvent).where(eq(orderStageEvent.orderId, orderRow.id));
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ stage: "produkcja", changedByUserId: clientUserId });
      expect(trackEventMock).toHaveBeenCalledWith("offer_accepted", expect.objectContaining({ offerId }), clientUserId);
    });

    it("a repeated accept on an already-accepted offer is idempotent: ok, no second order, no duplicate event", async () => {
      const offerId = await insertActiveOffer(producer1Id);
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
      await respondToOffer(offerId, "accepted");
      trackEventMock.mockClear();

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(true);
      const orders = await db.select().from(order).where(eq(order.offerId, offerId));
      expect(orders).toHaveLength(1);
      // No duplicate business event on the idempotent replay.
      expect(trackEventMock).not.toHaveBeenCalledWith("offer_accepted", expect.anything(), expect.anything());
    });

    // AC-19: the offer was superseded (e.g. by a producer's revision) between
    // the client loading the page and clicking accept.
    it("accept on a no-longer-active offer returns a readable race error, creates no order", async () => {
      const offerId = await insertActiveOffer(producer1Id, "superseded");
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await respondToOffer(offerId, "accepted");

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nie jest już aktywna/);
      const orders = await db.select().from(order).where(eq(order.offerId, offerId));
      expect(orders).toHaveLength(0);
    });

    it("reject on a no-longer-active offer returns a readable race error", async () => {
      const offerId = await insertActiveOffer(producer1Id, "superseded");
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await respondToOffer(offerId, "rejected");

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nie jest już aktywna/);
    });

    // AC-8, AC-10: rejecting one producer's offer never touches another
    // producer's offer on the same inquiry, and the aggregate only closes
    // once every producer has reached a terminal state.
    it("reject closes only that relation; the inquiry closes once every producer is terminal", async () => {
      const offerAId = await insertActiveOffer(producer1Id);
      const offerBId = await insertActiveOffer(producer2Id);
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const acceptResult = await respondToOffer(offerAId, "accepted");
      const rejectResult = await respondToOffer(offerBId, "rejected");

      expect(acceptResult.ok).toBe(true);
      expect(rejectResult.ok).toBe(true);
      const [offerA] = await db.select({ status: offer.status }).from(offer).where(eq(offer.id, offerAId));
      const [offerB] = await db.select({ status: offer.status }).from(offer).where(eq(offer.id, offerBId));
      expect(offerA.status).toBe("accepted");
      expect(offerB.status).toBe("rejected");
      const [inquiryRow] = await db.select({ status: inquiry.status }).from(inquiry).where(eq(inquiry.id, inquiryId));
      expect(inquiryRow.status).toBe("closed");
    });
  });

  describe("markOfferViewedByClient / markOfferDecisionViewedByProducer", () => {
    it("markOfferViewedByClient sets clientViewedAt on the inquiry's active offers for the owning client", async () => {
      const offerId = crypto.randomUUID();
      await db.insert(offer).values({ id: offerId, inquiryId, producerId: producer1Id, installationPriceCents: 100, transportPriceCents: 100, status: "active" });
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      await markOfferViewedByClient(inquiryId);

      const [row] = await db.select({ clientViewedAt: offer.clientViewedAt }).from(offer).where(eq(offer.id, offerId));
      expect(row.clientViewedAt).not.toBeNull();
    });

    it("markOfferViewedByClient is a no-op for a client who doesn't own the inquiry", async () => {
      const offerId = crypto.randomUUID();
      await db.insert(offer).values({ id: offerId, inquiryId, producerId: producer1Id, installationPriceCents: 100, transportPriceCents: 100, status: "active" });
      authMock.mockResolvedValue(sessionAs(otherClientUserId, "client"));

      await markOfferViewedByClient(inquiryId);

      const [row] = await db.select({ clientViewedAt: offer.clientViewedAt }).from(offer).where(eq(offer.id, offerId));
      expect(row.clientViewedAt).toBeNull();
    });

    it("markOfferDecisionViewedByProducer sets producerDecisionViewedAt only on this producer's decided offers, not active ones", async () => {
      const decidedOfferId = crypto.randomUUID();
      const activeOfferId = crypto.randomUUID();
      await db.insert(offer).values([
        { id: decidedOfferId, inquiryId, producerId: producer1Id, installationPriceCents: 100, transportPriceCents: 100, status: "rejected" },
        { id: activeOfferId, inquiryId, producerId: producer1Id, installationPriceCents: 100, transportPriceCents: 100, status: "active" },
      ]);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      await markOfferDecisionViewedByProducer(inquiryId);

      const [decided] = await db.select({ producerDecisionViewedAt: offer.producerDecisionViewedAt }).from(offer).where(eq(offer.id, decidedOfferId));
      const [active] = await db.select({ producerDecisionViewedAt: offer.producerDecisionViewedAt }).from(offer).where(eq(offer.id, activeOfferId));
      expect(decided.producerDecisionViewedAt).not.toBeNull();
      expect(active.producerDecisionViewedAt).toBeNull();
    });

    it("markOfferDecisionViewedByProducer is a no-op for a different producer", async () => {
      const offerId = crypto.randomUUID();
      await db.insert(offer).values({ id: offerId, inquiryId, producerId: producer1Id, installationPriceCents: 100, transportPriceCents: 100, status: "rejected" });
      authMock.mockResolvedValue(sessionAs(producer2UserId, "producer"));

      await markOfferDecisionViewedByProducer(inquiryId);

      const [row] = await db.select({ producerDecisionViewedAt: offer.producerDecisionViewedAt }).from(offer).where(eq(offer.id, offerId));
      expect(row.producerDecisionViewedAt).toBeNull();
    });
  });
});
