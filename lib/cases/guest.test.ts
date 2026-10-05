import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { channel, client, inquiry, message, producer, product, inquiryItem, users } from "@/lib/db/schema";
import { systemClock } from "./clock";
import { createAdvisoryCase, findExistingAdvisoryCase, IdempotencyConflictError } from "./create";
import {
  findClientIdByEmail,
  GUEST_CASES_PER_EMAIL_PER_DAY,
  isGuestRateLimited,
  linkGuestCasesToClientOnLogin,
} from "./guest";
import { notifyMessageRecipient } from "./notify";

// Spec 0066: sprawa gościa bez konta. Wiersze inquiry/message/channel zostają
// w bazie dev (message jest niezmienna, trigger message_immutable), tak jak w
// create.test.ts; sprzątamy to, co da się usunąć.
describe.skipIf(!process.env.DATABASE_URL)("sprawa gościa (spec 0066)", () => {
  const run = crypto.randomUUID().slice(0, 8);
  const guestEmail = `guest-${run}@example.test`;
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const clientEmail = `guest-client-${run}@example.test`;
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const directInquiryIds: string[] = [];

  function guestInput(key: string, email: string) {
    return {
      clientId: null,
      contact: { name: "Gość Testowy", email, phone: "+48000000066" },
      projectIds: [productId],
      plot: { street: "Testowa 66", postalCode: "00-066", city: "Warszawa", countryCode: "PL" },
      message: null,
      idempotencyKey: key,
      locale: "en",
      systemNoticeBody: "Received.",
      contactEmailVerifiedAt: null,
    };
  }

  beforeAll(async () => {
    await db.insert(users).values({ id: clientUserId, email: clientEmail, phone: "+48000000067", role: "client" });
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(users).values({ id: producerUserId, email: `guest-prod-${run}@example.test`, phone: "+48000000068", role: "producer" });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `GU${producerId.slice(0, 8)}`,
      name: "Guest Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "draft", name: "Guest Test Product" });
  });

  afterAll(async () => {
    if (directInquiryIds.length) {
      await db.delete(inquiry).where(inArray(inquiry.id, directInquiryIds));
    }
    await db.delete(inquiryItem).where(eq(inquiryItem.productId, productId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  beforeEach(() => sendNotificationEmailMock.mockClear());

  it("saves a guest case with no client, lowercase email, unverified contact and locale (AC-3)", async () => {
    const result = await createAdvisoryCase(guestInput(`g-save-${run}`, guestEmail), systemClock);

    const [row] = await db.select().from(inquiry).where(eq(inquiry.id, result.inquiryId));
    expect(result.created).toBe(true);
    expect(row.clientId).toBeNull();
    expect(row.email).toBe(guestEmail);
    expect(row.stage).toBe("nowe");
    expect(row.contactEmailVerifiedAt).toBeNull();
    expect(row.locale).toBe("en");
    const [channelRow] = await db.select().from(channel).where(eq(channel.inquiryId, result.inquiryId));
    expect(channelRow.kind).toBe("klient_doradca");
  });

  it("returns the same case for the same key and email, and rejects another email (AC-4)", async () => {
    const key = `g-idem-${run}`;
    const first = await createAdvisoryCase(guestInput(key, guestEmail), systemClock);

    const replay = await createAdvisoryCase(guestInput(key, guestEmail), systemClock);
    expect(replay).toEqual({ inquiryId: first.inquiryId, channelId: first.channelId, created: false });

    await expect(createAdvisoryCase(guestInput(key, `other-${run}@example.test`), systemClock)).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
    await expect(findExistingAdvisoryCase(key, { clientId, email: clientEmail })).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
  });

  it("limits a guest email to three cases per day, counting all cases with that email (AC-5)", async () => {
    const email = `limit-${run}@example.test`;
    expect(await isGuestRateLimited(email, new Date())).toBe(false);

    for (let i = 0; i < GUEST_CASES_PER_EMAIL_PER_DAY; i++) {
      const id = crypto.randomUUID();
      directInquiryIds.push(id);
      await db.insert(inquiry).values({
        id,
        // Case of a linked, logged in client counts too (spec: all cases with the email).
        clientId: i === 0 ? clientId : null,
        name: "Limit",
        email: i === 0 ? email.toUpperCase() : email,
        phone: "+48000000069",
        deliveryCountryCode: "PL",
        idempotencyKey: `limit-${run}-${i}`,
      });
    }

    expect(await isGuestRateLimited(email, new Date())).toBe(true);
    expect(await isGuestRateLimited(`free-${run}@example.test`, new Date())).toBe(false);
  });

  it("links guest cases to the client on login, verifies the contact and is idempotent (AC-9)", async () => {
    const email = `link-${run}@example.test`;
    const a = crypto.randomUUID();
    const b = crypto.randomUUID();
    directInquiryIds.push(a, b);
    await db.insert(inquiry).values([
      { id: a, clientId: null, name: "L", email, phone: "+48000000070", deliveryCountryCode: "PL", idempotencyKey: `link-a-${run}` },
      { id: b, clientId: null, name: "L", email: email.toUpperCase(), phone: "+48000000070", deliveryCountryCode: "PL", idempotencyKey: `link-b-${run}` },
    ]);

    await linkGuestCasesToClientOnLogin(email, clientId);
    await linkGuestCasesToClientOnLogin(email, clientId);

    const rows = await db.select().from(inquiry).where(inArray(inquiry.id, [a, b]));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.clientId).toBe(clientId);
      expect(row.contactEmailVerifiedAt).not.toBeNull();
    }
  });

  it("finds only a client account by email, never a producer (AC-10)", async () => {
    expect(await findClientIdByEmail(clientEmail)).toBe(clientId);
    expect(await findClientIdByEmail(`guest-prod-${run}@example.test`)).toBeNull();
    expect(await findClientIdByEmail(`nobody-${run}@example.test`)).toBeNull();
  });

  it("does not link a case that already belongs to another client", async () => {
    const id = crypto.randomUUID();
    directInquiryIds.push(id);
    await db.insert(inquiry).values({
      id,
      clientId,
      name: "L",
      email: `owned-${run}@example.test`,
      phone: "+48000000071",
      deliveryCountryCode: "PL",
      idempotencyKey: `owned-${run}`,
    });

    await linkGuestCasesToClientOnLogin(`owned-${run}@example.test`, crypto.randomUUID());

    const [row] = await db.select({ clientId: inquiry.clientId }).from(inquiry).where(eq(inquiry.id, id));
    expect(row.clientId).toBe(clientId);
  });

  // AC-12: the advisor's reply to a guest mails the snapshot email, in the case
  // locale, with only a link, and at most once per 10 minutes per case.
  it("mails the guest once per window after an advisor reply, link only, in the case locale (AC-12)", async () => {
    const created = await createAdvisoryCase(guestInput(`g-mail-${run}`, `mail-${run}@example.test`), systemClock);
    const send = () =>
      notifyMessageRecipient({
        inquiryId: created.inquiryId,
        channelId: created.channelId,
        authorKind: "advisor",
        locale: "pl",
        clock: systemClock,
      });

    await db.insert(message).values({ channelId: created.channelId, authorKind: "advisor", type: "text", body: "Sekretna treść", locale: "pl" });
    await send();
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendNotificationEmailMock.mock.calls[0][0];
    expect(sent.to).toBe(`mail-${run}@example.test`);
    expect(sent.text).toContain(`/en/inquiry/claim/${created.inquiryId}`);
    expect(sent.text).not.toContain("Sekretna treść");

    await db.insert(message).values({ channelId: created.channelId, authorKind: "advisor", type: "text", body: "Druga", locale: "pl" });
    await send();
    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
  });

  it("does not leave a guest case readable without an actor (AC-15)", async () => {
    const { evaluateCaseAccess } = await import("./access");
    const result = evaluateCaseAccess(
      { kind: "client", userId: "u", clientId },
      { inquiry: { id: "i", clientId: null, stage: "nowe", finalistProducerId: null } },
    );
    expect(result).toBeNull();
  });

  it("a verified-nowhere row stays queryable by id for the advisor view fields (AC-11)", async () => {
    const created = await createAdvisoryCase(guestInput(`g-view-${run}`, `view-${run}@example.test`), systemClock);
    const [row] = await db
      .select({ email: inquiry.email, phone: inquiry.phone, verified: inquiry.contactEmailVerifiedAt })
      .from(inquiry)
      .where(and(eq(inquiry.id, created.inquiryId), eq(inquiry.email, `view-${run}@example.test`)));
    expect(row.phone).toBe("+48000000066");
    expect(row.verified).toBeNull();
  });
});
