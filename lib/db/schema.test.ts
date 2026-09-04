import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { auditLog, client, producer, product, users } from "./schema";

// Confirms AC-2 (spec 0018): every mutation of a personal-data table is
// captured by the Postgres trigger (drizzle/0002_audit_log_trigger.sql), not
// by application code, with personal fields redacted to a hash. Hits the real
// dev Neon database (vitest.setup.ts loads .env.local), skipped where no
// DATABASE_URL is configured. /check verify confirmed this manually on a
// disposable Neon branch; these tests lock the same behaviour in permanently
// against the real dev database.
function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail on create/update", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const userEmail = `audit-${userId}@example.test`;
  const producerNameOriginal = "Original Producer Name";
  const producerNameUpdated = "Updated Producer Name";

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      name: "Original User Name",
      email: userEmail,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `NIP${producerId.slice(0, 9)}`,
      name: producerNameOriginal,
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db
      .update(producer)
      .set({ name: producerNameUpdated })
      .where(eq(producer.id, producerId));
  });

  afterAll(async () => {
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    // users/producer are audited tables (spec 0018 Key invariants): the
    // trigger leaves rows behind on purpose. This is a test fixture, not a
    // real event, so sweep it rather than leave synthetic noise in audit_log.
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("logs exactly one create action per table on insert, not zero and not duplicated", async () => {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(inArray(auditLog.recordId, [userId, producerId]), eq(auditLog.action, "create")));

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.tableName).sort()).toEqual(["producer", "users"]);
  });

  it("redacts personal fields (name, email, nip) to their md5 hash, not plaintext", async () => {
    const [userCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, userId), eq(auditLog.action, "create")));
    const [producerCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "create")));

    expect(userCreate?.newValues?.name).toBe(md5("Original User Name"));
    expect(userCreate?.newValues?.email).toBe(md5(userEmail));
    expect(producerCreate?.newValues?.name).toBe(md5(producerNameOriginal));
    expect(producerCreate?.newValues?.nip).toBe(md5(`NIP${producerId.slice(0, 9)}`));
  });

  it("leaves non-sensitive fields (technology, country_code) as plaintext", async () => {
    const [producerCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "create")));

    expect(producerCreate?.newValues?.technology).toBe("szkielet-drewniany");
    expect(producerCreate?.newValues?.country_code).toBe("PL");
  });

  it("logs exactly one update action with redacted before/after values that differ", async () => {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "update")));

    expect(rows).toHaveLength(1);
    const [updateRow] = rows;
    expect(updateRow?.oldValues?.name).toBe(md5(producerNameOriginal));
    expect(updateRow?.newValues?.name).toBe(md5(producerNameUpdated));
    expect(updateRow?.oldValues?.name).not.toBe(updateRow?.newValues?.name);
  });

  it("does not log a row for a table outside the audited list (product)", async () => {
    const productId = crypto.randomUUID();
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Unaudited Product" });

    const rows = await db.select().from(auditLog).where(eq(auditLog.recordId, productId));
    expect(rows).toHaveLength(0);

    await db.delete(product).where(eq(product.id, productId));
  });
});

describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail on delete", () => {
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `audit-delete-${userId}@example.test`,
      phone: "+48000000000",
      role: "client",
    });
    await db.insert(client).values({ id: clientId, userId });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, clientId]));
  });

  it("logs a delete action when a personal-data row with no dependents is removed", async () => {
    await db.delete(client).where(eq(client.id, clientId));

    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, clientId), eq(auditLog.action, "delete")));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tableName).toBe("client");
    expect(rows[0]?.oldValues?.user_id).toBe(userId);
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "lib/db/schema: product FK to producer has no cascade",
  () => {
    const userId = crypto.randomUUID();
    const producerId = crypto.randomUUID();
    const productId = crypto.randomUUID();

    beforeAll(async () => {
      await db.insert(users).values({
        id: userId,
        email: `audit-fk-${userId}@example.test`,
        phone: "+48000000000",
        role: "producer",
      });
      await db.insert(producer).values({
        id: producerId,
        userId,
        nip: `NIP${producerId.slice(0, 9)}`,
        name: "FK Test Producer",
        countryCode: "PL",
        technology: "beton-modulowy",
      });
      await db.insert(product).values({ id: productId, producerId, family: "dom", name: "FK Test Product" });
    });

    afterAll(async () => {
      await db.delete(product).where(eq(product.id, productId));
      await db.delete(producer).where(eq(producer.id, producerId));
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
    });

    it("rejects deleting a producer that still has a product, leaving the product row intact", async () => {
      let caught: unknown;
      try {
        await db.delete(producer).where(eq(producer.id, producerId));
      } catch (error) {
        caught = error;
      }

      // drizzle-orm wraps the raw Postgres error; the FK detail lives on
      // `.cause`, not the top-level message, so check both.
      const topMessage = caught instanceof Error ? caught.message : String(caught);
      const causeMessage =
        caught instanceof Error && caught.cause instanceof Error ? caught.cause.message : "";
      expect(`${topMessage} ${causeMessage}`).toMatch(/foreign key constraint/i);

      const rows = await db.select().from(product).where(eq(product.id, productId));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.producerId).toBe(producerId);
    });
  },
);
