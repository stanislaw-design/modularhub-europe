import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));
import { db } from "@/lib/db/client";
import { emailMessage, producer, users } from "@/lib/db/schema";
import { applyResendDeliveryEvent, deleteEmailMessage, insertEmailMessage, setEmailMessageResendId } from "./email-message";
import { getEmailStatsByProducer, getEmailStatsByType, getEmailStatsTotals } from "./email-stats";

// Spec 0079 AC-10, AC-14, AC-15: dziennik maili i agregaty na prawdziwej bazie dev.
describe.skipIf(!process.env.DATABASE_URL)("email_message: webhook events and stats", () => {
  const ownerId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

  beforeAll(async () => {
    await db.insert(users).values({ id: ownerId, email: `ems-${ownerId}@example.test`, phone: "+48000000701", role: "producer" });
    await db.insert(producer).values({
      id: producerId,
      userId: ownerId,
      nip: `EMS${producerId.slice(0, 7)}`,
      name: "EMS A",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    // Dwa maile o tym samym zapytaniu (dwóch odbiorców), jeden o innym.
    for (const [index, entityId] of [[0, "req-a"], [1, "req-a"], [2, "req-b"]] as const) {
      await insertEmailMessage({
        id: ids[index],
        emailType: "large_order_producer_new_request",
        entityId,
        producerId,
        recipientUserId: ownerId,
        tracked: false,
      });
    }
  });

  afterAll(async () => {
    await db.delete(emailMessage).where(inArray(emailMessage.id, ids));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, ownerId));
  });

  it("applies a webhook event once: the repeat keeps the first timestamp (AC-14)", async () => {
    const first = new Date("2026-11-02T10:00:00.000Z");
    expect(await applyResendDeliveryEvent(ids[0], "delivered", first)).toBe(true);
    expect(await applyResendDeliveryEvent(ids[0], "delivered", new Date("2026-11-02T11:00:00.000Z"))).toBe(true);
    const [row] = await db.select().from(emailMessage).where(eq(emailMessage.id, ids[0]));
    expect(row.deliveredAt?.toISOString()).toBe(first.toISOString());
  });

  it("reports a missing row so the webhook can answer 503 (AC-14)", async () => {
    expect(await applyResendDeliveryEvent(crypto.randomUUID(), "bounced", new Date())).toBe(false);
  });

  it("aggregates sent, unique requests, delivered, bounced, complained per type and producer (AC-10)", async () => {
    await applyResendDeliveryEvent(ids[1], "bounced", new Date());
    await applyResendDeliveryEvent(ids[2], "complained", new Date());

    const totals = await getEmailStatsTotals(7, producerId);
    expect(totals).toEqual({ ok: true, data: { sent: 3, uniqueRequests: 2, delivered: 1, bounced: 1, complained: 1, trackedSent: 0, uniqueClicks: 0, humanOpens: 0 } });

    const byType = await getEmailStatsByType(7, producerId);
    expect(byType.ok && byType.data).toEqual([
      { key: "large_order_producer_new_request", sent: 3, uniqueRequests: 2, delivered: 1, bounced: 1, complained: 1, trackedSent: 0, uniqueClicks: 0, humanOpens: 0 },
    ]);

    const byProducer = await getEmailStatsByProducer(7, "large_order_producer_new_request");
    expect(byProducer.ok && byProducer.data.find((row) => row.key === producerId)?.sent).toBe(3);
  });

  it("counts clicks and human opens only for tracked mail, and the tracked share (AC-10)", async () => {
    await db.update(emailMessage).set({ tracked: true, clickCount: 2, openCount: 1 }).where(eq(emailMessage.id, ids[0]));
    // Nieśledzony mail z licznikami (nie powinien się zdarzyć) nie wchodzi do wskaźników.
    await db.update(emailMessage).set({ clickCount: 5, openCount: 5 }).where(eq(emailMessage.id, ids[1]));

    const totals = await getEmailStatsTotals(7, producerId);
    expect(totals.ok && totals.data).toMatchObject({ sent: 3, trackedSent: 1, uniqueClicks: 1, humanOpens: 1 });
  });

  it("stores the Resend id once and deletes a row on failure; the table has no address column (AC-15)", async () => {
    await setEmailMessageResendId(ids[0], `resend-${ids[0]}`);
    const [row] = await db.select().from(emailMessage).where(eq(emailMessage.id, ids[0]));
    expect(row.resendEmailId).toBe(`resend-${ids[0]}`);

    const extra = crypto.randomUUID();
    await insertEmailMessage({
      id: extra,
      emailType: "large_order_producer_reminder",
      entityId: "req-c",
      producerId,
      recipientUserId: null,
      tracked: false,
    });
    await deleteEmailMessage(extra);
    expect(await db.select().from(emailMessage).where(eq(emailMessage.id, extra))).toEqual([]);

    const columns = Object.keys(emailMessage);
    expect(columns.some((name) => /^(email|to|recipientEmail|address)$/i.test(name))).toBe(false);
  });
});
