import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Te same granice co lib/producer-certification-actions.test.ts: auth i observability
// są mockami, baza jest prawdziwa (wyłącznie projekt dev).
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, producerMember, users } from "@/lib/db/schema";
import { updateProducerCompany } from "./producer-company-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0074 AC-11, AC-15.
describe.skipIf(!process.env.DATABASE_URL)("lib/producer-company-actions: real DB, mocked auth", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const allUserIds = [producerUserId, otherUserId, clientUserId];
  const allProducerIds = [producerId, otherProducerId];

  async function load(id: string) {
    const [row] = await db.select().from(producer).where(eq(producer.id, id));
    return row;
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `pco-a-${producerUserId}@example.test`, phone: "+48000000041", role: "producer" },
      { id: otherUserId, email: `pco-b-${otherUserId}@example.test`, phone: "+48000000042", role: "producer" },
      { id: clientUserId, email: `pco-c-${clientUserId}@example.test`, phone: "+48000000043", role: "client" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: producerUserId, nip: `PCO1${producerId.slice(0, 7)}`, name: "Stara Nazwa", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: otherProducerId, userId: otherUserId, nip: `PCO2${otherProducerId.slice(0, 7)}`, name: "Cudza Firma", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId, userId: producerUserId },
      { producerId: otherProducerId, userId: otherUserId },
    ]);
  });

  afterEach(() => {
    authMock.mockReset();
  });

  afterAll(async () => {
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducerIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [...allProducerIds, ...allUserIds]));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  it("rejects a caller who is not a logged-in producer", async () => {
    authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
    const result = await updateProducerCompany({ name: "Hakerska Nazwa", technology: "beton-modulowy" });

    expect(result.ok).toBe(false);
    expect((await load(producerId)).name).toBe("Stara Nazwa");
  });

  it("returns field errors for a one character name and an unknown technology, without writing", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const tooShort = await updateProducerCompany({ name: " A ", technology: "beton-modulowy" });
    const badTechnology = await updateProducerCompany({
      name: "Poprawna Nazwa",
      technology: "magia",
    });

    expect(tooShort.ok).toBe(false);
    expect(tooShort.fieldErrors?.name).toBeTruthy();
    expect(badTechnology.ok).toBe(false);
    expect(badTechnology.fieldErrors?.technology).toBeTruthy();
    expect((await load(producerId)).name).toBe("Stara Nazwa");
  });

  it("saves a trimmed name and technology for the session's producer only, with the actor in the audit log", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await updateProducerCompany({ name: "  Nowa Nazwa Sp. z o.o.  ", technology: "plyta-warstwowa-sip" });

    expect(result).toEqual({ ok: true });
    const mine = await load(producerId);
    expect(mine).toMatchObject({ name: "Nowa Nazwa Sp. z o.o.", technology: "plyta-warstwowa-sip" });
    expect(mine.nip.startsWith("PCO1")).toBe(true);
    expect(mine.verificationStatus).toBe("not_submitted");
    expect(await load(otherProducerId)).toMatchObject({ name: "Cudza Firma", technology: "szkielet-drewniany" });

    const audits = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.tableName, "producer"), eq(auditLog.recordId, producerId), eq(auditLog.actorUserId, producerUserId)));
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });
});
