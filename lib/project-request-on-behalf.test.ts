import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Te same granice co project-request-actions.test.ts: tylko wejścia i wyjścia na brzegu
// (analityka, sesja, maile) są podmienione, baza jest prawdziwa (dev).
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
const notifyTeamMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-team", () => ({
  notifyTeamOfNewLargeOrder: notifyTeamMock,
  notifyTeamOfClientCancelledRequest: vi.fn(),
}));
const notifyProducersNewMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-producer", () => ({
  notifyProducersOfClosedRequest: vi.fn(),
  notifyProducersOfNewLargeOrder: notifyProducersNewMock,
}));
const notifyClientMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-client", () => ({ notifyClientOfRequestOnBehalf: notifyClientMock }));
vi.mock("@/lib/project-quote-actions", () => ({ linkRequestsToClientOnLogin: vi.fn() }));

import { db } from "@/lib/db/client";
import { auditLog, bulkProductInquiry, pendingRegistration, producer, product, projectRequest, users } from "@/lib/db/schema";
import { createRequestOnBehalf, type CreateRequestOnBehalfInput } from "./project-request-actions";

const adminSession = (id: string) => ({ user: { id, role: "admin", email: "admin@example.test" } }) as unknown as Session;
const clientSession = (id: string) => ({ user: { id, role: "client", email: "c@example.test" } }) as unknown as Session;

// Spec 0070 AC-20: zapytanie w imieniu klienta.
describe.skipIf(!process.env.DATABASE_URL)("lib/project-request-actions: createRequestOnBehalf (AC-20)", () => {
  const adminId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const emails: string[] = [];

  function freshEmail(): string {
    const email = `onbehalf-${crypto.randomUUID()}@example.test`;
    emails.push(email);
    return email;
  }

  const requestInput = (email: string): CreateRequestOnBehalfInput =>
    ({
      kind: "request",
      contactName: "Jan Klient",
      contactEmail: email,
      locale: "de",
      staffConsentNote: "Zgoda ustna podczas rozmowy 2026-10-15",
      countryCode: "DE",
      projectType: "resort",
      families: ["dom"],
      unitCount: 5,
    });

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminId, email: `onbehalf-admin-${adminId}@example.test`, phone: "+48000000021", role: "admin" },
      { id: producerUserId, email: `onbehalf-prod-${producerUserId}@example.test`, phone: "+48000000022", role: "producer" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `OBH${producerId.slice(0, 9)}`,
      name: "On Behalf Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: "OBH Product" });
  });

  afterEach(async () => {
    trackEventMock.mockClear();
    notifyTeamMock.mockClear();
    notifyProducersNewMock.mockClear();
    notifyClientMock.mockClear();
    authMock.mockReset().mockResolvedValue(adminSession(adminId));
    for (const email of emails.splice(0)) {
      await db.delete(projectRequest).where(eq(projectRequest.contactEmail, email));
      await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.contactEmail, email));
      await db.delete(pendingRegistration).where(eq(pendingRegistration.email, email));
    }
  });

  afterAll(async () => {
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.productId, productId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
    // Zapytania doradcy zostawiają wpisy w audit_log z tym administratorem jako aktorem.
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it("refuses everyone who is not an admin, writes nothing", async () => {
    const email = freshEmail();
    authMock.mockResolvedValue(clientSession(crypto.randomUUID()));
    expect((await createRequestOnBehalf(requestInput(email))).ok).toBe(false);
    authMock.mockResolvedValue(null);
    expect((await createRequestOnBehalf(requestInput(email))).ok).toBe(false);
    expect(await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email))).toHaveLength(0);
  });

  it("stores the staff marker, consent note and chosen language, leaves clientId empty, mails the client in that language", async () => {
    const email = freshEmail();
    const result = await createRequestOnBehalf(requestInput(email));

    expect(result).toMatchObject({ ok: true, kind: "request" });
    const [row] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email));
    expect(row.createdByStaffUserId).toBe(adminId);
    expect(row.staffConsentNote).toBe("Zgoda ustna podczas rozmowy 2026-10-15");
    expect(row.contactLocale).toBe("de");
    expect(row.clientId).toBeNull();
    expect(row.status).toBe("open");
    expect(notifyClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "request", id: row.id, email, locale: "de", unitCount: 5 }),
    );
    expect(notifyTeamMock).toHaveBeenCalledTimes(1);
    // Spec 0070 AC-24: dopasowani producenci dostają maila także przy zapytaniu doradcy.
    expect(notifyProducersNewMock).toHaveBeenCalledTimes(1);
    // Klient bez konta dostaje oczekującą rejestrację, żeby link z maila mógł założyć konto.
    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email));
    expect(pending?.role).toBe("client");
  });

  it("requires an explicit client language, no default", async () => {
    const email = freshEmail();
    const result = await createRequestOnBehalf({ ...requestInput(email), locale: "" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/język/i);
    expect(await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email))).toHaveLength(0);
  });

  it("requires a non empty consent note", async () => {
    const email = freshEmail();
    const result = await createRequestOnBehalf({ ...requestInput(email), staffConsentNote: "   " });
    expect(result.ok).toBe(false);
    expect(await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, email))).toHaveLength(0);
  });

  it("applies the same validation as the public form (fewer than 3 homes is refused)", async () => {
    const result = await createRequestOnBehalf({ ...requestInput(freshEmail()), unitCount: 2 });
    expect(result.ok).toBe(false);
  });

  it("creates a product inquiry for a published product, and refuses an unknown one", async () => {
    const email = freshEmail();
    const base = {
      kind: "product",
      contactName: "Anna Klient",
      contactEmail: email,
      locale: "nl",
      staffConsentNote: "Zgoda mailowa",
      deliveryCountryCode: "NL",
      unitCount: 4,
    } as const;

    const refused = await createRequestOnBehalf({ ...base, productId: crypto.randomUUID() });
    expect(refused.ok).toBe(false);

    const result = await createRequestOnBehalf({ ...base, productId });
    expect(result).toMatchObject({ ok: true, kind: "product" });
    const [row] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.contactEmail, email));
    expect(row.createdByStaffUserId).toBe(adminId);
    expect(row.contactLocale).toBe("nl");
    expect(row.clientId).toBeNull();
  });

  it("is stopped by the three request limit per email with errorCode email_limit (AC-38, AC-39)", async () => {
    const email = freshEmail();
    for (let i = 0; i < 3; i += 1) expect((await createRequestOnBehalf(requestInput(email))).ok).toBe(true);

    const fourth = await createRequestOnBehalf(requestInput(email));
    expect(fourth.ok).toBe(false);
    expect(fourth.errorCode).toBe("email_limit");
  });
});
