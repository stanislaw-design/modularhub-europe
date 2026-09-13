import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth pulls in next-auth's full adapter/provider chain, which doesn't
// resolve under plain Vitest/jsdom (confirmed during /check verify: it
// crashes on next/navigation's client-only React APIs even outside Vitest).
// @/lib/observability pulls in "server-only", same boundary problem as
// lib/offer-actions.test.ts. next-auth itself is mocked too so instanceof
// AuthError checks stay meaningful without ever loading the real package.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const signInMock = vi.hoisted(() => vi.fn());
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: signInMock }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  client,
  pendingRegistration,
  producer,
  producerCapacityProfile,
  product,
  projectQuote,
  projectRequest,
  projectRequestTargetProducer,
  users,
} from "@/lib/db/schema";
import {
  acceptProjectQuote,
  linkRequestsToClientOnLogin,
  markProjectRequestViewedOrDeclined,
  setClientB2bVerification,
  setProducerVolumeVerification,
  submitClientB2bDetails,
  submitProjectQuote,
  updateProducerCapacityProfile,
} from "./project-quote-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Hits the real dev database (spec 0037, mirrors lib/offer-actions.test.ts's
// convention); only auth, next-auth, and observability I/O are mocked at
// their boundary.
describe.skipIf(!process.env.DATABASE_URL)("lib/project-quote-actions: real DB, mocked auth + observability", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const otherClientUserId = crypto.randomUUID();
  const otherClientId = crypto.randomUUID();
  const producer1UserId = crypto.randomUUID(); // targeted on the project_request fixture
  const producer1Id = crypto.randomUUID();
  const producer2UserId = crypto.randomUUID(); // never targeted, no products
  const producer2Id = crypto.randomUUID();
  const producer3UserId = crypto.randomUUID(); // owns the bulk-inquiry product
  const producer3Id = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const bulkProductId = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();
  const bulkInquiryId = crypto.randomUUID();

  const allUserIds = [clientUserId, otherClientUserId, producer1UserId, producer2UserId, producer3UserId, adminUserId];
  const allProducerIds = [producer1Id, producer2Id, producer3Id];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `pqa-client-${clientUserId}@example.test`, phone: "+48000000001", role: "client" },
      { id: otherClientUserId, email: `pqa-other-client-${otherClientUserId}@example.test`, phone: "+48000000002", role: "client" },
      { id: producer1UserId, email: `pqa-producer1-${producer1UserId}@example.test`, phone: "+48000000003", role: "producer" },
      { id: producer2UserId, email: `pqa-producer2-${producer2UserId}@example.test`, phone: "+48000000004", role: "producer" },
      { id: producer3UserId, email: `pqa-producer3-${producer3UserId}@example.test`, phone: "+48000000005", role: "producer" },
      { id: adminUserId, email: `pqa-admin-${adminUserId}@example.test`, phone: "+48000000006", role: "admin" },
    ]);
    await db.insert(client).values([
      { id: clientId, userId: clientUserId },
      { id: otherClientId, userId: otherClientUserId },
    ]);
    await db.insert(producer).values([
      { id: producer1Id, userId: producer1UserId, nip: `PQA1${producer1Id.slice(0, 7)}`, name: "Project Quote Producer 1", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer2Id, userId: producer2UserId, nip: `PQA2${producer2Id.slice(0, 7)}`, name: "Project Quote Producer 2 (not targeted)", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer3Id, userId: producer3UserId, nip: `PQA3${producer3Id.slice(0, 7)}`, name: "Project Quote Producer 3 (bulk product owner)", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(product).values({ id: bulkProductId, producerId: producer3Id, family: "dom", status: "published", name: "PQA Bulk Product" });
    await db.insert(projectRequest).values({
      id: projectRequestId,
      contactName: "Project Quote Investor",
      contactEmail: `pqa-investor-${projectRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCountMin: 12,
      status: "open",
    });
    await db.insert(projectRequestTargetProducer).values({ projectRequestId, producerId: producer1Id, status: "invited" });
    await db.insert(bulkProductInquiry).values({
      id: bulkInquiryId,
      productId: bulkProductId,
      contactName: "Bulk Investor",
      contactEmail: `pqa-bulk-${bulkInquiryId}@example.test`,
      unitCountMin: 20,
      deliveryCountryCode: "PL",
      status: "open",
    });
  });

  afterAll(async () => {
    await db.delete(projectQuote).where(inArray(projectQuote.producerId, allProducerIds));
    await db.delete(projectRequestTargetProducer).where(eq(projectRequestTargetProducer.projectRequestId, projectRequestId));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, bulkInquiryId));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(product).where(eq(product.id, bulkProductId));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, allProducerIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(client).where(inArray(client.id, [clientId, otherClientId]));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  afterEach(async () => {
    authMock.mockReset();
    signInMock.mockReset();
    signInMock.mockResolvedValue(undefined);
    trackEventMock.mockClear();
    captureErrorMock.mockClear();

    // Every test starts from the same clean baseline.
    await db.delete(projectQuote).where(inArray(projectQuote.producerId, allProducerIds));
    await db.update(projectRequest).set({ status: "open" }).where(eq(projectRequest.id, projectRequestId));
    await db.update(projectRequestTargetProducer).set({ status: "invited", viewedAt: null }).where(eq(projectRequestTargetProducer.projectRequestId, projectRequestId));
    await db.update(bulkProductInquiry).set({ status: "open" }).where(eq(bulkProductInquiry.id, bulkInquiryId));
    await db.update(client).set({ nip: null, companyName: null, b2bVerificationStatus: "not_submitted" }).where(inArray(client.id, [clientId, otherClientId]));
    await db.update(producerCapacityProfile).set({ volumeVerificationStatus: "not_submitted" }).where(inArray(producerCapacityProfile.producerId, allProducerIds));
    await db.delete(pendingRegistration).where(eq(pendingRegistration.email, "pqa-new-contact@example.test"));
    await db.delete(users).where(eq(users.email, "pqa-new-contact@example.test"));
  });

  describe("submitProjectQuote", () => {
    it("rejects with no session, writes nothing", async () => {
      authMock.mockResolvedValue(null);

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
      const rows = await db.select().from(projectQuote).where(eq(projectQuote.projectRequestId, projectRequestId));
      expect(rows).toHaveLength(0);
    });

    it("rejects a client session", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
    });

    it("rejects input with both projectRequestId and bulkProductInquiryId set", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, bulkProductInquiryId: bulkInquiryId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
    });

    it("rejects input with neither projectRequestId nor bulkProductInquiryId set", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
    });

    // AC-3: only a producer with a project_request_target_producer row may quote.
    it("rejects a producer with no project_request_target_producer row for this request", async () => {
      authMock.mockResolvedValue(sessionAs(producer2UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie jesteś przypisany/);
    });

    // AC-5: only the owner of the referenced product may quote a bulk inquiry.
    it("rejects a producer that does not own the bulk inquiry's product", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ bulkProductInquiryId: bulkInquiryId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono zapytania/);
    });

    it("creates an active quote for a project_request, flips its status to quoted, sends a login-link email", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 1250000, unitPriceEur: 100000, proposedLeadTimeWeeks: 16 });

      expect(result.ok).toBe(true);
      const [quote] = await db.select().from(projectQuote).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producer1Id)));
      expect(quote).toMatchObject({ status: "active", totalPriceCents: 125000000, unitPriceCents: 10000000 });
      const [requestRow] = await db.select({ status: projectRequest.status }).from(projectRequest).where(eq(projectRequest.id, projectRequestId));
      expect(requestRow.status).toBe("quoted");
      const [targetRow] = await db.select({ status: projectRequestTargetProducer.status }).from(projectRequestTargetProducer).where(and(eq(projectRequestTargetProducer.projectRequestId, projectRequestId), eq(projectRequestTargetProducer.producerId, producer1Id)));
      expect(targetRow.status).toBe("quoted");
      expect(signInMock).toHaveBeenCalledWith("resend", expect.objectContaining({ redirect: false, redirectTo: "/pl/panel" }));
      expect(trackEventMock).toHaveBeenCalledWith("project_quote_submitted", expect.any(Object), producer1UserId);
    });

    it("creates an active quote for a bulk_product_inquiry owned by the caller, flips its status to quoted", async () => {
      authMock.mockResolvedValue(sessionAs(producer3UserId, "producer"));

      const result = await submitProjectQuote({ bulkProductInquiryId: bulkInquiryId, totalPriceEur: 800000 });

      expect(result.ok).toBe(true);
      const [quote] = await db.select().from(projectQuote).where(and(eq(projectQuote.bulkProductInquiryId, bulkInquiryId), eq(projectQuote.producerId, producer3Id)));
      expect(quote.status).toBe("active");
      const [inquiryRow] = await db.select({ status: bulkProductInquiry.status }).from(bulkProductInquiry).where(eq(bulkProductInquiry.id, bulkInquiryId));
      expect(inquiryRow.status).toBe("quoted");
    });

    // AC-3: a revision from the same producer supersedes the prior active quote.
    it("a second quote from the same producer on the same request supersedes the first", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await submitProjectQuote({ projectRequestId, totalPriceEur: 1000000 });

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 1100000 });

      expect(result.ok).toBe(true);
      const rows = await db.select({ status: projectQuote.status }).from(projectQuote).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producer1Id)));
      expect(rows).toHaveLength(2);
      expect(rows.filter((row) => row.status === "active")).toHaveLength(1);
      expect(rows.filter((row) => row.status === "superseded")).toHaveLength(1);
    });

    it("refuses a new quote once one has already been accepted for this request", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await submitProjectQuote({ projectRequestId, totalPriceEur: 1000000 });
      await db.update(projectQuote).set({ status: "accepted" }).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producer1Id)));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 1200000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/już przyjął/);
    });

    // AC-11: a contact with no existing account gets staged for the magic
    // link's createUser branch (auth.ts) to succeed.
    it("stages a pending_registration for a contact email with no existing account (AC-11)", async () => {
      const newContactRequestId = crypto.randomUUID();
      await db.insert(projectRequest).values({
        id: newContactRequestId,
        contactName: "Brand New Contact",
        contactEmail: "pqa-new-contact@example.test",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 12,
        status: "open",
      });
      await db.insert(projectRequestTargetProducer).values({ projectRequestId: newContactRequestId, producerId: producer1Id, status: "invited" });
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId: newContactRequestId, totalPriceEur: 900000 });

      expect(result.ok).toBe(true);
      const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, "pqa-new-contact@example.test"));
      expect(pending).toMatchObject({ role: "client", payload: { name: "Brand New Contact", phone: "" } });

      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, newContactRequestId));
      await db.delete(projectRequestTargetProducer).where(eq(projectRequestTargetProducer.projectRequestId, newContactRequestId));
      await db.delete(projectRequest).where(eq(projectRequest.id, newContactRequestId));
    });

    it("does not create a pending_registration for a contact email that already has an account", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 900000 });

      expect(result.ok).toBe(true);
      const [requestRow] = await db.select({ email: projectRequest.contactEmail }).from(projectRequest).where(eq(projectRequest.id, projectRequestId));
      // The fixture's contactEmail was never registered either, so assert
      // against the client fixture's own (already-registered) email instead.
      const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, `pqa-client-${clientUserId}@example.test`));
      expect(pending).toBeUndefined();
      expect(requestRow.email).not.toBe(`pqa-client-${clientUserId}@example.test`);
    });

    // The email step is best-effort (spec 0037 API surface): a failure there
    // must not undo the already-saved quote.
    it("still returns ok:true when the login-link email step fails with an AuthError", async () => {
      signInMock.mockRejectedValue(new FakeAuthError("send failed"));
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 900000 });

      expect(result.ok).toBe(true);
      expect(captureErrorMock).toHaveBeenCalledWith(expect.any(FakeAuthError), expect.objectContaining({ path: "submitProjectQuote:notifyContact" }));
    });
  });

  describe("markProjectRequestViewedOrDeclined", () => {
    it("rejects with no session", async () => {
      authMock.mockResolvedValue(null);

      const result = await markProjectRequestViewedOrDeclined(projectRequestId, "viewed");

      expect(result.ok).toBe(false);
    });

    it("rejects a producer with no target row for this request", async () => {
      authMock.mockResolvedValue(sessionAs(producer2UserId, "producer"));

      const result = await markProjectRequestViewedOrDeclined(projectRequestId, "viewed");

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono zapytania/);
    });

    it("sets status to viewed and stamps viewedAt for the owning producer", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await markProjectRequestViewedOrDeclined(projectRequestId, "viewed");

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(projectRequestTargetProducer).where(and(eq(projectRequestTargetProducer.projectRequestId, projectRequestId), eq(projectRequestTargetProducer.producerId, producer1Id)));
      expect(row.status).toBe("viewed");
      expect(row.viewedAt).not.toBeNull();
    });

    it("sets status to declined without requiring a prior view", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await markProjectRequestViewedOrDeclined(projectRequestId, "declined");

      expect(result.ok).toBe(true);
      const [row] = await db.select({ status: projectRequestTargetProducer.status }).from(projectRequestTargetProducer).where(and(eq(projectRequestTargetProducer.projectRequestId, projectRequestId), eq(projectRequestTargetProducer.producerId, producer1Id)));
      expect(row.status).toBe("declined");
    });
  });

  describe("acceptProjectQuote", () => {
    async function insertActiveQuote(producerId: string, totalPriceCents = 1000000) {
      const [inserted] = await db
        .insert(projectQuote)
        .values({ projectRequestId, producerId, totalPriceCents, status: "active" })
        .returning({ id: projectQuote.id });
      return inserted.id;
    }

    it("rejects with no session", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(null);

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(false);
      const [row] = await db.select({ status: projectQuote.status }).from(projectQuote).where(eq(projectQuote.id, quoteId));
      expect(row.status).toBe("active");
    });

    it("rejects a producer session", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(false);
    });

    it("rejects a client that does not own the parent project_request", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(otherClientUserId, "client"));

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);
    });

    // AC-9: acceptance is gated on b2bVerificationStatus = 'approved'.
    it("rejects acceptance when the client's B2B verification is not approved", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/weryfikacja B2B/);

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });

    // AC-9: accepting one quote rejects every other active quote on the same request.
    it("accepts one active quote and rejects the other active quote on the same request", async () => {
      const acceptedQuoteId = await insertActiveQuote(producer1Id);
      const rejectedQuoteId = await insertActiveQuote(producer2Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      await db.update(client).set({ b2bVerificationStatus: "approved" }).where(eq(client.id, clientId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await acceptProjectQuote(acceptedQuoteId);

      expect(result.ok).toBe(true);
      const [accepted] = await db.select({ status: projectQuote.status }).from(projectQuote).where(eq(projectQuote.id, acceptedQuoteId));
      const [rejected] = await db.select({ status: projectQuote.status }).from(projectQuote).where(eq(projectQuote.id, rejectedQuoteId));
      expect(accepted.status).toBe("accepted");
      expect(rejected.status).toBe("rejected");
      const [requestRow] = await db.select({ status: projectRequest.status }).from(projectRequest).where(eq(projectRequest.id, projectRequestId));
      expect(requestRow.status).toBe("accepted");
      expect(trackEventMock).toHaveBeenCalledWith("project_quote_accepted", { quoteId: acceptedQuoteId }, clientUserId);

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });

    it("a repeated accept on an already-accepted quote is idempotent", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      await db.update(client).set({ b2bVerificationStatus: "approved" }).where(eq(client.id, clientId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
      await acceptProjectQuote(quoteId);
      trackEventMock.mockClear();

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(true);
      expect(trackEventMock).not.toHaveBeenCalled();

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });

    it("returns a readable race error for a quote that is no longer active (e.g. superseded)", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      await db.update(projectQuote).set({ status: "superseded" }).where(eq(projectQuote.id, quoteId));
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      await db.update(client).set({ b2bVerificationStatus: "approved" }).where(eq(client.id, clientId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await acceptProjectQuote(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nie jest już aktywna/);

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });
  });

  describe("updateProducerCapacityProfile", () => {
    it("rejects with no session", async () => {
      authMock.mockResolvedValue(null);

      const result = await updateProducerCapacityProfile({ unitsPerMonth: 10 });

      expect(result.ok).toBe(false);
    });

    it("rejects a client session", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await updateProducerCapacityProfile({ unitsPerMonth: 10 });

      expect(result.ok).toBe(false);
    });

    it("creates a new profile with defaulted jsonb fields on first submission", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await updateProducerCapacityProfile({ unitsPerMonth: 12, leadTimeTiers: [{ units: 10, weeks: 8 }] });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producer1Id));
      expect(row.unitsPerMonth).toBe(12);
      expect(row.leadTimeTiers).toEqual([{ units: 10, weeks: 8 }]);
      expect(row.certifications).toEqual([]);
    });

    it("updates an existing profile (upsert) without resetting volumeVerificationStatus", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await updateProducerCapacityProfile({ unitsPerMonth: 12 });
      await db.update(producerCapacityProfile).set({ volumeVerificationStatus: "approved" }).where(eq(producerCapacityProfile.producerId, producer1Id));

      const result = await updateProducerCapacityProfile({ unitsPerMonth: 30, certifications: ["ISO 9001"] });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producer1Id));
      expect(row.unitsPerMonth).toBe(30);
      expect(row.certifications).toEqual(["ISO 9001"]);
      expect(row.volumeVerificationStatus).toBe("approved");
    });
  });

  describe("submitClientB2bDetails", () => {
    it("rejects with no session", async () => {
      authMock.mockResolvedValue(null);

      const result = await submitClientB2bDetails({ nip: "1234567890", companyName: "Acme" });

      expect(result.ok).toBe(false);
    });

    it("rejects a producer session", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitClientB2bDetails({ nip: "1234567890", companyName: "Acme" });

      expect(result.ok).toBe(false);
    });

    it("rejects a blank NIP", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await submitClientB2bDetails({ nip: "   ", companyName: "Acme" });

      expect(result.ok).toBe(false);
    });

    // AC-8: submitting NIP + company name moves the status to pending.
    it("stores nip and companyName and moves b2bVerificationStatus to pending", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await submitClientB2bDetails({ nip: "1234567890", companyName: "Lammert Holding" });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(client).where(eq(client.id, clientId));
      expect(row).toMatchObject({ nip: "1234567890", companyName: "Lammert Holding", b2bVerificationStatus: "pending" });
    });

    it("moves the status back to pending on resubmission after a rejection", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
      await submitClientB2bDetails({ nip: "1234567890", companyName: "Lammert Holding" });
      await db.update(client).set({ b2bVerificationStatus: "rejected" }).where(eq(client.id, clientId));

      const result = await submitClientB2bDetails({ nip: "9876543210", companyName: "Lammert Holding BV" });

      expect(result.ok).toBe(true);
      const [row] = await db.select({ b2bVerificationStatus: client.b2bVerificationStatus }).from(client).where(eq(client.id, clientId));
      expect(row.b2bVerificationStatus).toBe("pending");
    });
  });

  describe("linkRequestsToClientOnLogin (AC-7)", () => {
    it("links a project_request with a matching, unlinked contactEmail to the client", async () => {
      const email = `pqa-link-${crypto.randomUUID()}@example.test`;
      const [inserted] = await db
        .insert(projectRequest)
        .values({ contactName: "Link Me", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 10 })
        .returning({ id: projectRequest.id });

      await linkRequestsToClientOnLogin(email, clientId);

      const [row] = await db.select({ clientId: projectRequest.clientId }).from(projectRequest).where(eq(projectRequest.id, inserted.id));
      expect(row.clientId).toBe(clientId);

      await db.delete(projectRequest).where(eq(projectRequest.id, inserted.id));
    });

    it("links a bulk_product_inquiry with a matching, unlinked contactEmail to the client", async () => {
      const email = `pqa-link-${crypto.randomUUID()}@example.test`;
      const [inserted] = await db
        .insert(bulkProductInquiry)
        .values({ productId: bulkProductId, contactName: "Link Me Too", contactEmail: email, unitCountMin: 15, deliveryCountryCode: "PL" })
        .returning({ id: bulkProductInquiry.id });

      await linkRequestsToClientOnLogin(email, clientId);

      const [row] = await db.select({ clientId: bulkProductInquiry.clientId }).from(bulkProductInquiry).where(eq(bulkProductInquiry.id, inserted.id));
      expect(row.clientId).toBe(clientId);

      await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inserted.id));
    });

    it("does not steal a request already linked to a different client", async () => {
      const email = `pqa-link-${crypto.randomUUID()}@example.test`;
      const [inserted] = await db
        .insert(projectRequest)
        .values({ contactName: "Already Linked", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 10, clientId: otherClientId })
        .returning({ id: projectRequest.id });

      await linkRequestsToClientOnLogin(email, clientId);

      const [row] = await db.select({ clientId: projectRequest.clientId }).from(projectRequest).where(eq(projectRequest.id, inserted.id));
      expect(row.clientId).toBe(otherClientId);

      await db.delete(projectRequest).where(eq(projectRequest.id, inserted.id));
    });

    it("is a no-op when no request matches the email", async () => {
      await expect(linkRequestsToClientOnLogin(`pqa-no-match-${crypto.randomUUID()}@example.test`, clientId)).resolves.not.toThrow();
    });
  });

  describe("setProducerVolumeVerification / setClientB2bVerification", () => {
    it("rejects a non-admin session for both", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      expect((await setProducerVolumeVerification(producer1Id, "approved")).ok).toBe(false);
      expect((await setClientB2bVerification(clientId, "approved")).ok).toBe(false);
    });

    it("approves a producer's capacity profile", async () => {
      await db.insert(producerCapacityProfile).values({ producerId: producer1Id }).onConflictDoNothing();
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await setProducerVolumeVerification(producer1Id, "approved");

      expect(result.ok).toBe(true);
      const [row] = await db.select({ status: producerCapacityProfile.volumeVerificationStatus }).from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producer1Id));
      expect(row.status).toBe("approved");
    });

    it("returns not-found for a producer with no capacity profile row", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await setProducerVolumeVerification(crypto.randomUUID(), "approved");

      expect(result.ok).toBe(false);
    });

    it("approves a client's B2B verification", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await setClientB2bVerification(clientId, "approved");

      expect(result.ok).toBe(true);
      const [row] = await db.select({ status: client.b2bVerificationStatus }).from(client).where(eq(client.id, clientId));
      expect(row.status).toBe("approved");
    });
  });
});
