import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const notifyMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/large-order-producer", () => ({ notifyProducersOfClosedRequest: notifyMock }));

import { db } from "@/lib/db/client";
import { auditLog, bulkProductInquiry, client, producer, product, projectRequest, users } from "@/lib/db/schema";
import { closeLargeOrder } from "./large-order-close";

// Spec 0070 AC-19, AC-37: jedna funkcja zamykająca dla admina i klienta, warunki w samym SQL.
describe.skipIf(!process.env.DATABASE_URL)("lib/large-order-close: real DB, mocked notification", () => {
  const adminId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const ownerClientId = crypto.randomUUID();
  const otherClientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const requestIds: string[] = [];
  const inquiryIds: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminId, email: `lc-admin-${adminId}@example.test`, phone: "+48000000051", role: "admin" },
      { id: ownerUserId, email: `lc-owner-${ownerUserId}@example.test`, phone: "+48000000052", role: "client" },
      { id: otherUserId, email: `lc-other-${otherUserId}@example.test`, phone: "+48000000053", role: "client" },
      { id: producerUserId, email: `lc-prod-${producerUserId}@example.test`, phone: "+48000000054", role: "producer" },
    ]);
    await db.insert(client).values([
      { id: ownerClientId, userId: ownerUserId },
      { id: otherClientId, userId: otherUserId },
    ]);
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `LC${producerId.slice(0, 9)}`, name: "LC Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: "LC Product" });
  });

  afterAll(async () => {
    await db.delete(projectRequest).where(inArray(projectRequest.id, requestIds));
    await db.delete(bulkProductInquiry).where(inArray(bulkProductInquiry.id, inquiryIds));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(client).where(inArray(client.id, [ownerClientId, otherClientId]));
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminId));
    await db.delete(users).where(inArray(users.id, [adminId, ownerUserId, otherUserId, producerUserId]));
  });

  afterEach(() => notifyMock.mockClear());

  async function newRequest(status: "open" | "quoted" | "published" | "accepted" = "open"): Promise<string> {
    const [row] = await db
      .insert(projectRequest)
      .values({
        clientId: ownerClientId,
        contactName: "LC Buyer",
        contactEmail: `lc-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 10,
        status,
      })
      .returning({ id: projectRequest.id });
    requestIds.push(row.id);
    return row.id;
  }

  async function stateOf(id: string) {
    const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
    return row;
  }

  it("closes an open request with the reason and the time, then tells producers once", async () => {
    const id = await newRequest("quoted");

    const closed = await closeLargeOrder({ kind: "request", id, reason: "client_cancelled", fromStatuses: ["open", "quoted", "published"], clientId: ownerClientId });

    expect(closed).toBe(true);
    expect(await stateOf(id)).toMatchObject({ status: "closed", closedReason: "client_cancelled" });
    expect((await stateOf(id)).closedAt).toBeInstanceOf(Date);
    expect(notifyMock).toHaveBeenCalledWith({ kind: "request", id });
  });

  it("does nothing the second time, so producers are not told twice", async () => {
    const id = await newRequest();
    const input = { kind: "request" as const, id, reason: "staff_closed" as const, fromStatuses: ["open", "quoted", "published"] as const };

    expect(await closeLargeOrder(input)).toBe(true);
    expect(await closeLargeOrder(input)).toBe(false);
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a client who does not own the request", async () => {
    const id = await newRequest();

    const closed = await closeLargeOrder({ kind: "request", id, reason: "client_cancelled", fromStatuses: ["open"], clientId: otherClientId });

    expect(closed).toBe(false);
    expect((await stateOf(id)).status).toBe("open");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("respects the allowed source statuses: accepted is refused for a client, allowed for an admin", async () => {
    const id = await newRequest("accepted");

    expect(await closeLargeOrder({ kind: "request", id, reason: "client_cancelled", fromStatuses: ["open", "quoted", "published"], clientId: ownerClientId })).toBe(false);
    expect((await stateOf(id)).status).toBe("accepted");

    expect(await closeLargeOrder({ kind: "request", id, reason: "staff_closed", fromStatuses: ["open", "quoted", "published", "accepted"], adminId })).toBe(true);
    expect((await stateOf(id)).status).toBe("closed");
  });

  it("writes the admin close through the audit trail with the admin as actor", async () => {
    const id = await newRequest();

    await closeLargeOrder({ kind: "request", id, reason: "no_offers", fromStatuses: ["open"], adminId });

    const rows = await db.select().from(auditLog).where(eq(auditLog.recordId, id));
    const update = rows.find((row) => row.action === "update");
    expect(update?.actorUserId).toBe(adminId);
  });

  it("works for a product inquiry too", async () => {
    const [inquiry] = await db
      .insert(bulkProductInquiry)
      .values({ clientId: ownerClientId, productId, contactName: "LC Buyer", contactEmail: `lc-${crypto.randomUUID()}@example.test`, unitCount: 10, deliveryCountryCode: "PL" })
      .returning({ id: bulkProductInquiry.id });
    inquiryIds.push(inquiry.id);

    const closed = await closeLargeOrder({ kind: "product", id: inquiry.id, reason: "expired", fromStatuses: ["open"], clientId: ownerClientId });

    expect(closed).toBe(true);
    const [row] = await db.select().from(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiry.id));
    expect(row).toMatchObject({ status: "closed", closedReason: "expired" });
    expect(notifyMock).toHaveBeenCalledWith({ kind: "product", id: inquiry.id });
  });
});
