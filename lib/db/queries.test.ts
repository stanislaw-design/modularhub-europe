import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { getProductsForProducer } from "./queries";
import { auditLog, producer, product, users } from "./schema";

// Confirms AC-5 (spec 0018): a query scoped by producer_id never returns
// another producer's rows. Hits the real dev Neon database (vitest.setup.ts
// loads .env.local), skipped where no DATABASE_URL is configured.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/queries: producer isolation", () => {
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const producerAId = crypto.randomUUID();
  const producerBId = crypto.randomUUID();
  const productAId = crypto.randomUUID();
  const productBId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userAId, email: `producer-a-${userAId}@example.test`, role: "producer" },
      { id: userBId, email: `producer-b-${userBId}@example.test`, role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: producerAId,
        userId: userAId,
        nip: `A${producerAId.slice(0, 9)}`,
        name: "Producer A",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: producerBId,
        userId: userBId,
        nip: `B${producerBId.slice(0, 9)}`,
        name: "Producer B",
        countryCode: "PL",
        technology: "beton-modulowy",
      },
    ]);
    await db.insert(product).values([
      { id: productAId, producerId: producerAId, name: "Product A" },
      { id: productBId, producerId: producerBId, name: "Product B" },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.producerId, producerAId));
    await db.delete(product).where(eq(product.producerId, producerBId));
    await db.delete(producer).where(eq(producer.id, producerAId));
    await db.delete(producer).where(eq(producer.id, producerBId));
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(users).where(eq(users.id, userBId));
    // users/producer are audited tables (spec 0018 Key invariants): the
    // trigger leaves rows behind on purpose. This is a test fixture, not a
    // real event, so sweep it rather than leave synthetic noise in audit_log.
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [userAId, userBId, producerAId, producerBId]));
  });

  it("returns only the requesting producer's own products, not another producer's", async () => {
    const results = await getProductsForProducer(producerAId);

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(productAId);
    expect(results.some((row) => row.id === productBId)).toBe(false);
  });

  it("returns an empty result, not an error, for a producer with no products", async () => {
    const results = await getProductsForProducer(crypto.randomUUID());

    expect(results).toEqual([]);
  });
});
