import { eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// @/lib/observability pulls in "server-only", which doesn't resolve under
// plain Vitest/jsdom (same boundary problem offer-actions.test.ts works around).
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
// @/auth nie ładuje się pod Vitest/jsdom, więc jest mockowane na granicy; domyślnie
// brak sesji (zapytanie anonimowe), testy zalogowanego klienta ustawiają sesję.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
const notifyTeamMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifyTeamCancelledMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifyProducersClosedMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-team", () => ({
  notifyTeamOfNewLargeOrder: notifyTeamMock,
  notifyTeamOfClientCancelledRequest: notifyTeamCancelledMock,
}));
vi.mock("@/lib/notifications/large-order-producer", () => ({ notifyProducersOfClosedRequest: notifyProducersClosedMock }));
// project-quote-actions ciągnie next-auth, który nie ładuje się pod Vitest/jsdom; dowiązanie
// po e mailu jest tu odtworzone tymi samymi dwoma UPDATE-ami co w prawdziwej funkcji.
const linkRequestsMock = vi.hoisted(() => vi.fn<(email: string, clientId: string) => Promise<void>>());
vi.mock("@/lib/project-quote-actions", () => ({ linkRequestsToClientOnLogin: linkRequestsMock }));

import { db } from "@/lib/db/client";
import { bulkProductInquiry, client, producer, product, projectRequest, users } from "@/lib/db/schema";
import { and, isNull } from "drizzle-orm";
import { cancelRequest, submitBulkProductInquiry, submitProjectRequest } from "./project-request-actions";

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
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  afterEach(async () => {
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    notifyTeamMock.mockClear();
    authMock.mockReset().mockResolvedValue(null);
  });

  async function cleanupRequestsFor(email: string) {
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
        unitCount: 12,
      });

      expect(result.ok).toBe(false);
    });

    it("rejects unitCount below 3", async () => {
      const result = await submitProjectRequest({
        contactName: "Too Few",
        contactEmail: `pra-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 2,
      });

      expect(result.ok).toBe(false);
    });

    it("accepts exactly 3 homes and stores one exact number, a range field is ignored (AC-8)", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "Three Homes",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 3,
        ...({ unitCountMax: 10 } as object),
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email));
      expect(row.unitCount).toBe(3);
      expect(row.unitCountMax).toBeNull();
    });

    it("creates an open project_request with the email normalized to lower case, no clientId (AC-1)", async () => {
      const email = `PRA-${crypto.randomUUID()}@Example.TEST`;
      const result = await submitProjectRequest({
        contactName: "Happy Path",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.status).toBe("open");
      expect(row.clientId).toBeNull();
      expect(row.contactEmail).toBe(email.toLowerCase());
      expect(trackEventMock).toHaveBeenCalledWith("project_request_submitted", expect.objectContaining({ countryCode: "PL" }), result.id);

      await cleanupRequestsFor(row.contactEmail);
    });

    // AC-1 (spec 0062): a non-disposable email domain plus a phone number
    // gets the "complete" cosmetic label, never "verified".
    it("sets trustSignal to 'complete' for a real-looking domain with a phone number", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "Complete Signal",
        contactEmail: email,
        contactPhone: "+48123456789",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select({ trustSignal: projectRequest.trustSignal }).from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.trustSignal).toBe("complete");

      await cleanupRequestsFor(email);
    });

    // AC-1: a disposable domain gets "new" even with a phone number.
    it("sets trustSignal to 'new' for a disposable email domain", async () => {
      const email = `pra-${crypto.randomUUID()}@mailinator.com`;
      const result = await submitProjectRequest({
        contactName: "Disposable Signal",
        contactEmail: email,
        contactPhone: "+48123456789",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select({ trustSignal: projectRequest.trustSignal }).from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.trustSignal).toBe("new");

      await cleanupRequestsFor(email);
    });

    // AC-1: a real domain but no phone number also stays "new".
    it("sets trustSignal to 'new' when no phone number is given", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "No Phone",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select({ trustSignal: projectRequest.trustSignal }).from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.trustSignal).toBe("new");

      await cleanupRequestsFor(email);
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
          unitCount: 10 + index,
        });
        expect(result.ok).toBe(true);
      }

      const fourth = await submitProjectRequest({
        contactName: "Limit 4",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 15,
      });

      expect(fourth.ok).toBe(false);
      expect(fourth.error).toMatch(/3 nierozstrzygnięte zgłoszenia/);
      // AC-39: formularz pokazuje tłumaczony tekst po kodzie, a nie polski komunikat.
      expect(fourth.errorCode).toBe("email_limit");

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
        unitCount: 15,
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
        unitCount: 15,
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
        unitCount: 30,
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
      const r1 = await submitProjectRequest({ contactName: "S1", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCount: 10 });
      const r2 = await submitBulkProductInquiry({ productId: publishedProductId, contactName: "S2", contactEmail: email, unitCount: 15, deliveryCountryCode: "PL" });
      const r3 = await submitProjectRequest({ contactName: "S3", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCount: 11 });
      expect([r1.ok, r2.ok, r3.ok]).toEqual([true, true, true]);

      const r4 = await submitBulkProductInquiry({ productId: publishedProductId, contactName: "S4", contactEmail: email, unitCount: 16, deliveryCountryCode: "PL" });

      expect(r4.ok).toBe(false);
      expect(r4.error).toMatch(/3 nierozstrzygnięte zgłoszenia/);

      await cleanupRequestsFor(email);
    });
  });

  // Spec 0070 AC-9 (język i termin), AC-24 (mail do zespołu).
  describe("spec 0070 week 1: contact locale, deadline, team alert", () => {
    it("stores the page language as contactLocale and a deadline 14 days ahead, and alerts the team", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitProjectRequest({
        contactName: "Locale Investor",
        contactEmail: email,
        countryCode: "DE",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
        locale: "de",
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email));
      expect(row.contactLocale).toBe("de");
      const days = (row.deadlineAt.getTime() - row.createdAt.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(13.9);
      expect(days).toBeLessThan(14.1);
      expect(notifyTeamMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "request",
          id: result.id,
          countryCode: "DE",
          unitCount: 12,
          contactLocale: "de",
          // Spec 0070 AC-10: liczba dopasowanych producentów do alertu "brak dopasowanych".
          matchedProducerCount: expect.any(Number),
        }),
      );
      await cleanupRequestsFor(email);
    });

    it("falls back to pl for a missing or unsupported language", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      await submitProjectRequest({
        contactName: "No Locale",
        contactEmail: email,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
        locale: "xx",
      });

      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email));
      expect(row.contactLocale).toBe("pl");
      await cleanupRequestsFor(email);
    });

    it("stores contactLocale and the team alert for a product inquiry too", async () => {
      const email = `pra-${crypto.randomUUID()}@example.test`;
      const result = await submitBulkProductInquiry({
        productId: publishedProductId,
        contactName: "Product Locale",
        contactEmail: email,
        unitCount: 15,
        deliveryCountryCode: "NL",
        locale: "nl",
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.contactEmail, email));
      expect(row.contactLocale).toBe("nl");
      expect(notifyTeamMock).toHaveBeenCalledWith(expect.objectContaining({ kind: "product", id: result.id, countryCode: "NL" }));
      await cleanupRequestsFor(email);
    });
  });

  // Spec 0070: zalogowany klient nie podaje danych drugi raz, zapytanie wiąże się z kontem.
  describe("signed in client", () => {
    const clientUserId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    const clientEmail = `pra-client-${clientUserId}@example.test`;

    beforeAll(async () => {
      await db.insert(users).values({ id: clientUserId, email: clientEmail, phone: "+48000000011", role: "client" });
      await db.insert(client).values({ id: clientId, userId: clientUserId });
    });

    afterAll(async () => {
      await db.delete(projectRequest).where(eq(projectRequest.clientId, clientId));
      await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.clientId, clientId));
      await db.delete(client).where(eq(client.id, clientId));
      await db.delete(users).where(eq(users.id, clientUserId));
    });

    function clientSession(): Session {
      return {
        user: { id: clientUserId, role: "client", phone: "+48000000011", name: "Signed In", email: clientEmail, image: null },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      } as Session;
    }

    const base = { contactName: "Signed In", countryCode: "PL", projectType: "resort" as const, families: ["dom" as const], unitCount: 12 };

    it("links a project request to the client when the email matches the session", async () => {
      authMock.mockResolvedValue(clientSession());

      const result = await submitProjectRequest({ ...base, contactEmail: clientEmail });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.clientId).toBe(clientId);
    });

    it("keeps the request anonymous when the contact email differs from the session email", async () => {
      authMock.mockResolvedValue(clientSession());
      const otherEmail = `pra-other-${crypto.randomUUID()}@example.test`;

      const result = await submitProjectRequest({ ...base, contactEmail: otherEmail });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.clientId).toBeNull();
      await cleanupRequestsFor(otherEmail);
    });

    it("never links a request to a producer or admin session", async () => {
      authMock.mockResolvedValue({ ...clientSession(), user: { ...clientSession().user, role: "producer" } } as Session);

      const result = await submitProjectRequest({ ...base, contactEmail: clientEmail });

      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, result.id!));
      expect(row.clientId).toBeNull();
    });

    it("links a product inquiry to the client when the email matches the session", async () => {
      authMock.mockResolvedValue(clientSession());

      const result = await submitBulkProductInquiry({
        productId: publishedProductId,
        contactName: "Signed In",
        contactEmail: clientEmail,
        unitCount: 15,
        deliveryCountryCode: "PL",
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.id, result.id!));
      expect(row.clientId).toBe(clientId);
    });
  });

  // Spec 0070 AC-37: klient zamyka własne zapytanie.
  describe("cancelRequest", () => {
    const ownerUserId = crypto.randomUUID();
    const ownerClientId = crypto.randomUUID();
    const ownerEmail = `pra-cancel-${ownerUserId}@example.test`;
    const otherUserId = crypto.randomUUID();
    const otherClientId = crypto.randomUUID();

    beforeAll(async () => {
      await db.insert(users).values([
        { id: ownerUserId, email: ownerEmail, phone: "+48000000021", role: "client" },
        { id: otherUserId, email: `pra-cancel-other-${otherUserId}@example.test`, phone: "+48000000022", role: "client" },
      ]);
      await db.insert(client).values([
        { id: ownerClientId, userId: ownerUserId },
        { id: otherClientId, userId: otherUserId },
      ]);
    });

    afterAll(async () => {
      await db.delete(projectRequest).where(inArray(projectRequest.clientId, [ownerClientId, otherClientId]));
      await db.delete(projectRequest).where(eq(projectRequest.contactEmail, ownerEmail));
      await db.delete(client).where(inArray(client.id, [ownerClientId, otherClientId]));
      await db.delete(users).where(inArray(users.id, [ownerUserId, otherUserId]));
    });

    function ownerSession(): Session {
      return {
        user: { id: ownerUserId, role: "client", phone: "+48000000021", name: "Owner", email: ownerEmail, image: null },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      } as Session;
    }

    async function insertRequest(values: Partial<typeof projectRequest.$inferInsert> = {}) {
      const [row] = await db
        .insert(projectRequest)
        .values({
          clientId: ownerClientId,
          contactName: "Owner",
          contactEmail: `pra-cancel-row-${crypto.randomUUID()}@example.test`,
          countryCode: "PL",
          projectType: "resort",
          families: ["dom"],
          unitCount: 12,
          ...values,
        })
        .returning({ id: projectRequest.id });
      return row.id;
    }

    async function readRequest(id: string) {
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      return row;
    }

    beforeEach(() => {
      notifyTeamCancelledMock.mockClear();
      notifyProducersClosedMock.mockClear();
      linkRequestsMock.mockReset().mockImplementation(async (email, clientId) => {
        await db.update(projectRequest).set({ clientId }).where(and(eq(projectRequest.contactEmail, email), isNull(projectRequest.clientId)));
      });
    });

    it("closes an open request with reason client_cancelled and closedAt, tells producers", async () => {
      authMock.mockResolvedValue(ownerSession());
      const id = await insertRequest();

      const result = await cancelRequest(id, "request");

      expect(result).toEqual({ ok: true });
      const row = await readRequest(id);
      expect(row.status).toBe("closed");
      expect(row.closedReason).toBe("client_cancelled");
      expect(row.closedAt).toBeInstanceOf(Date);
      expect(trackEventMock).toHaveBeenCalledWith("request_cancelled_by_client", { kind: "request" }, id);
      expect(notifyProducersClosedMock).toHaveBeenCalledWith({ kind: "request", id });
      expect(notifyTeamCancelledMock).toHaveBeenCalledWith(expect.objectContaining({ wasPublished: false, hadPendingSelection: false }));
    });

    it("closes a published request and flags it for the team", async () => {
      authMock.mockResolvedValue(ownerSession());
      const id = await insertRequest({ status: "published" });

      expect(await cancelRequest(id, "request")).toEqual({ ok: true });
      expect(notifyTeamCancelledMock).toHaveBeenCalledWith(expect.objectContaining({ wasPublished: true }));
    });

    it("refuses an accepted request and leaves it unchanged", async () => {
      authMock.mockResolvedValue(ownerSession());
      const id = await insertRequest({ status: "accepted" });

      expect(await cancelRequest(id, "request")).toEqual({ ok: false, errorCode: "not_cancellable" });
      expect((await readRequest(id)).status).toBe("accepted");
      expect(notifyProducersClosedMock).not.toHaveBeenCalled();
    });

    it("answers not_found for a request of another client, same as a missing one", async () => {
      authMock.mockResolvedValue(ownerSession());
      const foreignId = await insertRequest({ clientId: otherClientId });

      expect(await cancelRequest(foreignId, "request")).toEqual({ ok: false, errorCode: "not_found" });
      expect((await readRequest(foreignId)).status).toBe("open");
      expect(await cancelRequest(crypto.randomUUID(), "request")).toEqual({ ok: false, errorCode: "not_found" });
    });

    it("succeeds again without a second notification when clicked twice", async () => {
      authMock.mockResolvedValue(ownerSession());
      const id = await insertRequest();

      expect(await cancelRequest(id, "request")).toEqual({ ok: true });
      notifyProducersClosedMock.mockClear();
      expect(await cancelRequest(id, "request")).toEqual({ ok: true });
      expect(notifyProducersClosedMock).not.toHaveBeenCalled();
    });

    it("rejects an anonymous caller and a producer session", async () => {
      const id = await insertRequest();
      authMock.mockResolvedValue(null);
      expect(await cancelRequest(id, "request")).toEqual({ ok: false, errorCode: "not_found" });
      authMock.mockResolvedValue({ ...ownerSession(), user: { ...ownerSession().user, role: "producer" } } as Session);
      expect(await cancelRequest(id, "request")).toEqual({ ok: false, errorCode: "not_found" });
      expect((await readRequest(id)).status).toBe("open");
    });

    it("closes a request submitted anonymously with the session email by linking it first", async () => {
      authMock.mockResolvedValue(ownerSession());
      const id = await insertRequest({ clientId: null, contactEmail: ownerEmail });

      expect(await cancelRequest(id, "request")).toEqual({ ok: true });
      const row = await readRequest(id);
      expect(row.clientId).toBe(ownerClientId);
      expect(row.status).toBe("closed");
    });

    it("frees a place in the limit", async () => {
      authMock.mockResolvedValue(ownerSession());
      const email = `pra-cancel-limit-${crypto.randomUUID()}@example.test`;
      const ids: string[] = [];
      for (let index = 0; index < 3; index += 1) ids.push(await insertRequest({ contactEmail: email, unitCount: 10 + index }));
      const input = { contactName: "X", contactEmail: email, countryCode: "PL", projectType: "resort" as const, families: ["dom" as const], unitCount: 14 };
      const blocked = await submitProjectRequest(input);
      expect(blocked.errorCode).toBe("email_limit");

      await cancelRequest(ids[0], "request");

      const allowed = await submitProjectRequest(input);
      expect(allowed.ok).toBe(true);
      await cleanupRequestsFor(email);
    });
  });
});
