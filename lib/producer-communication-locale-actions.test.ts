import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, producerMember, users } from "@/lib/db/schema";
import { setProducerCommunicationLocale, setProducerCommunicationLocaleAsAdmin } from "./producer-communication-locale-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0077 AC-29, AC-33.
describe.skipIf(!process.env.DATABASE_URL)("lib/producer-communication-locale-actions: real DB, mocked auth", () => {
  const userA = crypto.randomUUID();
  const producerA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const producerB = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const allUsers = [userA, userB, adminId, clientId];
  const allProducers = [producerA, producerB];

  async function localeOf(id: string) {
    const [row] = await db.select({ locale: producer.communicationLocale }).from(producer).where(eq(producer.id, id));
    return row.locale;
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userA, email: `cla-a-${userA}@example.test`, phone: "+48000000081", role: "producer" },
      { id: userB, email: `cla-b-${userB}@example.test`, phone: "+48000000082", role: "producer" },
      { id: adminId, email: `cla-admin-${adminId}@example.test`, phone: "+48000000083", role: "admin" },
      { id: clientId, email: `cla-c-${clientId}@example.test`, phone: "+48000000084", role: "client" },
    ]);
    await db.insert(producer).values([
      { id: producerA, userId: userA, nip: `CLA1${producerA.slice(0, 7)}`, name: "CLA A", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producerB, userId: userB, nip: `CLA2${producerB.slice(0, 7)}`, name: "CLA B", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: producerA, userId: userA },
      { producerId: producerB, userId: userB },
    ]);
  });

  afterEach(() => authMock.mockReset());

  afterAll(async () => {
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducers));
    await db.delete(producer).where(inArray(producer.id, allProducers));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUsers));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [...allProducers, ...allUsers]));
    await db.delete(users).where(inArray(users.id, allUsers));
  });

  it("existing producers default to pl (AC-33)", async () => {
    expect(await localeOf(producerA)).toBe("pl");
  });

  it("rejects a caller who is not a producer and a value outside the four languages", async () => {
    authMock.mockResolvedValue(sessionAs(clientId, "client"));
    expect((await setProducerCommunicationLocale("de")).ok).toBe(false);

    authMock.mockResolvedValue(sessionAs(userA, "producer"));
    expect((await setProducerCommunicationLocale("fr")).ok).toBe(false);
    expect(await localeOf(producerA)).toBe("pl");
  });

  it("producer sets only their own language, with the actor in the audit log", async () => {
    authMock.mockResolvedValue(sessionAs(userA, "producer"));
    expect(await setProducerCommunicationLocale("de")).toEqual({ ok: true });

    expect(await localeOf(producerA)).toBe("de");
    expect(await localeOf(producerB)).toBe("pl");
    const audits = await db.select().from(auditLog).where(eq(auditLog.recordId, producerA));
    expect(audits.some((row) => row.actorUserId === userA)).toBe(true);
  });

  it("admin sets any producer, a non admin cannot, unknown producer and bad value are refused", async () => {
    authMock.mockResolvedValue(sessionAs(userA, "producer"));
    expect((await setProducerCommunicationLocaleAsAdmin(producerB, "nl")).ok).toBe(false);
    expect(await localeOf(producerB)).toBe("pl");

    authMock.mockResolvedValue(sessionAs(adminId, "admin"));
    expect((await setProducerCommunicationLocaleAsAdmin(producerB, "fr")).ok).toBe(false);
    expect((await setProducerCommunicationLocaleAsAdmin(crypto.randomUUID(), "nl")).ok).toBe(false);
    expect((await setProducerCommunicationLocaleAsAdmin("not-a-uuid", "nl")).ok).toBe(false);
    expect(await setProducerCommunicationLocaleAsAdmin(producerB, "nl")).toEqual({ ok: true });
    expect(await localeOf(producerB)).toBe("nl");
  });
});
