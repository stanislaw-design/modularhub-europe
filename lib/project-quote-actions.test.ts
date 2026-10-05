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
const uploadPrivateObjectMock = vi.hoisted(() => vi.fn<() => Promise<void>>());
const buildSignedDownloadUrlMock = vi.hoisted(() => vi.fn<() => Promise<string>>());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: signInMock }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
// Prywatny R2 jest granicą I/O tak samo jak auth/observability wyżej (spec
// 0063): testy uploadProjectQuotePdf/getProjectQuotePdfUrl sprawdzają realną
// bazę (uprawnienia, status, atomowość), nie prawdziwe wgrywanie do R2.
vi.mock("@/lib/storage/private-r2-client", () => ({
  uploadPrivateObject: uploadPrivateObjectMock,
  buildSignedDownloadUrl: buildSignedDownloadUrlMock,
}));

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLog,
  bulkProductInquiry,
  client,
  document,
  pendingRegistration,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  users,
} from "@/lib/db/schema";
import {
  acceptProjectQuote,
  getProjectQuotePdfUrl,
  linkRequestsToClientOnLogin,
  setClientB2bVerification,
  setProducerVolumeVerification,
  submitClientB2bDetails,
  submitProjectQuote,
  updateProducerCapacityProfile,
  uploadProjectQuotePdf,
} from "./project-quote-actions";

function validPdfFile(filename = "wycena.pdf"): File {
  const bytes = Buffer.from("%PDF-1.7\n1 0 obj\nBT sample ET\nendobj\n%%EOF", "latin1");
  return new File([bytes], filename, { type: "application/pdf" });
}

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
  const producer1UserId = crypto.randomUUID(); // volumeVerificationStatus approved (AC-13 baseline)
  const producer1Id = crypto.randomUUID();
  const producer2UserId = crypto.randomUUID(); // no capacity profile row at all -> never approved
  const producer2Id = crypto.randomUUID();
  const producer3UserId = crypto.randomUUID(); // owns the bulk-inquiry product
  const producer3Id = crypto.randomUUID();
  const producer4UserId = crypto.randomUUID(); // second approved producer, for the AC-14 race test
  const producer4Id = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const bulkProductId = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();
  const bulkInquiryId = crypto.randomUUID();

  const allUserIds = [clientUserId, otherClientUserId, producer1UserId, producer2UserId, producer3UserId, producer4UserId, adminUserId];
  const allProducerIds = [producer1Id, producer2Id, producer3Id, producer4Id];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `pqa-client-${clientUserId}@example.test`, phone: "+48000000001", role: "client" },
      { id: otherClientUserId, email: `pqa-other-client-${otherClientUserId}@example.test`, phone: "+48000000002", role: "client" },
      { id: producer1UserId, email: `pqa-producer1-${producer1UserId}@example.test`, phone: "+48000000003", role: "producer" },
      { id: producer2UserId, email: `pqa-producer2-${producer2UserId}@example.test`, phone: "+48000000004", role: "producer" },
      { id: producer3UserId, email: `pqa-producer3-${producer3UserId}@example.test`, phone: "+48000000005", role: "producer" },
      { id: producer4UserId, email: `pqa-producer4-${producer4UserId}@example.test`, phone: "+48000000007", role: "producer" },
      { id: adminUserId, email: `pqa-admin-${adminUserId}@example.test`, phone: "+48000000006", role: "admin" },
    ]);
    await db.insert(client).values([
      { id: clientId, userId: clientUserId },
      { id: otherClientId, userId: otherClientUserId },
    ]);
    await db.insert(producer).values([
      { id: producer1Id, userId: producer1UserId, nip: `PQA1${producer1Id.slice(0, 7)}`, name: "Project Quote Producer 1", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer2Id, userId: producer2UserId, nip: `PQA2${producer2Id.slice(0, 7)}`, name: "Project Quote Producer 2 (never approved)", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer3Id, userId: producer3UserId, nip: `PQA3${producer3Id.slice(0, 7)}`, name: "Project Quote Producer 3 (bulk product owner)", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producer4Id, userId: producer4UserId, nip: `PQA4${producer4Id.slice(0, 7)}`, name: "Project Quote Producer 4 (second approved)", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: producer1Id, userId: producer1UserId },
      { producerId: producer2Id, userId: producer2UserId },
      { producerId: producer3Id, userId: producer3UserId },
      { producerId: producer4Id, userId: producer4UserId },
    ]);
    // AC-13: ścieżka project_request sprawdza volumeVerificationStatus
    // bezpośrednio, nie już przez project_request_target_producer (usunięte).
    await db.insert(producerCapacityProfile).values([
      { producerId: producer1Id, volumeVerificationStatus: "approved" },
      { producerId: producer4Id, volumeVerificationStatus: "approved" },
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
    await db.delete(document).where(inArray(document.ownerUserId, allUserIds));
    await db.delete(projectQuote).where(inArray(projectQuote.producerId, allProducerIds));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, bulkInquiryId));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(product).where(eq(product.id, bulkProductId));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, allProducerIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(client).where(inArray(client.id, [clientId, otherClientId]));
    // Spec 0064: setClientB2bVerification/setProducerVolumeVerification now
    // attribute the admin's actor_user_id, which audit_log's FK (no ON DELETE
    // behavior) then blocks deleting until the referencing rows are gone too.
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  afterEach(async () => {
    authMock.mockReset();
    signInMock.mockReset();
    signInMock.mockResolvedValue(undefined);
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    uploadPrivateObjectMock.mockReset();
    uploadPrivateObjectMock.mockResolvedValue(undefined);
    buildSignedDownloadUrlMock.mockReset();
    buildSignedDownloadUrlMock.mockResolvedValue("https://private.example.test/signed-url");

    // Every test starts from the same clean baseline: producer1/producer4
    // approved (AC-13 happy path), producer2 stays without a capacity profile
    // row at all (never approved). document rows (PDF quote uploads) must go
    // first: no ON DELETE CASCADE from document.project_quote_id, so deleting
    // the quote first would violate the FK.
    await db.delete(document).where(inArray(document.ownerUserId, allUserIds));
    await db.delete(projectQuote).where(inArray(projectQuote.producerId, allProducerIds));
    await db.update(projectRequest).set({ status: "open" }).where(eq(projectRequest.id, projectRequestId));
    await db.update(bulkProductInquiry).set({ status: "open" }).where(eq(bulkProductInquiry.id, bulkInquiryId));
    await db.update(client).set({ nip: null, companyName: null, b2bVerificationStatus: "not_submitted" }).where(inArray(client.id, [clientId, otherClientId]));
    await db.update(producerCapacityProfile).set({ volumeVerificationStatus: "approved" }).where(inArray(producerCapacityProfile.producerId, [producer1Id, producer4Id]));
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

    // AC-13: only a producer with volumeVerificationStatus = 'approved' may
    // quote a project_request; replaces the dropped project_request_target_producer gate.
    it("rejects a producer without an approved capacity profile", async () => {
      authMock.mockResolvedValue(sessionAs(producer2UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/zweryfikowany wolumenowo/);
      const rows = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producer2Id));
      expect(rows).toHaveLength(0);
    });

    // AC-13: the request itself must still be open/quoted.
    it("rejects an approved producer once the request is no longer open or quoted", async () => {
      await db.update(projectRequest).set({ status: "closed" }).where(eq(projectRequest.id, projectRequestId));
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 500000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nie jest już otwarte/);
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

    // AC-14: the already-accepted-quote guard checks the whole request, not
    // just this producer's own rows -- a second, different (also approved)
    // producer must be blocked too, closing the post-acceptance race.
    it("refuses a new quote from a different producer once ANY producer's quote on this request is accepted", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await submitProjectQuote({ projectRequestId, totalPriceEur: 1000000 });
      await db.update(projectQuote).set({ status: "accepted" }).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producer1Id)));

      authMock.mockResolvedValue(sessionAs(producer4UserId, "producer"));
      const result = await submitProjectQuote({ projectRequestId, totalPriceEur: 1100000 });

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/już przyjął/);
      const rows = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producer4Id));
      expect(rows).toHaveLength(0);
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
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await submitProjectQuote({ projectRequestId: newContactRequestId, totalPriceEur: 900000 });

      expect(result.ok).toBe(true);
      const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, "pqa-new-contact@example.test"));
      expect(pending).toMatchObject({ role: "client", payload: { name: "Brand New Contact", phone: "" } });

      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, newContactRequestId));
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
    // AC-7: contactRevealedAt is stamped on the accepted quote, in the same
    // operation, never on the rejected one.
    it("accepts one active quote and rejects the other active quote on the same request", async () => {
      const acceptedQuoteId = await insertActiveQuote(producer1Id);
      const rejectedQuoteId = await insertActiveQuote(producer2Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      await db.update(client).set({ b2bVerificationStatus: "approved" }).where(eq(client.id, clientId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await acceptProjectQuote(acceptedQuoteId);

      expect(result.ok).toBe(true);
      const [accepted] = await db.select({ status: projectQuote.status, contactRevealedAt: projectQuote.contactRevealedAt }).from(projectQuote).where(eq(projectQuote.id, acceptedQuoteId));
      const [rejected] = await db.select({ status: projectQuote.status, contactRevealedAt: projectQuote.contactRevealedAt }).from(projectQuote).where(eq(projectQuote.id, rejectedQuoteId));
      expect(accepted.status).toBe("accepted");
      expect(accepted.contactRevealedAt).not.toBeNull();
      expect(rejected.status).toBe("rejected");
      expect(rejected.contactRevealedAt).toBeNull();
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

  describe("uploadProjectQuotePdf", () => {
    async function insertActiveQuote(producerId: string, totalPriceCents = 1000000) {
      const [inserted] = await db
        .insert(projectQuote)
        .values({ projectRequestId, producerId, totalPriceCents, status: "active" })
        .returning({ id: projectQuote.id });
      return inserted.id;
    }

    async function findQuotePdfDocuments(quoteId: string) {
      return db.select().from(document).where(and(eq(document.projectQuoteId, quoteId), eq(document.purpose, "project_quote_pdf")));
    }

    it("rejects with no session, uploads nothing to storage", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(null);

      const result = await uploadProjectQuotePdf(quoteId, validPdfFile());

      expect(result.ok).toBe(false);
      expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
    });

    it("rejects a client session", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await uploadProjectQuotePdf(quoteId, validPdfFile());

      expect(result.ok).toBe(false);
    });

    // AC-2, AC-10: only the producer who owns this quote may upload to it.
    it("rejects a producer that does not own the quote, without touching storage", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer3UserId, "producer"));

      const result = await uploadProjectQuotePdf(quoteId, validPdfFile());

      expect(result.ok).toBe(false);
      expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
      expect(await findQuotePdfDocuments(quoteId)).toHaveLength(0);
    });

    // AC-2: a quote that is no longer active (e.g. already superseded) refuses the upload.
    it("rejects once the quote is no longer active, without touching storage", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      await db.update(projectQuote).set({ status: "superseded" }).where(eq(projectQuote.id, quoteId));
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await uploadProjectQuotePdf(quoteId, validPdfFile());

      expect(result.ok).toBe(false);
      expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
    });

    // AC-4: validation runs before anything is sent to storage.
    it("rejects a file without a valid PDF signature, without touching storage", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      const badFile = new File([Buffer.from("not-a-pdf")], "fake.pdf", { type: "application/pdf" });

      const result = await uploadProjectQuotePdf(quoteId, badFile);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/sygnatury PDF/);
      expect(uploadPrivateObjectMock).not.toHaveBeenCalled();
    });

    it("uploads a valid PDF and creates a document row owned by the uploading producer", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await uploadProjectQuotePdf(quoteId, validPdfFile("oferta.pdf"));

      expect(result.ok).toBe(true);
      expect(result.documentId).toBeDefined();
      expect(uploadPrivateObjectMock).toHaveBeenCalledTimes(1);
      const rows = await findQuotePdfDocuments(quoteId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ filename: "oferta.pdf", mimeType: "application/pdf", ownerUserId: producer1UserId, deletedAt: null });
      expect(trackEventMock).toHaveBeenCalledWith("project_quote_pdf_uploaded", { quoteId }, producer1UserId);
    });

    // AC-3: a second upload on the same, still-active quote replaces the first atomically.
    it("replaces a previous PDF atomically: old row soft-deleted, new row active", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      const first = await uploadProjectQuotePdf(quoteId, validPdfFile("v1.pdf"));

      const second = await uploadProjectQuotePdf(quoteId, validPdfFile("v2.pdf"));

      expect(second.ok).toBe(true);
      const rows = await findQuotePdfDocuments(quoteId);
      expect(rows).toHaveLength(2);
      const oldRow = rows.find((row) => row.id === first.documentId);
      const newRow = rows.find((row) => row.id === second.documentId);
      expect(oldRow?.deletedAt).not.toBeNull();
      expect(newRow).toMatchObject({ filename: "v2.pdf", deletedAt: null });
    });

    // AC-13: a concurrent acceptance closes the window atomically -- the
    // replace must not go through, and the existing (now-permanent) file must
    // survive untouched, not get soft-deleted without a replacement.
    it("refuses to replace once the quote was accepted concurrently, leaving the existing file intact", async () => {
      const quoteId = await insertActiveQuote(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      const first = await uploadProjectQuotePdf(quoteId, validPdfFile("v1.pdf"));
      await db.update(projectQuote).set({ status: "accepted" }).where(eq(projectQuote.id, quoteId));

      const second = await uploadProjectQuotePdf(quoteId, validPdfFile("v2.pdf"));

      expect(second.ok).toBe(false);
      expect(second.error).toMatch(/nie jest już aktywna/);
      const rows = await findQuotePdfDocuments(quoteId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: first.documentId, deletedAt: null });
    });
  });

  describe("getProjectQuotePdfUrl", () => {
    async function insertQuoteWithPdf(producerId: string) {
      const [quote] = await db.insert(projectQuote).values({ projectRequestId, producerId, totalPriceCents: 1000000, status: "active" }).returning({ id: projectQuote.id });
      await db.insert(document).values({
        r2Key: `pqa-test-${crypto.randomUUID()}.pdf`,
        filename: "wycena.pdf",
        mimeType: "application/pdf",
        sizeBytes: 123,
        purpose: "project_quote_pdf",
        ownerUserId: producerId === producer1Id ? producer1UserId : producer3UserId,
        projectQuoteId: quote.id,
      });
      return quote.id;
    }

    it("rejects with no session", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(false);
      expect(buildSignedDownloadUrlMock).not.toHaveBeenCalled();
    });

    it("returns not-found for a nonexistent quote id", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await getProjectQuotePdfUrl(crypto.randomUUID());

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);
    });

    it("returns a fresh signed url for the client who owns the parent project_request", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(true);
      expect(result.url).toBe("https://private.example.test/signed-url");
      expect(buildSignedDownloadUrlMock).toHaveBeenCalledWith(expect.any(String), 600, "wycena.pdf");

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });

    // Key invariant: a request not yet linked to any client (clientId NULL)
    // must never be treated as a match for any calling client.
    it("denies a client when the parent request's clientId is still NULL (not yet linked)", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);
      expect(buildSignedDownloadUrlMock).not.toHaveBeenCalled();
    });

    it("denies a client that does not own the parent project_request, same not-found error", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);
      await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, projectRequestId));
      authMock.mockResolvedValue(sessionAs(otherClientUserId, "client"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);

      await db.update(projectRequest).set({ clientId: null }).where(eq(projectRequest.id, projectRequestId));
    });

    it("returns a fresh signed url for the producer who owns the quote", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(true);
      expect(result.url).toBe("https://private.example.test/signed-url");
    });

    // AC-10: a different producer must never reach this quote's file, and
    // gets the exact same error as a nonexistent quote (no existence leak).
    it("denies a different producer, same not-found error, without touching storage", async () => {
      const quoteId = await insertQuoteWithPdf(producer1Id);
      authMock.mockResolvedValue(sessionAs(producer3UserId, "producer"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);
      expect(buildSignedDownloadUrlMock).not.toHaveBeenCalled();
    });

    it("returns not-found when the quote exists but has no uploaded pdf yet", async () => {
      const quoteId = await db
        .insert(projectQuote)
        .values({ projectRequestId, producerId: producer1Id, totalPriceCents: 1000000, status: "active" })
        .returning({ id: projectQuote.id })
        .then((rows) => rows[0].id);
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));

      const result = await getProjectQuotePdfUrl(quoteId);

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nie znaleziono wyceny/);
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
    });

    it("never writes certifications, which now live in producer_certification (spec 0065 AC-16)", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await updateProducerCapacityProfile({ unitsPerMonth: 12 });
      await db.update(producerCapacityProfile).set({ certifications: ["Legacy"] }).where(eq(producerCapacityProfile.producerId, producer1Id));

      await updateProducerCapacityProfile({ unitsPerMonth: 15 });

      const [row] = await db.select().from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producer1Id));
      expect(row.unitsPerMonth).toBe(15);
      expect(row.certifications).toEqual(["Legacy"]);
    });

    it("updates an existing profile (upsert) without resetting volumeVerificationStatus", async () => {
      authMock.mockResolvedValue(sessionAs(producer1UserId, "producer"));
      await updateProducerCapacityProfile({ unitsPerMonth: 12 });
      await db.update(producerCapacityProfile).set({ volumeVerificationStatus: "approved" }).where(eq(producerCapacityProfile.producerId, producer1Id));

      const result = await updateProducerCapacityProfile({ unitsPerMonth: 30 });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producer1Id));
      expect(row.unitsPerMonth).toBe(30);
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

    // Spec 0064 AC-1: `client` is audit-trigger covered, so the admin who made
    // this change must show up on the resulting audit_log row.
    it("attributes the resulting audit_log row to the acting admin (AC-1)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await setClientB2bVerification(clientId, "rejected");
      expect(result.ok).toBe(true);

      const [row] = await db
        .select({ actorUserId: auditLog.actorUserId })
        .from(auditLog)
        .where(and(eq(auditLog.tableName, "client"), eq(auditLog.recordId, clientId)))
        .orderBy(desc(auditLog.createdAt))
        .limit(1);
      expect(row?.actorUserId).toBe(adminUserId);
    });
  });
});
