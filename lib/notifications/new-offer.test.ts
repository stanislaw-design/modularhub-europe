import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { client, inquiry, users } from "@/lib/db/schema";
import { notifyClientOfNewOffer } from "./new-offer";

// AC-2: klient (e mail z inquiry.email) dostaje e mail o nowej ofercie, z
// linkiem do jej podglądu. Real dev DB dla resolucji inquiry.email (mirrors
// lib/offer-actions.test.ts); tylko sender/observability są mockowane.
describe.skipIf(!process.env.DATABASE_URL)("notifyClientOfNewOffer", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const clientEmail = `no-client-${clientUserId}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values({ id: clientUserId, email: clientEmail, phone: "+48000000001", role: "client" });
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(inquiry).values({
      id: inquiryId,
      clientId,
      name: "New Offer Test Client",
      email: clientEmail,
      phone: "+48000000001",
      deliveryCountryCode: "PL",
      idempotencyKey: `new-offer-test-${inquiryId}`,
    });
  });

  afterAll(async () => {
    await db.delete(inquiry).where(eq(inquiry.id, inquiryId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(eq(users.id, clientUserId));
  });

  afterEach(() => {
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
  });

  it("sends to inquiry.email, tagged new_offer, entityId/distinctId set to the offer id", async () => {
    await notifyClientOfNewOffer("offer-1", inquiryId);

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: clientEmail,
        emailType: "new_offer",
        entityId: "offer-1",
        distinctId: "offer-1",
      }),
    );
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.html).toContain(`panel/inquiries/${inquiryId}`);
    // idea 1 (design feedback): plain text fallback alongside the HTML.
    expect(call.text).toContain(`panel/inquiries/${inquiryId}`);
    expect(call.text).not.toMatch(/<[a-z]/i);
    // idea 5 (design feedback): short, human readable reference in the footer.
    expect(call.text).toContain("OFFER1");
    expect(call.html).toContain("OFFER1");
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the inquiry does not exist, never calls the sender", async () => {
    await notifyClientOfNewOffer("offer-1", crypto.randomUUID());

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });
});
