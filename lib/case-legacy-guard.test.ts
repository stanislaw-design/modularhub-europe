import { eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Ten sam układ mocków co lib/offer-actions.test.ts: @/auth i observability
// nie działają pod zwykłym Vitest, reszta idzie do prawdziwej bazy dev.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn() }));

import { db } from "@/lib/db/client";
import { getInquiriesForProducer, getInquiryDetailForProducer } from "@/lib/db/queries";
import { auditLog, client, inquiry, inquiryItem, offer, producer, product, users } from "@/lib/db/schema";
import { submitOffer } from "./offer-actions";

function sessionAs(userId: string, role: "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0048 AC-4, AC-34: sprawa nowego przepływu jest niewidoczna dla
// producenta wybranego modelu i nie da się na nią złożyć oferty starą ścieżką.
describe.skipIf(!process.env.DATABASE_URL)("legacy_direct guard: stare zapytania i akcje producenta", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const legacyInquiryId = crypto.randomUUID();
  const caseInquiryId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `lg-client-${clientUserId}@example.test`, phone: "+48000000011", role: "client" },
      { id: producerUserId, email: `lg-producer-${producerUserId}@example.test`, phone: "+48000000012", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `LG${producerId.slice(0, 8)}`,
      name: "Legacy Guard Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db
      .insert(product)
      .values({ id: productId, producerId, family: "dom", status: "published", name: "Legacy Guard Product" });

    const base = {
      clientId,
      name: "Legacy Guard Client",
      email: `lg-client-${clientUserId}@example.test`,
      phone: "+48000000011",
      deliveryCountryCode: "PL",
    };
    await db.insert(inquiry).values([
      { ...base, id: legacyInquiryId, stage: "legacy_direct", idempotencyKey: `lg-legacy-${legacyInquiryId}` },
      { ...base, id: caseInquiryId, stage: "nowe", idempotencyKey: `lg-case-${caseInquiryId}` },
    ]);
    await db.insert(inquiryItem).values([
      { inquiryId: legacyInquiryId, productId },
      { inquiryId: caseInquiryId, productId },
    ]);
  });

  afterAll(async () => {
    const inquiryIds = [legacyInquiryId, caseInquiryId];
    await db.delete(offer).where(inArray(offer.inquiryId, inquiryIds));
    await db.delete(inquiryItem).where(inArray(inquiryItem.inquiryId, inquiryIds));
    await db.delete(inquiry).where(inArray(inquiry.id, inquiryIds));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(inArray(users.id, [clientUserId, producerUserId]));
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [...inquiryIds, producerUserId, clientUserId, producerId, clientId, productId]));
  });

  it("getInquiriesForProducer zwraca tylko sprawy legacy_direct", async () => {
    const rows = await getInquiriesForProducer(producerId);
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(legacyInquiryId);
    expect(ids).not.toContain(caseInquiryId);
  });

  it("getInquiryDetailForProducer nie zwraca sprawy nowego przepływu", async () => {
    expect(await getInquiryDetailForProducer(legacyInquiryId, producerId)).not.toBeNull();
    expect(await getInquiryDetailForProducer(caseInquiryId, producerId)).toBeNull();
  });

  it("submitOffer nie pozwala złożyć oferty na sprawę nowego przepływu", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await submitOffer({
      inquiryId: caseInquiryId,
      items: [{ productId, housePriceEur: 100000 }],
      transportPriceEur: 1000,
      installationPriceEur: 1000,
    });
    expect(result.ok).toBe(false);
    const offers = await db.select({ id: offer.id }).from(offer).where(eq(offer.inquiryId, caseInquiryId));
    expect(offers).toHaveLength(0);
  });
});
