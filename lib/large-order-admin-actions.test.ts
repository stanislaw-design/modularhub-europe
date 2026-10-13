import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, projectRequest, projectRequestProducerOverride, users } from "@/lib/db/schema";
import { setProducerOverride } from "./large-order-admin-actions";

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
});
