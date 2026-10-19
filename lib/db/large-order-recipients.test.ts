import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { getProducerUserEmails } from "./large-order-recipients";
import { producer, producerMember, users } from "./schema";

// Spec 0057 + 0070: maile o dużych zamówieniach idą do właściciela i do wszystkich członków
// firmy producenta, bez duplikatów. Prawdziwa baza dev.
describe.skipIf(!process.env.DATABASE_URL)("getProducerUserEmails: owner plus members", () => {
  const ownerId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const otherOwnerId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const email = (id: string) => `lor-${id}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: ownerId, email: email(ownerId), phone: "+48000000601", role: "producer" },
      { id: memberId, email: email(memberId), phone: "+48000000602", role: "producer" },
      { id: otherOwnerId, email: email(otherOwnerId), phone: "+48000000604", role: "producer" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: ownerId, nip: `LOR${producerId.slice(0, 7)}`, name: "LOR A", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: otherProducerId, userId: otherOwnerId, nip: `LOR${otherProducerId.slice(0, 7)}`, name: "LOR B", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    // Właściciel jest też członkiem (dual write spec 0057), do tego dwóch kolejnych członków.
    await db.insert(producerMember).values([
      { producerId, userId: ownerId },
      { producerId, userId: memberId },
    ]);
  });

  afterAll(async () => {
    await db.delete(producerMember).where(inArray(producerMember.producerId, [producerId, otherProducerId]));
    await db.delete(producer).where(inArray(producer.id, [producerId, otherProducerId]));
  });

  it("returns the owner and every member once", async () => {
    const result = await getProducerUserEmails([producerId]);

    expect(result.map((row) => row.email).sort()).toEqual([email(ownerId), email(memberId)].sort());
    expect(result.every((row) => row.producerId === producerId)).toBe(true);
  });

  it("returns a producer without members through the owner and keeps producers apart", async () => {
    const result = await getProducerUserEmails([producerId, otherProducerId]);

    expect(result.filter((row) => row.producerId === otherProducerId).map((row) => row.email)).toEqual([email(otherOwnerId)]);
  });

  it("returns nothing for an empty list", async () => {
    expect(await getProducerUserEmails([])).toEqual([]);
  });
});
