import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { client, inquiry, users } from "@/lib/db/schema";
import { notifyClientOfNewCase } from "./new-inquiry";

// AC-1: klient dostaje e mail potwierdzający złożenie nowego zapytania.
describe.skipIf(!process.env.DATABASE_URL)("notifyClientOfNewCase", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const clientEmail = `ni-client-${clientUserId}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values({ id: clientUserId, email: clientEmail, phone: "+48000000001", role: "client" });
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(inquiry).values({
      id: inquiryId,
      clientId,
      name: "New Inquiry Test Client",
      email: clientEmail,
      phone: "+48000000001",
      deliveryCountryCode: "PL",
      idempotencyKey: `new-inquiry-test-${inquiryId}`,
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

  it("sends to inquiry.email, tagged new_inquiry_confirmation, entityId/distinctId set to the inquiry id", async () => {
    await notifyClientOfNewCase(inquiryId);

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: clientEmail,
        emailType: "new_inquiry_confirmation",
        entityId: inquiryId,
        distinctId: inquiryId,
      }),
    );
    const call = sendNotificationEmailMock.mock.calls[0][0];
    // idea 1 (design feedback): plain text fallback alongside the HTML.
    expect(call.text).toContain(`panel/inquiries/${inquiryId}`);
    expect(call.text).not.toMatch(/<[a-z]/i);
    // idea 5 (design feedback): short, human readable reference in the footer.
    const expectedReference = inquiryId.replace(/-/g, "").slice(0, 8).toUpperCase();
    expect(call.text).toContain(expectedReference);
    expect(call.html).toContain(expectedReference);
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the inquiry does not exist, never calls the sender", async () => {
    await notifyClientOfNewCase(crypto.randomUUID());

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });
});
