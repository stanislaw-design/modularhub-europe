import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectRequest,
  users,
} from "@/lib/db/schema";
import { notifyProducersOfNewLargeOrder } from "./large-order-producer";

// Spec 0070 AC-24: nowe zapytanie trafia do dopasowanych producentów (zapytanie wolne) albo
// do producenta produktu (zapytanie o produkt), bez danych kontaktowych klienta. Prawdziwa
// baza dev, wysyłka maila podstawiona. Dopasowuje się też każdy prawdziwy producent z bazy,
// więc asercje patrzą tylko na adresy z fixture.
describe.skipIf(!process.env.DATABASE_URL)("lib/notifications/large-order-producer: new request (spec 0070 AC-24)", () => {
  const matching = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const unverified = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const owner = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const requestId = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const email = (userId: string) => `nro-${userId}@example.test`;
  const secretName = "Sekretny Inwestor NRO";
  const secretEmail = `nro-investor-${requestId}@example.test`;
  const allUsers = [matching, unverified, owner];
  const allProducers = allUsers.map((item) => item.producerId);

  const sentTo = (address: string) => sendMock.mock.calls.filter((call) => call[0].to === address);

  beforeAll(async () => {
    await db.insert(users).values(
      allUsers.map((item, index) => ({ id: item.userId, email: email(item.userId), phone: `+4800000050${index}`, role: "producer" as const })),
    );
    await db.insert(producer).values(
      allUsers.map((item, index) => ({
        id: item.producerId,
        userId: item.userId,
        nip: `NRO${index}${item.producerId.slice(0, 6)}`,
        name: `NRO producer ${index}`,
        countryCode: "PL",
        technology: "szkielet-drewniany" as const,
      })),
    );
    await db.insert(producerMember).values(allUsers.map((item) => ({ producerId: item.producerId, userId: item.userId })));
    await db.insert(producerCapacityProfile).values([
      { producerId: matching.producerId, volumeVerificationStatus: "approved", unitsPerMonth: 5, completionStandardsSupported: ["deweloperski"] },
      { producerId: unverified.producerId, volumeVerificationStatus: "pending", unitsPerMonth: 5, completionStandardsSupported: ["deweloperski"] },
    ]);
    await db.insert(product).values([
      { producerId: matching.producerId, family: "dom", status: "published", name: "NRO dom" },
      { producerId: unverified.producerId, family: "dom", status: "published", name: "NRO dom 2" },
      { id: productId, producerId: owner.producerId, family: "dom", status: "published", name: "NRO Model 7" },
    ]);
    await db.insert(projectRequest).values({
      id: requestId,
      contactName: secretName,
      contactEmail: secretEmail,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
    });
    await db.insert(bulkProductInquiry).values({
      id: inquiryId,
      productId,
      contactName: secretName,
      contactEmail: secretEmail,
      unitCount: 6,
      deliveryCountryCode: "PL",
    });
  });

  afterEach(() => {
    sendMock.mockClear().mockResolvedValue(true);
    captureErrorMock.mockClear();
    delete process.env.AUTH_URL;
  });

  afterAll(async () => {
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(product).where(inArray(product.producerId, allProducers));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, allProducers));
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducers));
    await db.delete(producer).where(inArray(producer.id, allProducers));
    await db.delete(users).where(inArray(users.id, allUsers.map((item) => item.userId)));
  });

  it("mails the matching producer with country, units and a board link, and never the investor's contact data", async () => {
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyProducersOfNewLargeOrder({ kind: "request", id: requestId });

    const calls = sentTo(email(matching.userId));
    expect(calls).toHaveLength(1);
    const mail = calls[0][0];
    expect(mail).toMatchObject({ emailType: "large_order_producer_new_request", entityId: requestId, distinctId: matching.producerId });
    expect(mail.subject).toBe("Nowe zapytanie ModularProjects (12 domów, PL)");
    expect(mail.text).toContain(`https://hub.example.test/pl/producer/panel/board/${requestId}`);
    expect(mail.text).toContain("dom");
    expect(mail.text).not.toContain(secretName);
    expect(mail.text).not.toContain(secretEmail);
    expect(mail.html).not.toContain(secretEmail);
  });

  it("does not mail a producer whose volume verification is not approved", async () => {
    await notifyProducersOfNewLargeOrder({ kind: "request", id: requestId });

    expect(sentTo(email(unverified.userId))).toHaveLength(0);
  });

  it("mails only the owner of the product for a product inquiry, with the product name", async () => {
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyProducersOfNewLargeOrder({ kind: "product", id: inquiryId });

    const recipients = sendMock.mock.calls.map((call) => call[0].to);
    expect(recipients).toEqual([email(owner.userId)]);
    const mail = sendMock.mock.calls[0][0];
    expect(mail.text).toContain("NRO Model 7");
    expect(mail.text).toContain(`https://hub.example.test/pl/producer/panel/product-inquiries/${inquiryId}`);
    expect(mail.text).not.toContain(secretEmail);
  });

  it("keeps going when one send fails and reports the producers that were missed to Sentry", async () => {
    sendMock.mockImplementation(async (input: { to: string }) => input.to !== email(matching.userId));

    await notifyProducersOfNewLargeOrder({ kind: "request", id: requestId });

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(String(captureErrorMock.mock.calls[0][0])).toContain(matching.producerId);
  });

  it("never throws when the lookup itself fails", async () => {
    await expect(notifyProducersOfNewLargeOrder({ kind: "request", id: "not-a-uuid" })).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalled();
  });
});
