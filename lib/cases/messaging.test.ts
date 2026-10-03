import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// messaging.ts is not a "use server" file and imports no auth/observability
// boundary modules, so (unlike cards.ts/case-actions.ts) nothing needs
// mocking here; this file calls the real functions against the real (dev)
// database directly, the same convention lib/cases/cards.test.ts uses.
import { db } from "@/lib/db/client";
import { auditLog, client, inquiry, inquiryItem, producer, product, users } from "@/lib/db/schema";
import type { CaseActor } from "./access";
import { createAdvisoryCase } from "./create";
import { listMessages, postMessage, touchChannel } from "./messaging";

describe.skipIf(!process.env.DATABASE_URL)("lib/cases/messaging: real DB", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const advisorUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  const clock = { now: () => new Date("2026-10-03T10:00:00.000Z") };
  const clientActor: CaseActor = { kind: "client", userId: clientUserId, clientId };
  const advisorActor: CaseActor = { kind: "advisor", userId: advisorUserId };
  const producerActor: CaseActor = { kind: "producer", userId: producerUserId, producerId };

  let inquiryId: string;
  let channelId: string;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `msg-client-${clientUserId}@example.test`, phone: "+48000000031", role: "client" },
      { id: advisorUserId, email: `msg-advisor-${advisorUserId}@example.test`, phone: "+48000000032", role: "admin" },
      { id: producerUserId, email: `msg-producer-${producerUserId}@example.test`, phone: "+48000000033", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `MSG${producerId.slice(0, 9)}`,
      name: "Messaging Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "draft", name: "Messaging Test Product" });

    const result = await createAdvisoryCase(
      {
        clientId,
        contact: { name: "Messaging Test Client", email: "msg-client@example.test", phone: "+48000000031" },
        projectIds: [productId],
        plot: { street: "Testowa 2", postalCode: "00-002", city: "Warszawa", countryCode: "PL" },
        message: null,
        idempotencyKey: `msg-case-${clientId}`,
        locale: "pl",
        systemNoticeBody: "Otrzymaliśmy Twoje zapytanie.",
      },
      clock,
    );
    inquiryId = result.inquiryId;
    channelId = result.channelId;
  });

  // message is immutable (AC-31): this fixture chain can never be deleted
  // once a message exists in it, same note as lib/cases/cards.test.ts.
  afterAll(async () => {
    await db.delete(inquiryItem).where(eq(inquiryItem.productId, productId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  describe("postMessage", () => {
    it("a client posts a message and the inquiry flips waitingOn to advisor (happy path)", async () => {
      const result = await postMessage(
        clientActor,
        { inquiryId, channelId, body: "Dzień dobry, mam pytanie.", locale: "pl", idempotencyKey: `msg-1-${clientId}` },
        clock,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.created).toBe(true);
      expect(result.message.body).toBe("Dzień dobry, mam pytanie.");

      const [row] = await db.select({ waitingOn: inquiry.waitingOn }).from(inquiry).where(eq(inquiry.id, inquiryId));
      expect(row?.waitingOn).toBe("advisor");
    });

    it("retrying the same idempotency key returns the existing message instead of a duplicate", async () => {
      const input = { inquiryId, channelId, body: "Treść pierwszej próby.", locale: "pl", idempotencyKey: `msg-idem-${clientId}` };
      const first = await postMessage(clientActor, input, clock);
      const second = await postMessage(clientActor, { ...input, body: "Inna treść przy ponowieniu." }, clock);

      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(second.created).toBe(false);
      expect(second.message.id).toBe(first.message.id);
      expect(second.message.body).toBe("Treść pierwszej próby.");
    });

    it("a producer without access to this klient_doradca channel is forbidden", async () => {
      const result = await postMessage(
        producerActor,
        { inquiryId, channelId, body: "Nie powinno się udać.", locale: "pl", idempotencyKey: `msg-forbidden-${producerUserId}` },
        clock,
      );
      expect(result).toEqual({ ok: false, reason: "forbidden" });
    });

    // Spec 0064 AC-1/AC-3: an advisor (admin session) sending a case message
    // now gets attributed on the new message_audit trigger.
    it("attributes the resulting audit_log row to the advisor, with no body/payload in it (AC-1, AC-3)", async () => {
      const result = await postMessage(
        advisorActor,
        { inquiryId, channelId, body: "Odpowiedź doradcy.", locale: "pl", idempotencyKey: `msg-advisor-${advisorUserId}` },
        clock,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const [row] = await db
        .select({ actorUserId: auditLog.actorUserId, newValues: auditLog.newValues })
        .from(auditLog)
        .where(and(eq(auditLog.tableName, "message"), eq(auditLog.recordId, result.message.id)));
      expect(row?.actorUserId).toBe(advisorUserId);
      expect(row?.newValues).not.toHaveProperty("body");
      expect(row?.newValues).not.toHaveProperty("payload");
    });

    // Spec 0064 AC-2: client/producer initiated message content is audited
    // (metadata only) but never attributed, by design.
    it("a client's own message is audited but never attributed to anyone (AC-2)", async () => {
      const result = await postMessage(
        clientActor,
        { inquiryId, channelId, body: "Wiadomość klienta.", locale: "pl", idempotencyKey: `msg-client-${clientUserId}` },
        clock,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const [row] = await db
        .select({ actorUserId: auditLog.actorUserId })
        .from(auditLog)
        .where(and(eq(auditLog.tableName, "message"), eq(auditLog.recordId, result.message.id)));
      expect(row?.actorUserId).toBeNull();
    });
  });

  describe("listMessages / touchChannel", () => {
    it("listMessages returns posted messages for the channel, newest page first in chronological order", async () => {
      const rows = await listMessages(channelId, null);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.id)).toBe(true);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].createdAt >= rows[i - 1].createdAt).toBe(true);
      }
    });

    it("touchChannel does not throw when marking a channel read", async () => {
      await expect(touchChannel(channelId, clientUserId, clock, { read: true })).resolves.not.toThrow();
    });
  });
});
