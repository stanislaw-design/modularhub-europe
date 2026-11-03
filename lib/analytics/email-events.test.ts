import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));
import { db } from "@/lib/db/client";
import { emailEvent, emailMessage, producer, userConsent, users } from "@/lib/db/schema";
import { deleteExpiredEmailEvents, isAutomaticIp, isLikelyAutomatic, recordEmailEvent, type AutomaticSignals } from "./email-events";
import { insertEmailMessage } from "./email-message";
import {
  EMAIL_TRACKING_CONSENT_VERSION,
  getEmailTrackingConsentState,
  grantEmailTrackingConsent,
  withdrawEmailTrackingConsent,
} from "./user-consent";

const SENT = new Date("2026-11-02T10:00:00.000Z");
const base: AutomaticSignals = {
  method: "GET",
  userAgent: "Mozilla/5.0",
  ip: "203.0.113.5",
  kind: "clicked",
  sentAt: SENT,
  now: new Date(SENT.getTime() + 60_000),
  otherLinkClickedRecently: false,
};

describe("isLikelyAutomatic (spec 0079 AC-22)", () => {
  it("treats a normal click a minute after sending as human", () => {
    expect(isLikelyAutomatic(base)).toBe(false);
  });
  it("treats HEAD as always automatic", () => {
    expect(isLikelyAutomatic({ ...base, method: "HEAD" })).toBe(true);
    expect(isLikelyAutomatic({ ...base, method: "HEAD", userAgent: "GoogleImageProxy" })).toBe(true);
  });
  it("treats several different links within seconds as a scanner", () => {
    expect(isLikelyAutomatic({ ...base, otherLinkClickedRecently: true })).toBe(true);
  });
  it("treats an open seconds after sending as automatic, a later one as human", () => {
    expect(isLikelyAutomatic({ ...base, kind: "opened", now: new Date(SENT.getTime() + 2_000) })).toBe(true);
    expect(isLikelyAutomatic({ ...base, kind: "opened" })).toBe(false);
  });
  it("flags Apple, Microsoft and Proofpoint by address range or user agent", () => {
    expect(isLikelyAutomatic({ ...base, ip: "17.58.1.2" })).toBe(true);
    expect(isLikelyAutomatic({ ...base, ip: "40.107.10.4" })).toBe(true);
    expect(isLikelyAutomatic({ ...base, ip: "148.163.140.9" })).toBe(true);
    expect(isLikelyAutomatic({ ...base, userAgent: "Mozilla/5.0 Microsoft Office/16.0" })).toBe(true);
    expect(isLikelyAutomatic({ ...base, userAgent: "Proofpoint URL Defense" })).toBe(true);
  });
  it("counts the Gmail image proxy as human, even right after an open", () => {
    expect(isLikelyAutomatic({ ...base, kind: "opened", userAgent: "Mozilla/5.0 (via ggpht.com GoogleImageProxy)", ip: "66.249.84.1" })).toBe(false);
  });
  it("matches IPv4 ranges only", () => {
    expect(isAutomaticIp("17.0.0.1")).toBe(true);
    expect(isAutomaticIp("18.0.0.1")).toBe(false);
    expect(isAutomaticIp("2001:db8::1")).toBe(false);
    expect(isAutomaticIp(null)).toBe(false);
  });
});

// Zapis zdarzeń, zgoda i retencja na prawdziwej bazie dev (AC-19, AC-20, AC-22, AC-23).
describe.skipIf(!process.env.DATABASE_URL)("email events and consent on the dev database", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const trackedId = crypto.randomUUID();
  const untrackedId = crypto.randomUUID();
  const oldId = crypto.randomUUID();
  const url = "https://modularhubeurope.pl/pl/producer/panel/board/1";
  const otherUrl = "https://modularhubeurope.pl/pl/producer/panel/board/2";

  async function message(id: string) {
    const [row] = await db.select().from(emailMessage).where(eq(emailMessage.id, id));
    return row;
  }
  const human = { method: "GET", userAgent: "Mozilla/5.0", ip: "203.0.113.5" };

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `evt-${userId}@example.test`, phone: "+48000000702", role: "producer" });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `EVT${producerId.slice(0, 7)}`,
      name: "EVT A",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await grantEmailTrackingConsent(userId);
    const common = { emailType: "large_order_producer_new_request", entityId: "req", producerId, recipientUserId: userId };
    await insertEmailMessage({ ...common, id: trackedId, tracked: true });
    await insertEmailMessage({ ...common, id: untrackedId, tracked: false });
    await insertEmailMessage({ ...common, id: oldId, tracked: true });
    // Wysyłka sprzed godziny, żeby otwarcie nie wyglądało na automat z powodu świeżości.
    await db.update(emailMessage).set({ sentAt: new Date(Date.now() - 3_600_000) }).where(eq(emailMessage.id, trackedId));
  });

  afterAll(async () => {
    await db.delete(emailMessage).where(eq(emailMessage.producerId, producerId));
    await db.delete(userConsent).where(eq(userConsent.userId, userId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("keeps one active consent per user and a new row after withdrawal (AC-19)", async () => {
    await grantEmailTrackingConsent(userId);
    expect(await db.select().from(userConsent).where(eq(userConsent.userId, userId))).toHaveLength(1);
    expect((await getEmailTrackingConsentState(userId)).textVersion).toBe(EMAIL_TRACKING_CONSENT_VERSION);

    await withdrawEmailTrackingConsent(userId);
    const afterWithdraw = await db.select().from(userConsent).where(eq(userConsent.userId, userId));
    expect(afterWithdraw).toHaveLength(1);
    expect(afterWithdraw[0].withdrawnAt).not.toBeNull();
    expect((await getEmailTrackingConsentState(userId)).active).toBe(false);

    await grantEmailTrackingConsent(userId);
    expect(await db.select().from(userConsent).where(eq(userConsent.userId, userId))).toHaveLength(2);
    expect((await getEmailTrackingConsentState(userId)).active).toBe(true);
  });

  it("records a human open and click and bumps the counters once (AC-20)", async () => {
    expect(await recordEmailEvent({ messageId: trackedId, kind: "opened", ...human })).toBe(true);
    expect(await recordEmailEvent({ messageId: trackedId, kind: "clicked", targetUrl: url, ...human })).toBe(true);
    const row = await message(trackedId);
    expect(row.openCount).toBe(1);
    expect(row.clickCount).toBe(1);
    expect(row.firstOpenedAt).not.toBeNull();
    expect(row.firstClickedAt).not.toBeNull();
  });

  it("marks a scanner clicking several links as automatic, including the earlier click (AC-22)", async () => {
    // Pierwsze kliknięcie z poprzedniego testu było >5 s temu? Nie: sprzątamy okno, żeby test był niezależny.
    await db.delete(emailEvent).where(eq(emailEvent.messageId, trackedId));
    await db.update(emailMessage).set({ clickCount: 0, firstClickedAt: null }).where(eq(emailMessage.id, trackedId));

    await recordEmailEvent({ messageId: trackedId, kind: "clicked", targetUrl: url, ...human });
    expect((await message(trackedId)).clickCount).toBe(1);
    await recordEmailEvent({ messageId: trackedId, kind: "clicked", targetUrl: otherUrl, ...human });

    const row = await message(trackedId);
    expect(row.clickCount).toBe(0);
    expect(row.firstClickedAt).toBeNull();
    const events = await db.select().from(emailEvent).where(eq(emailEvent.messageId, trackedId));
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.likelyAutomatic)).toBe(true);
  });

  it("stores an automatic hit but does not bump counters (AC-22)", async () => {
    const before = (await message(trackedId)).openCount;
    await recordEmailEvent({ messageId: trackedId, kind: "opened", method: "GET", userAgent: "Mozilla/5.0", ip: "17.58.1.2" });
    expect((await message(trackedId)).openCount).toBe(before);
    const opened = await db.select().from(emailEvent).where(eq(emailEvent.messageId, trackedId));
    expect(opened.some((event) => event.kind === "opened" && event.likelyAutomatic)).toBe(true);
  });

  it("skips mail that was not sent in the tracked variant, and unknown ids", async () => {
    expect(await recordEmailEvent({ messageId: untrackedId, kind: "opened", ...human })).toBe(false);
    expect(await recordEmailEvent({ messageId: crypto.randomUUID(), kind: "opened", ...human })).toBe(false);
    expect(await db.select().from(emailEvent).where(eq(emailEvent.messageId, untrackedId))).toHaveLength(0);
  });

  it("stops recording after the recipient withdraws consent (AC-20)", async () => {
    await db.delete(emailEvent).where(eq(emailEvent.messageId, trackedId));
    await withdrawEmailTrackingConsent(userId);
    expect(await recordEmailEvent({ messageId: trackedId, kind: "opened", ...human })).toBe(false);
    expect(await recordEmailEvent({ messageId: trackedId, kind: "clicked", targetUrl: url, ...human })).toBe(false);
    expect(await db.select().from(emailEvent).where(eq(emailEvent.messageId, trackedId))).toHaveLength(0);
  });

  it("deletes raw events older than 13 months and keeps the message totals (AC-23)", async () => {
    await db.update(emailMessage).set({ openCount: 3 }).where(eq(emailMessage.id, oldId));
    const fourteenMonthsAgo = new Date();
    fourteenMonthsAgo.setMonth(fourteenMonthsAgo.getMonth() - 14);
    const [old] = await db
      .insert(emailEvent)
      .values({ messageId: oldId, kind: "opened", occurredAt: fourteenMonthsAgo })
      .returning({ id: emailEvent.id });
    const [recent] = await db.insert(emailEvent).values({ messageId: oldId, kind: "opened" }).returning({ id: emailEvent.id });

    expect(await deleteExpiredEmailEvents()).toBeGreaterThanOrEqual(1);

    const left = await db.select({ id: emailEvent.id }).from(emailEvent).where(eq(emailEvent.messageId, oldId));
    expect(left.map((row) => row.id)).toEqual([recent.id]);
    expect(left.some((row) => row.id === old.id)).toBe(false);
    expect((await message(oldId)).openCount).toBe(3);
  });
});
