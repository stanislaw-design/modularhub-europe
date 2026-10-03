import { desc, eq, inArray, sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth and @/lib/observability/errors don't resolve under plain
// Vitest/jsdom (same boundary problem as lib/offer-actions.test.ts); mock
// them directly so lib/producer-block-actions.ts can even be imported.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { auditLog, producer, producerMember, users } from "@/lib/db/schema";
import { blockProducer, unblockProducer } from "./producer-block-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0064 AC-5: at least one real admin write path must have an automated
// test asserting audit_log.actor_user_id is populated and correct, so a
// future call site that forgets to wire attribution is caught by a failing
// test instead of a silent NULL.
describe.skipIf(!process.env.DATABASE_URL)("lib/producer-block-actions: audit attribution (spec 0064 AC-5)", () => {
  const adminUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `pba-admin-${adminUserId}@example.test`, phone: "+48000000010", role: "admin" },
      { id: producerUserId, email: `pba-producer-${producerUserId}@example.test`, phone: "+48000000011", role: "producer" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `PBA${producerId.slice(0, 9)}`,
      name: "Producer Block Actions Test Producer",
      countryCode: "PL",
    });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
  });

  afterEach(() => {
    authMock.mockReset();
    captureErrorMock.mockReset();
  });

  afterAll(async () => {
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    // The FK on audit_log.actor_user_id has no ON DELETE behavior (spec 0064
    // Consequences): the admin's attributed rows must go before the users row
    // they reference, or this delete fails.
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [producerUserId]));
    await db.delete(users).where(inArray(users.id, [adminUserId, producerUserId]));
  });

  it("blockProducer attributes the resulting audit_log row to the acting admin (AC-5)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const result = await blockProducer(producerId, "test reason");
    expect(result.ok).toBe(true);

    // The beforeAll fixture insert already fired the audit trigger once
    // (unattributed, action "create"), so the row to check is the newest one,
    // not the first.
    const [row] = await db
      .select({ actorUserId: auditLog.actorUserId })
      .from(auditLog)
      .where(inArray(auditLog.recordId, [producerUserId]))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(row?.actorUserId).toBe(adminUserId);

    const [blockedUser] = await db.select({ blockedBy: users.blockedBy }).from(users).where(eq(users.id, producerUserId));
    expect(blockedUser?.blockedBy).toBe(adminUserId);
  });

  it("unblockProducer also attributes its audit_log row to the acting admin", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const result = await unblockProducer(producerId);
    expect(result.ok).toBe(true);

    const [row] = await db
      .select({ actorUserId: auditLog.actorUserId })
      .from(auditLog)
      .where(inArray(auditLog.recordId, [producerUserId]))
      .orderBy(desc(auditLog.createdAt));
    expect(row?.actorUserId).toBe(adminUserId);
  });

  it("a non admin session never attributes the write (AC-2)", async () => {
    authMock.mockResolvedValue(null);

    const result = await blockProducer(producerId);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects a session whose role is not admin, not just a missing session", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));

    const result = await blockProducer(producerId);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns not-found for a producer id that does not exist, without touching audit_log", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const [{ count: before }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(eq(auditLog.actorUserId, adminUserId));

    const result = await blockProducer(crypto.randomUUID());
    expect(result.ok).toBe(false);

    const [{ count: after }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(eq(auditLog.actorUserId, adminUserId));
    expect(after).toBe(before);
  });

  it("a producer with no remaining members is a no-op and writes nothing to audit_log", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const emptyProducerUserId = crypto.randomUUID();
    const emptyProducerId = crypto.randomUUID();
    await db.insert(users).values({
      id: emptyProducerUserId,
      email: `pba-empty-${emptyProducerUserId}@example.test`,
      phone: "+48000000012",
      role: "producer",
    });
    await db.insert(producer).values({
      id: emptyProducerId,
      userId: emptyProducerUserId,
      nip: `PBAE${emptyProducerId.slice(0, 8)}`,
      name: "Producer Block Actions Empty Producer",
      countryCode: "PL",
    });
    // No producer_member row inserted on purpose: memberIds is empty.

    try {
      // Creating the fixture user above already fired the audit trigger once
      // (unattributed, action "create"); blockProducer's early return on an
      // empty member list must add nothing on top of that.
      const before = await db.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.recordId, emptyProducerUserId));

      const result = await blockProducer(emptyProducerId, "no members");
      expect(result.ok).toBe(true);

      const after = await db.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.recordId, emptyProducerUserId));
      expect(after).toHaveLength(before.length);
    } finally {
      await db.delete(producer).where(eq(producer.id, emptyProducerId));
      await db.delete(auditLog).where(eq(auditLog.recordId, emptyProducerUserId));
      await db.delete(users).where(eq(users.id, emptyProducerUserId));
    }
  });
});
