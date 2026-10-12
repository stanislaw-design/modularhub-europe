import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/auth", () => ({ signIn: signInMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));

import { getGuestLinkPlan, pinGuestCaseToExistingClient } from "@/lib/cases/guest";
import { sendGuestCaseLink } from "@/lib/cases/guest-link";
import { db } from "@/lib/db/client";
import { client, inquiry, pendingRegistration, users, verificationTokens } from "@/lib/db/schema";
import { resendGuestCaseLink } from "./guest-case-actions";

// Spec 0066 AC-6 do AC-10: jedna reguła wysyłki linku magicznego dla zapytania
// i ponownej wysyłki. Test na prawdziwej bazie (pomijany bez DATABASE_URL).
describe.skipIf(!process.env.DATABASE_URL)("link magiczny gościa (spec 0066)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const emails = {
    fresh: `acct-fresh-${run}@example.test`,
    pending: `acct-pending-${run}@example.test`,
    pendingProducer: `acct-pprod-${run}@example.test`,
    producer: `acct-producer-${run}@example.test`,
    client: `acct-client-${run}@example.test`,
    retry: `acct-retry-${run}@example.test`,
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
  });

  it("plans a pending client registration for a brand new address (AC-8)", async () => {
    expect(await getGuestLinkPlan(emails.fresh, new Date())).toEqual({ send: true, stagePending: true });
  });

  it("stages the registration from the case snapshot and sends the link with the welcome marker (AC-7, AC-8)", async () => {
    const id = await guestCase(emails.fresh);

    const result = await sendGuestCaseLink({
      inquiryId: id,
      email: emails.fresh.toUpperCase(),
      name: "Gość Konto",
      phone: "+48000000072",
      locale: "nl",
      variant: "new",
    });

    expect(result).toBe("sent");
    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, emails.fresh));
    expect(pending.role).toBe("client");
    expect(pending.payload).toMatchObject({ name: "Gość Konto", phone: "+48000000072" });
    expect(signInMock).toHaveBeenCalledWith("resend", {
      email: emails.fresh,
      redirect: false,
      redirectTo: `/nl/panel/inquiries/${id}?welcome=new`,
    });
  });

  it("never overwrites an existing pending registration (AC-8)", async () => {
    await db.insert(pendingRegistration).values({
      email: emails.pending,
      role: "client",
      payload: { name: "Pierwotny", phone: "+48111111111" },
    });
    const id = await guestCase(emails.pending);

    expect(await getGuestLinkPlan(emails.pending, new Date())).toEqual({ send: true, stagePending: false });
    await sendGuestCaseLink({ inquiryId: id, email: emails.pending, name: "Nowy", phone: "+48222222222", locale: "pl", variant: "new" });

    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, emails.pending));
    expect(pending.payload).toMatchObject({ name: "Pierwotny" });
  });

  it("sends nothing and stages nothing for a producer account or a pending producer registration (AC-8)", async () => {
    const userId = crypto.randomUUID();
    userIds.push(userId);
    await db.insert(users).values({ id: userId, email: emails.producer, phone: "+48000000073", role: "producer" });
    await db.insert(pendingRegistration).values({ email: emails.pendingProducer, role: "producer", payload: { name: "P", phone: "+48000000075" } });

    expect(await getGuestLinkPlan(emails.producer, new Date())).toEqual({ send: false, stagePending: false });
    expect(await getGuestLinkPlan(emails.pendingProducer, new Date())).toEqual({ send: false, stagePending: false });
    const id = await guestCase(emails.producer);
    expect(await sendGuestCaseLink({ inquiryId: id, email: emails.producer, name: "x", phone: "+48000000073", locale: "pl", variant: "new" })).toBe("skipped");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("caps active login tokens at three per address (AC-8)", async () => {
    await db.insert(verificationTokens).values(
      [1, 2, 3].map((n) => ({ identifier: emails.fresh, token: `tok-${run}-${n}`, expires: new Date(Date.now() + 3600_000) })),
    );

    expect(await getGuestLinkPlan(emails.fresh, new Date())).toEqual({ send: false, stagePending: false });
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, emails.fresh));
  });

  it("reports failed when the link cannot be sent so the UI can retry (AC-6, AC-8)", async () => {
    signInMock.mockRejectedValueOnce(new Error("resend down"));
    const id = await guestCase(emails.retry);

    const result = await sendGuestCaseLink({ inquiryId: id, email: emails.retry, name: "x", phone: "+48000000076", locale: "pl", variant: "new" });

    expect(result).toBe("failed");
  });

  it("pins a guest case to an existing client account, contact stays unverified (AC-10)", async () => {
    const userId = crypto.randomUUID();
    userIds.push(userId);
    await db.insert(users).values({ id: userId, email: emails.client, phone: "+48000000074", role: "client" });
    await db.insert(client).values({ id: clientId, userId });
    const id = await guestCase(emails.client);

    expect(await pinGuestCaseToExistingClient(id, emails.client.toUpperCase())).toBe(clientId);

    const [row] = await db.select({ clientId: inquiry.clientId, verified: inquiry.contactEmailVerifiedAt }).from(inquiry).where(eq(inquiry.id, id));
    expect(row.clientId).toBe(clientId);
    expect(row.verified).toBeNull();
    expect(await pinGuestCaseToExistingClient(id, emails.fresh)).toBeNull();
  });

  describe("resendGuestCaseLink", () => {
    it("resends for an unverified guest case with the new variant (AC-8)", async () => {
      const id = await guestCase(emails.fresh);

      expect(await resendGuestCaseLink({ inquiryId: id, locale: "pl" })).toEqual({ ok: true });

      expect(signInMock).toHaveBeenCalledWith("resend", expect.objectContaining({ redirectTo: `/pl/panel/inquiries/${id}?welcome=new` }));
    });

    it("resends for a pinned but unverified case with the existing variant (AC-8, AC-10)", async () => {
      const id = await guestCase(emails.client, { clientId });

      expect(await resendGuestCaseLink({ inquiryId: id, locale: "pl" })).toEqual({ ok: true });

      expect(signInMock).toHaveBeenCalledWith("resend", expect.objectContaining({ redirectTo: `/pl/panel/inquiries/${id}?welcome=existing` }));
    });

    it("does nothing for a verified or unknown case and answers the same (AC-8)", async () => {
      const verified = await guestCase(emails.fresh, { contactEmailVerifiedAt: new Date() });

      expect(await resendGuestCaseLink({ inquiryId: verified, locale: "pl" })).toEqual({ ok: true });
      expect(await resendGuestCaseLink({ inquiryId: crypto.randomUUID(), locale: "pl" })).toEqual({ ok: true });
      expect(await resendGuestCaseLink({ inquiryId: "nie-uuid", locale: "pl" })).toEqual({ ok: true });
      expect(signInMock).not.toHaveBeenCalled();
    });

    it("answers ok true without sending for a producer email (AC-8, AC-15)", async () => {
      const id = await guestCase(emails.producer);

      expect(await resendGuestCaseLink({ inquiryId: id, locale: "pl" })).toEqual({ ok: true });
      expect(signInMock).not.toHaveBeenCalled();
    });

    it("answers ok false only when the send itself failed (AC-6)", async () => {
      signInMock.mockRejectedValueOnce(new Error("resend down"));
      const id = await guestCase(emails.retry);

      expect(await resendGuestCaseLink({ inquiryId: id, locale: "pl" })).toEqual({ ok: false });
    });
  });
});
