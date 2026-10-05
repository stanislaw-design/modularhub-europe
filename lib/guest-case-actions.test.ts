import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/auth", () => ({ signIn: signInMock }));
const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));

import { db } from "@/lib/db/client";
import { client, inquiry, pendingRegistration, users, verificationTokens } from "@/lib/db/schema";
import { notifyGuestOfNewCase } from "@/lib/notifications/guest-inquiry";
import { requestAccountForGuestCase } from "./guest-case-actions";

// Spec 0066 AC-7, AC-8, AC-10: konto na jawne kliknięcie i maile gościa.
describe.skipIf(!process.env.DATABASE_URL)("konto i maile gościa (spec 0066)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const emails = {
    fresh: `acct-fresh-${run}@example.test`,
    pending: `acct-pending-${run}@example.test`,
    producer: `acct-producer-${run}@example.test`,
    client: `acct-client-${run}@example.test`,
    linked: `acct-linked-${run}@example.test`,
  };
  const inquiryIds: string[] = [];
  const userIds: string[] = [];
  const clientId = crypto.randomUUID();

  async function guestCase(email: string, patch: Partial<typeof inquiry.$inferInsert> = {}) {
    const id = crypto.randomUUID();
    inquiryIds.push(id);
    await db.insert(inquiry).values({
      id,
      clientId: null,
      name: "Gość Konto",
      email,
      phone: "+48000000072",
      deliveryCountryCode: "PL",
      idempotencyKey: `acct-${id}`,
      locale: "nl",
      ...patch,
    });
    return id;
  }

  afterAll(async () => {
    await db.delete(inquiry).where(inArray(inquiry.id, inquiryIds));
    await db.delete(client).where(eq(client.id, clientId));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    await db.delete(pendingRegistration).where(inArray(pendingRegistration.email, Object.values(emails)));
    await db.delete(verificationTokens).where(inArray(verificationTokens.identifier, Object.values(emails)));
  });

  beforeEach(() => {
    signInMock.mockClear();
    sendNotificationEmailMock.mockClear();
  });

  it("stages a pending client registration from the case snapshot and sends the login link (AC-8)", async () => {
    const id = await guestCase(emails.fresh);

    const result = await requestAccountForGuestCase({ inquiryId: id, locale: "pl" });

    expect(result).toEqual({ ok: true });
    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, emails.fresh));
    expect(pending.role).toBe("client");
    expect(pending.payload).toMatchObject({ name: "Gość Konto", phone: "+48000000072" });
    expect(signInMock).toHaveBeenCalledWith("resend", {
      email: emails.fresh,
      redirect: false,
      redirectTo: `/pl/panel/inquiries/${id}`,
    });
  });

  it("never overwrites an existing pending registration (AC-8)", async () => {
    await db.insert(pendingRegistration).values({
      email: emails.pending,
      role: "client",
      payload: { name: "Pierwotny", phone: "+48111111111" },
    });
    const id = await guestCase(emails.pending);

    await requestAccountForGuestCase({ inquiryId: id, locale: "pl" });

    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, emails.pending));
    expect(pending.payload).toMatchObject({ name: "Pierwotny" });
  });

  it("sends nothing when the email belongs to a producer account (AC-8)", async () => {
    const userId = crypto.randomUUID();
    userIds.push(userId);
    await db.insert(users).values({ id: userId, email: emails.producer, phone: "+48000000073", role: "producer" });
    const id = await guestCase(emails.producer);

    const result = await requestAccountForGuestCase({ inquiryId: id, locale: "pl" });

    expect(result).toEqual({ ok: true });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("does nothing for a linked or verified case, and answers the same (AC-8)", async () => {
    const userId = crypto.randomUUID();
    userIds.push(userId);
    await db.insert(users).values({ id: userId, email: emails.client, phone: "+48000000074", role: "client" });
    await db.insert(client).values({ id: clientId, userId });
    const linked = await guestCase(emails.linked, { clientId });
    const verified = await guestCase(emails.fresh, { contactEmailVerifiedAt: new Date() });

    expect(await requestAccountForGuestCase({ inquiryId: linked, locale: "pl" })).toEqual({ ok: true });
    expect(await requestAccountForGuestCase({ inquiryId: verified, locale: "pl" })).toEqual({ ok: true });
    expect(await requestAccountForGuestCase({ inquiryId: crypto.randomUUID(), locale: "pl" })).toEqual({ ok: true });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("caps active login tokens at three per address (AC-8)", async () => {
    const email = emails.fresh;
    await db.insert(verificationTokens).values(
      [1, 2, 3].map((n) => ({ identifier: email, token: `tok-${run}-${n}`, expires: new Date(Date.now() + 3600_000) })),
    );
    const id = await guestCase(email);

    await requestAccountForGuestCase({ inquiryId: id, locale: "pl" });

    expect(signInMock).not.toHaveBeenCalled();
  });

  it("returns ok false when the link cannot be sent so the UI can retry (AC-8)", async () => {
    signInMock.mockRejectedValueOnce(new Error("resend down"));
    const id = await guestCase(`acct-retry-${run}@example.test`);
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, emails.fresh));

    const result = await requestAccountForGuestCase({ inquiryId: id, locale: "pl" });

    expect(result).toEqual({ ok: false });
    await db.delete(pendingRegistration).where(eq(pendingRegistration.email, `acct-retry-${run}@example.test`));
  });

  it("emails a new guest a fixed text with the claim link, no guest fields (AC-7)", async () => {
    const id = await guestCase(`acct-mail-${run}@example.test`, { name: "Unikalne Imię Gościa", clientMessage: "TajnaWiadomość" });

    await notifyGuestOfNewCase(id);

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendNotificationEmailMock.mock.calls[0][0];
    expect(sent.emailType).toBe("guest_inquiry_confirmation");
    expect(sent.to).toBe(`acct-mail-${run}@example.test`);
    expect(sent.text).toContain(`/nl/inquiry/claim/${id}`);
    expect(sent.text + sent.html).not.toContain("Unikalne Imię Gościa");
    expect(sent.text + sent.html).not.toContain("TajnaWiadomość");
  });

  it("pins the case to an existing client and sends the was this you mail with Reply-To (AC-10)", async () => {
    process.env.SUPPORT_REPLY_TO_EMAIL = "support@example.test";
    const id = await guestCase(emails.client);

    await notifyGuestOfNewCase(id);

    const [row] = await db.select({ clientId: inquiry.clientId, verified: inquiry.contactEmailVerifiedAt }).from(inquiry).where(eq(inquiry.id, id));
    expect(row.clientId).toBe(clientId);
    expect(row.verified).toBeNull();
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendNotificationEmailMock.mock.calls[0][0];
    expect(sent.emailType).toBe("guest_identity_check");
    expect(sent.replyTo).toBe("support@example.test");
    delete process.env.SUPPORT_REPLY_TO_EMAIL;
  });
});
