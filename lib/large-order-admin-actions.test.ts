import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
const trackEventMock = vi.hoisted(() => vi.fn());
const notifyProducersClosedMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock, trackEvent: trackEventMock }));
vi.mock("@/lib/notifications/large-order-producer", () => ({ notifyProducersOfClosedRequest: notifyProducersClosedMock }));
// Spec 0070 AC-14, AC-23: mail o publikacji i zapis oczekującej rejestracji to granice I/O.
const notifyPublishedMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stageRegistrationMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-client", () => ({ notifyClientOfPublishedSummary: notifyPublishedMock }));
vi.mock("@/lib/stage-client-registration", () => ({ stageClientRegistration: stageRegistrationMock }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, bulkProductInquiry, producer, product, projectQuote, projectRequest, projectRequestProducerOverride, users } from "@/lib/db/schema";
import { closeRequest, extendDeadline, publishSummary, setAdvisorNote, setProducerOverride, unpublishQuote } from "./large-order-admin-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0070 AC-10: wyjątki od reguły dopasowania ustawia tylko administrator.
describe.skipIf(!process.env.DATABASE_URL)("lib/large-order-admin-actions: real DB, mocked auth", () => {
  const adminUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `loa-admin-${adminUserId}@example.test`, phone: "+48000000300", role: "admin" },
      { id: producerUserId, email: `loa-producer-${producerUserId}@example.test`, phone: "+48000000301", role: "producer" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `LOA${producerId.slice(0, 7)}`,
      name: "LOA Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(projectRequest).values({
      id: requestId,
      contactName: "LOA Investor",
      contactEmail: `loa-investor-${requestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
    });
  });

  afterEach(async () => {
    authMock.mockReset();
    captureErrorMock.mockClear();
    await db.delete(projectRequestProducerOverride).where(eq(projectRequestProducerOverride.projectRequestId, requestId));
  });

  afterAll(async () => {
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, producerUserId]));
    await db.delete(users).where(inArray(users.id, [adminUserId, producerUserId]));
  });

  async function overrideRow() {
    const [row] = await db
      .select()
      .from(projectRequestProducerOverride)
      .where(and(eq(projectRequestProducerOverride.projectRequestId, requestId), eq(projectRequestProducerOverride.producerId, producerId)));
    return row;
  }

  it("rejects a call without a session and writes nothing", async () => {
    authMock.mockResolvedValue(null);

    const result = await setProducerOverride(requestId, producerId, "include");

    expect(result.ok).toBe(false);
    expect(await overrideRow()).toBeUndefined();
  });

  it("rejects a producer session", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));

    const result = await setProducerOverride(requestId, producerId, "include");

    expect(result.ok).toBe(false);
    expect(await overrideRow()).toBeUndefined();
  });

  it("rejects ids that are not UUIDs", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    expect((await setProducerOverride("nope", producerId, "include")).ok).toBe(false);
  });

  it("adds an include exception and records who set it", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const result = await setProducerOverride(requestId, producerId, "include");

    expect(result.ok).toBe(true);
    expect(await overrideRow()).toMatchObject({ mode: "include", createdByUserId: adminUserId });
  });

  it("switches an existing exception to exclude instead of failing on the primary key", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    await setProducerOverride(requestId, producerId, "include");

    const result = await setProducerOverride(requestId, producerId, "exclude");

    expect(result.ok).toBe(true);
    expect((await overrideRow()).mode).toBe("exclude");
  });

  it("removes the exception with mode none, and none on a missing exception is harmless", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    await setProducerOverride(requestId, producerId, "exclude");

    expect((await setProducerOverride(requestId, producerId, "none")).ok).toBe(true);
    expect(await overrideRow()).toBeUndefined();
    expect((await setProducerOverride(requestId, producerId, "none")).ok).toBe(true);
  });

  it("answers with a readable error for an unknown request or producer", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const result = await setProducerOverride(crypto.randomUUID(), producerId, "include");

    expect(result).toEqual({ ok: false, error: "Nie znaleziono zapytania albo producenta." });
  });

  // Spec 0070 AC-9: administrator zmienia termin ofert, a zmiana trafia do audytu.
  describe("extendDeadline", () => {
    const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

    async function deadlineOf(id: string) {
      const [row] = await db.select({ deadlineAt: projectRequest.deadlineAt }).from(projectRequest).where(eq(projectRequest.id, id));
      return row.deadlineAt;
    }

    afterEach(async () => {
      await db.update(projectRequest).set({ status: "open", closedAt: null, closedReason: null, deadlineAt: inDays(14) }).where(eq(projectRequest.id, requestId));
    });

    it("rejects a call without a session and an admin-only role check", async () => {
      authMock.mockResolvedValue(null);
      expect((await extendDeadline(requestId, "request", inDays(30))).ok).toBe(false);

      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await extendDeadline(requestId, "request", inDays(30));

      expect(result.ok).toBe(false);
      expect(Math.abs((await deadlineOf(requestId)).getTime() - inDays(14).getTime())).toBeLessThan(60_000);
    });

    it("sets the new deadline and writes the change to the audit log under the admin", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const next = inDays(30);

      const result = await extendDeadline(requestId, "request", next.toISOString());

      expect(result.ok).toBe(true);
      expect((await deadlineOf(requestId)).getTime()).toBe(next.getTime());
      const rows = await db
        .select({ action: auditLog.action, oldValues: auditLog.oldValues, newValues: auditLog.newValues })
        .from(auditLog)
        .where(and(eq(auditLog.actorUserId, adminUserId), eq(auditLog.tableName, "project_request"), eq(auditLog.recordId, requestId)));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((row) => row.action === "update" && row.newValues?.deadline_at !== row.oldValues?.deadline_at)).toBe(true);
    });

    it("allows shortening to a moment that is still in the future", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const next = inDays(2);

      expect((await extendDeadline(requestId, "request", next)).ok).toBe(true);
      expect((await deadlineOf(requestId)).getTime()).toBe(next.getTime());
    });

    it("rejects a deadline in the past or an invalid date, leaving the deadline unchanged", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const before = await deadlineOf(requestId);

      const past = await extendDeadline(requestId, "request", new Date(Date.now() - 60_000));
      const invalid = await extendDeadline(requestId, "request", "not a date");

      expect(past.ok).toBe(false);
      expect(past.error).toMatch(/w przyszłości/);
      expect(invalid.ok).toBe(false);
      expect((await deadlineOf(requestId)).getTime()).toBe(before.getTime());
    });

    it("refuses a closed request and an unknown one", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(projectRequest).set({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" }).where(eq(projectRequest.id, requestId));

      const closed = await extendDeadline(requestId, "request", inDays(30));
      const unknown = await extendDeadline(crypto.randomUUID(), "request", inDays(30));

      expect(closed.ok).toBe(false);
      expect(unknown.ok).toBe(false);
      expect((await deadlineOf(requestId)).getTime()).toBeLessThan(inDays(15).getTime());
    });
  });

  // Spec 0070 AC-19: administrator zamyka zapytanie z powodem, producenci dostają informację.
  describe("closeRequest", () => {
    async function readRequest() {
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
      return row;
    }

    beforeEach(() => notifyProducersClosedMock.mockClear());

    afterEach(async () => {
      await db.update(projectRequest).set({ status: "open", closedAt: null, closedReason: null }).where(eq(projectRequest.id, requestId));
    });

    it("rejects a missing session, a producer, an unknown reason, and writes nothing", async () => {
      authMock.mockResolvedValue(null);
      expect((await closeRequest(requestId, "request", "staff_closed")).ok).toBe(false);
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      expect((await closeRequest(requestId, "request", "staff_closed")).ok).toBe(false);
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      expect((await closeRequest(requestId, "request", "because" as "expired")).ok).toBe(false);

      expect((await readRequest()).status).toBe("open");
      expect(notifyProducersClosedMock).not.toHaveBeenCalled();
    });

    it("closes with the reason and closedAt, tells producers once, and audits under the admin", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      expect(await closeRequest(requestId, "request", "no_offers")).toEqual({ ok: true });

      const row = await readRequest();
      expect(row.status).toBe("closed");
      expect(row.closedReason).toBe("no_offers");
      expect(row.closedAt).toBeInstanceOf(Date);
      expect(notifyProducersClosedMock).toHaveBeenCalledWith({ kind: "request", id: requestId });
      const audit = await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(and(eq(auditLog.actorUserId, adminUserId), eq(auditLog.tableName, "project_request"), eq(auditLog.recordId, requestId)));
      expect(audit.length).toBeGreaterThan(0);

      notifyProducersClosedMock.mockClear();
      const again = await closeRequest(requestId, "request", "staff_closed");
      expect(again.ok).toBe(false);
      expect(notifyProducersClosedMock).not.toHaveBeenCalled();
      expect((await readRequest()).closedReason).toBe("no_offers");
    });

    it("also closes an accepted request (only the admin can after the connection)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(projectRequest).set({ status: "accepted" }).where(eq(projectRequest.id, requestId));

      expect(await closeRequest(requestId, "request", "staff_closed")).toEqual({ ok: true });
      expect((await readRequest()).status).toBe("closed");
    });
  });

  // Spec 0070 AC-14: publikacja podsumowania, cofnięcie publikacji i komentarz doradcy.
  describe("publishSummary, unpublishQuote, setAdvisorNote", () => {
    let quoteId: string;

    beforeEach(async () => {
      notifyPublishedMock.mockClear();
      stageRegistrationMock.mockClear();
      quoteId = crypto.randomUUID();
      await db.insert(projectQuote).values({ id: quoteId, projectRequestId: requestId, producerId, totalPriceCents: 100_000_000, status: "active" });
      await db.update(projectRequest).set({ status: "quoted", summaryPublishedAt: null, selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
    });

    afterEach(async () => {
      await db.update(projectRequest).set({ status: "open", closedAt: null, closedReason: null, summaryPublishedAt: null, selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, requestId));
    });

    async function quoteRow() {
      const [row] = await db.select().from(projectQuote).where(eq(projectQuote.id, quoteId));
      return row;
    }
    async function requestRow() {
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
      return row;
    }

    it("accepts only an admin", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));

      expect((await publishSummary(requestId, "request", true)).ok).toBe(false);
      expect((await unpublishQuote(quoteId)).ok).toBe(false);
      expect((await setAdvisorNote(quoteId, "x")).ok).toBe(false);
      expect((await quoteRow()).publishedToClientAt).toBeNull();
    });

    it("refuses to publish without the review confirmation", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await publishSummary(requestId, "request", false);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/przejrzałeś/);
      expect((await quoteRow()).publishedToClientAt).toBeNull();
      expect((await requestRow()).status).toBe("quoted");
    });

    it("publishes the active quotes, sets the request status and the first publication time", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await publishSummary(requestId, "request", true);

      expect(result.ok).toBe(true);
      expect((await quoteRow()).publishedToClientAt).toBeInstanceOf(Date);
      const request = await requestRow();
      expect(request.status).toBe("published");
      expect(request.summaryPublishedAt).toBeInstanceOf(Date);
    });

    it("mails the client in the request language after publishing, and stages the registration first (AC-14, AC-23, AC-24)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(projectRequest).set({ contactLocale: "de" }).where(eq(projectRequest.id, requestId));
      try {
        expect((await publishSummary(requestId, "request", true)).ok).toBe(true);
      } finally {
        await db.update(projectRequest).set({ contactLocale: "pl" }).where(eq(projectRequest.id, requestId));
      }

      expect(stageRegistrationMock).toHaveBeenCalledTimes(1);
      expect(notifyPublishedMock).toHaveBeenCalledTimes(1);
      expect(notifyPublishedMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "request", id: requestId, locale: "de", countryCode: "PL", unitCount: expect.any(Number) }),
      );
      expect(stageRegistrationMock.mock.invocationCallOrder[0]).toBeLessThan(notifyPublishedMock.mock.invocationCallOrder[0]);
    });

    it("sends no mail when publishing is refused, and a failing mail does not undo the publication", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      expect((await publishSummary(requestId, "request", false)).ok).toBe(false);
      expect(notifyPublishedMock).not.toHaveBeenCalled();

      notifyPublishedMock.mockRejectedValueOnce(new Error("provider down"));
      const result = await publishSummary(requestId, "request", true);

      expect(result.ok).toBe(true);
      expect((await requestRow()).status).toBe("published");
      expect(captureErrorMock).toHaveBeenCalled();
    });

    it("keeps the first publication time when published again after a new quote arrives", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await publishSummary(requestId, "request", true);
      const first = (await requestRow()).summaryPublishedAt;
      const lateQuoteId = crypto.randomUUID();
      await db.update(projectQuote).set({ status: "superseded" }).where(eq(projectQuote.id, quoteId));
      await db.insert(projectQuote).values({ id: lateQuoteId, projectRequestId: requestId, producerId, totalPriceCents: 90_000_000, status: "active" });

      const result = await publishSummary(requestId, "request", true);

      expect(result.ok).toBe(true);
      const [late] = await db.select().from(projectQuote).where(eq(projectQuote.id, lateQuoteId));
      expect(late.publishedToClientAt).toBeInstanceOf(Date);
      expect((await requestRow()).summaryPublishedAt?.getTime()).toBe(first?.getTime());
    });

    it("refuses when the request has no active quote, and leaves the status alone", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(projectQuote).set({ status: "superseded" }).where(eq(projectQuote.id, quoteId));

      const result = await publishSummary(requestId, "request", true);

      expect(result.ok).toBe(false);
      expect((await requestRow()).status).toBe("quoted");
    });

    it("refuses a closed request and publishes nothing", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(projectRequest).set({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" }).where(eq(projectRequest.id, requestId));

      const result = await publishSummary(requestId, "request", true);

      expect(result.ok).toBe(false);
      expect((await quoteRow()).publishedToClientAt).toBeNull();
    });

    it("withdraws a publication and returns the request to quoted when nothing published remains", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await publishSummary(requestId, "request", true);

      const result = await unpublishQuote(quoteId);

      expect(result.ok).toBe(true);
      expect((await quoteRow()).publishedToClientAt).toBeNull();
      const request = await requestRow();
      expect(request.status).toBe("quoted");
      expect(request.summaryPublishedAt).toBeInstanceOf(Date);
    });

    it("refuses to withdraw the quote the client has chosen, and a quote that is not published", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      expect((await unpublishQuote(quoteId)).ok).toBe(false);

      await publishSummary(requestId, "request", true);
      await db.update(projectRequest).set({ selectedQuoteId: quoteId, selectedAt: new Date() }).where(eq(projectRequest.id, requestId));
      const chosen = await unpublishQuote(quoteId);

      expect(chosen.ok).toBe(false);
      expect((await quoteRow()).publishedToClientAt).toBeInstanceOf(Date);
    });

    it("stores, trims and clears the advisor note, only before publication", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      expect((await setAdvisorNote(quoteId, "  Dobra cena  ")).ok).toBe(true);
      expect((await quoteRow()).advisorNote).toBe("Dobra cena");
      expect((await setAdvisorNote(quoteId, "   ")).ok).toBe(true);
      expect((await quoteRow()).advisorNote).toBeNull();
      expect((await setAdvisorNote(quoteId, "x".repeat(2001))).ok).toBe(false);

      await publishSummary(requestId, "request", true);
      const afterPublish = await setAdvisorNote(quoteId, "Za późno");

      expect(afterPublish.ok).toBe(false);
      expect((await quoteRow()).advisorNote).toBeNull();
    });

    it("writes the publication to the audit log under the admin", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      await publishSummary(requestId, "request", true);

      const rows = await db.select().from(auditLog).where(and(eq(auditLog.actorUserId, adminUserId), eq(auditLog.tableName, "project_request"), eq(auditLog.recordId, requestId)));
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  // Spec 0070 AC-14: to samo na zapytaniu o konkretny produkt (rodzaj product).
  describe("publication for a bulk product inquiry", () => {
    const productId = crypto.randomUUID();
    const inquiryId = crypto.randomUUID();
    const bulkQuoteId = crypto.randomUUID();

    beforeAll(async () => {
      await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: "LOA bulk product" });
      await db.insert(bulkProductInquiry).values({
        id: inquiryId,
        productId,
        contactName: "LOA Bulk",
        contactEmail: `loa-bulk-${inquiryId}@example.test`,
        unitCount: 5,
        deliveryCountryCode: "PL",
        status: "quoted",
      });
      await db.insert(projectQuote).values({ id: bulkQuoteId, bulkProductInquiryId: inquiryId, producerId, totalPriceCents: 50_000_000, status: "active" });
    });

    afterAll(async () => {
      await db.delete(projectQuote).where(eq(projectQuote.id, bulkQuoteId));
      await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
      await db.delete(product).where(eq(product.id, productId));
    });

    it("publishes, then withdraws, returning the inquiry to quoted", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      expect((await publishSummary(inquiryId, "product", true)).ok).toBe(true);
      const [published] = await db.select().from(projectQuote).where(eq(projectQuote.id, bulkQuoteId));
      expect(published.publishedToClientAt).toBeInstanceOf(Date);
      const [inquiry] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
      expect(inquiry.status).toBe("published");
      expect(inquiry.summaryPublishedAt).toBeInstanceOf(Date);

      expect((await unpublishQuote(bulkQuoteId)).ok).toBe(true);
      const [withdrawn] = await db.select().from(projectQuote).where(eq(projectQuote.id, bulkQuoteId));
      expect(withdrawn.publishedToClientAt).toBeNull();
      const [after] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
      expect(after.status).toBe("quoted");
    });
  });
});
