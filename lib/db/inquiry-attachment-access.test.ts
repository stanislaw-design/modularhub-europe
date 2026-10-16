import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { canProducerSeeInquiryAttachments } from "./inquiry-attachment-access";
import {
  bulkProductInquiry,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  projectRequestProducerOverride,
  users,
} from "./schema";

// Spec 0070 AC-31: kto z producentów widzi pliki inwestora. Prawdziwa baza dev.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/inquiry-attachment-access: producer visibility", () => {
  const owner = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const other = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const productId = crypto.randomUUID();
  const requestIds: string[] = [];
  const inquiryIds: string[] = [];

  beforeAll(async () => {
    for (const [label, who] of [["own", owner], ["oth", other]] as const) {
      await db.insert(users).values({ id: who.userId, email: `iaa-${label}-${who.userId}@example.test`, phone: "+48000000061", role: "producer" });
      await db.insert(producer).values({ id: who.producerId, userId: who.userId, nip: `IA${label.slice(0, 1)}${who.producerId.slice(0, 8)}`, name: `IAA ${label}`, countryCode: "PL", technology: "szkielet-drewniany" });
      await db.insert(producerMember).values({ producerId: who.producerId, userId: who.userId });
    }
    await db.insert(producerCapacityProfile).values({ producerId: owner.producerId, volumeVerificationStatus: "approved" });
    await db.insert(product).values({ id: productId, producerId: owner.producerId, family: "dom", status: "published", name: "IAA Product" });
  });

  afterAll(async () => {
    for (const id of requestIds) {
      await db.delete(projectRequestProducerOverride).where(eq(projectRequestProducerOverride.projectRequestId, id));
      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, id));
      await db.delete(projectRequest).where(eq(projectRequest.id, id));
    }
    for (const id of inquiryIds) {
      await db.delete(projectQuote).where(eq(projectQuote.bulkProductInquiryId, id));
      await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, id));
    }
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, owner.producerId));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [owner.producerId, other.producerId]));
    await db.delete(producer).where(inArray(producer.id, [owner.producerId, other.producerId]));
    await db.delete(users).where(inArray(users.id, [owner.userId, other.userId]));
  });

  async function newRequest(status: "open" | "closed" | "accepted" = "open"): Promise<string> {
    const [row] = await db
      .insert(projectRequest)
      .values({
        contactName: "IAA", contactEmail: `iaa-${crypto.randomUUID()}@example.test`, countryCode: "PL", projectType: "resort", families: ["dom"], unitCount: 10, status,
        ...(status === "closed" ? { closedAt: new Date(), closedReason: "staff_closed" as const } : {}),
      })
      .returning({ id: projectRequest.id });
    requestIds.push(row.id);
    return row.id;
  }

  async function newInquiry(status: "open" | "closed" = "open"): Promise<string> {
    const [row] = await db
      .insert(bulkProductInquiry)
      .values({
        productId, contactName: "IAA", contactEmail: `iaa-${crypto.randomUUID()}@example.test`, unitCount: 10, deliveryCountryCode: "PL", status,
        ...(status === "closed" ? { closedAt: new Date(), closedReason: "staff_closed" as const } : {}),
      })
      .returning({ id: bulkProductInquiry.id });
    inquiryIds.push(row.id);
    return row.id;
  }

  it("lets a matched producer see an open request, not a closed one, and never an unknown one", async () => {
    const open = await newRequest();
    const closed = await newRequest("closed");

    expect(await canProducerSeeInquiryAttachments(owner.producerId, "request", open)).toBe(true);
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "request", closed)).toBe(false);
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "request", crypto.randomUUID())).toBe(false);
  });

  it("hides a request from a producer that does not match (no approved capacity profile)", async () => {
    const open = await newRequest();
    expect(await canProducerSeeInquiryAttachments(other.producerId, "request", open)).toBe(false);
  });

  it("honours the admin overrides: exclude removes a matched producer, include adds an unmatched one", async () => {
    const id = await newRequest();
    await db.insert(projectRequestProducerOverride).values({ projectRequestId: id, producerId: owner.producerId, mode: "exclude", createdByUserId: other.userId });
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "request", id)).toBe(false);

    await db.update(projectRequestProducerOverride).set({ mode: "include" }).where(eq(projectRequestProducerOverride.projectRequestId, id));
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "request", id)).toBe(true);
  });

  it("keeps access through an active offer while open, and an accepted offer after closing", async () => {
    const id = await newRequest();
    const [quote] = await db.insert(projectQuote).values({ projectRequestId: id, producerId: other.producerId, totalPriceCents: 100000 }).returning({ id: projectQuote.id });
    expect(await canProducerSeeInquiryAttachments(other.producerId, "request", id)).toBe(true);

    await db.update(projectRequest).set({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" }).where(eq(projectRequest.id, id));
    expect(await canProducerSeeInquiryAttachments(other.producerId, "request", id)).toBe(false);

    await db.update(projectQuote).set({ status: "accepted" }).where(eq(projectQuote.id, quote.id));
    expect(await canProducerSeeInquiryAttachments(other.producerId, "request", id)).toBe(true);
  });

  it("cuts off a blocked producer even with an accepted offer", async () => {
    const id = await newRequest();
    await db.insert(projectQuote).values({ projectRequestId: id, producerId: other.producerId, totalPriceCents: 100000, status: "accepted" });
    expect(await canProducerSeeInquiryAttachments(other.producerId, "request", id)).toBe(true);

    await db.update(users).set({ blockedAt: new Date() }).where(eq(users.id, other.userId));
    try {
      expect(await canProducerSeeInquiryAttachments(other.producerId, "request", id)).toBe(false);
    } finally {
      await db.update(users).set({ blockedAt: null }).where(eq(users.id, other.userId));
    }
  });

  it("for a product inquiry: only the owner of the product, while it is open", async () => {
    const open = await newInquiry();
    const closed = await newInquiry("closed");

    expect(await canProducerSeeInquiryAttachments(owner.producerId, "product", open)).toBe(true);
    expect(await canProducerSeeInquiryAttachments(other.producerId, "product", open)).toBe(false);
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "product", closed)).toBe(false);
  });

  it("does not mix the two kinds: a request id is not a product inquiry id", async () => {
    const id = await newRequest();
    expect(await canProducerSeeInquiryAttachments(owner.producerId, "product", id)).toBe(false);
  });
});
