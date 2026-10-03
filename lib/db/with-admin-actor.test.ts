import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { auditLog, users } from "./schema";
import { withAdminActor } from "./with-admin-actor";

// Spec 0064: the one shared place that sets app.actor_user_id for the audit
// trigger to read, in the same db.batch as the write(s) it should apply to.
// Tests hit the real dev database directly (no mocking: this helper's only
// job is to talk to the real driver correctly).
describe.skipIf(!process.env.DATABASE_URL)("lib/db/with-admin-actor: real DB", () => {
  const adminAId = crypto.randomUUID();
  const adminBId = crypto.randomUUID();
  const targetId = crypto.randomUUID();
  const secondTargetId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminAId, email: `waa-admin-a-${adminAId}@example.test`, phone: "+48000000040", role: "admin" },
      { id: adminBId, email: `waa-admin-b-${adminBId}@example.test`, phone: "+48000000041", role: "admin" },
      { id: targetId, email: `waa-target-${targetId}@example.test`, phone: "+48000000042", role: "producer" },
      { id: secondTargetId, email: `waa-target2-${secondTargetId}@example.test`, phone: "+48000000043", role: "producer" },
    ]);
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminAId));
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminBId));
    await db.delete(auditLog).where(eq(auditLog.recordId, targetId));
    await db.delete(auditLog).where(eq(auditLog.recordId, secondTargetId));
    await db.delete(users).where(eq(users.id, targetId));
    await db.delete(users).where(eq(users.id, secondTargetId));
    await db.delete(users).where(eq(users.id, adminAId));
    await db.delete(users).where(eq(users.id, adminBId));
  });

  it("a single statement write carries the given actor on its audit_log row", async () => {
    const [result] = await withAdminActor(adminAId, [db.update(users).set({ name: "waa single" }).where(eq(users.id, targetId))]);
    expect(result.rowCount).toBe(1);

    // The fixture insert above already fired the trigger once (unattributed,
    // action "create"), so the row to check is the newest one, not whichever
    // one Postgres happens to return first with no ORDER BY.
    const [row] = await db
      .select({ actorUserId: auditLog.actorUserId })
      .from(auditLog)
      .where(eq(auditLog.recordId, targetId))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(row?.actorUserId).toBe(adminAId);
  });

  it("a multi statement batch attributes every covered write to the same actor, in one transaction", async () => {
    await withAdminActor(adminAId, [
      db.update(users).set({ name: "waa multi 1" }).where(eq(users.id, targetId)),
      db.update(users).set({ name: "waa multi 2" }).where(eq(users.id, secondTargetId)),
    ]);

    const rows = await db
      .select({ recordId: auditLog.recordId, actorUserId: auditLog.actorUserId })
      .from(auditLog)
      .where(eq(auditLog.actorUserId, adminAId));
    const byRecord = Object.fromEntries(rows.map((r) => [r.recordId, r.actorUserId]));
    expect(byRecord[targetId]).toBe(adminAId);
    expect(byRecord[secondTargetId]).toBe(adminAId);
  });

  it("returns the same result shape and length a direct db.batch(statements) call would, with no index shift", async () => {
    const statement = db.update(users).set({ name: "waa shape check" }).where(eq(users.id, targetId));
    const [viaHelper] = await withAdminActor(adminBId, [statement]);

    const directStatement = db.update(users).set({ name: "waa shape check direct" }).where(eq(users.id, targetId));
    const [viaDirectBatch] = await db.batch([directStatement]);

    expect(Object.keys(viaHelper).sort()).toEqual(Object.keys(viaDirectBatch).sort());
    expect(viaHelper.command).toBe(viaDirectBatch.command);
  });

  it("a later call with a different actor does not leak the previous actor onto its writes", async () => {
    await withAdminActor(adminAId, [db.update(users).set({ name: "waa actor A" }).where(eq(users.id, targetId))]);
    await withAdminActor(adminBId, [db.update(users).set({ name: "waa actor B" }).where(eq(users.id, targetId))]);

    const rows = await db
      .select({ actorUserId: auditLog.actorUserId, createdAt: auditLog.createdAt })
      .from(auditLog)
      .where(eq(auditLog.recordId, targetId))
      .orderBy(auditLog.createdAt);
    const last = rows[rows.length - 1];
    expect(last?.actorUserId).toBe(adminBId);
  });

  it("rolls back the whole batch atomically when one statement fails", async () => {
    const before = await db.select({ name: users.name }).from(users).where(eq(users.id, targetId));

    await expect(
      withAdminActor(adminAId, [
        db.update(users).set({ name: "should not stick" }).where(eq(users.id, targetId)),
        // Duplicate primary key: this statement fails, which must roll back
        // the first statement in the same batch too.
        db.insert(users).values({ id: targetId, email: `waa-dup-${crypto.randomUUID()}@example.test`, phone: "+48000000044", role: "producer" }),
      ]),
    ).rejects.toThrow();

    const after = await db.select({ name: users.name }).from(users).where(eq(users.id, targetId));
    expect(after[0]?.name).toBe(before[0]?.name);
  });
});
