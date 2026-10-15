import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const notifyOfConnectionMock = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));
vi.mock("@/lib/notifications/large-order-connection", () => ({
  notifyOfConnection: notifyOfConnectionMock,
  notifyTeamOfPendingSelection: vi.fn(),
}));

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { client, producer, projectQuote, projectRequest, users } from "@/lib/db/schema";
import { connectSelectionAsAdmin } from "./large-order-admin-actions";
import { getPendingSelections } from "./large-order-connection";

function sessionAs(userId: string, role: "admin" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0070 AC-17: przycisk administratora dla wyboru oczekującego na połączenie. Ta sama
// idempotentna funkcja co po wyborze klienta, wołana tylko przez administratora.
describe.skipIf(!process.env.DATABASE_URL)("connectSelectionAsAdmin: real DB, mocked auth", () => {
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  let quoteId: string;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `lca-admin-${adminUserId}@example.test`, phone: "+48000000400", role: "admin" },
      { id: clientUserId, email: `lca-client-${clientUserId}@example.test`, phone: "+48000000401", role: "client" },
      { id: producerUserId, email: `lca-producer-${producerUserId}@example.test`, phone: "+48000000402", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `LCA${producerId.slice(0, 7)}`,
      name: "LCA Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(projectRequest).values({
      id: requestId,
      clientId,
      contactName: "LCA Investor",
      contactEmail: `lca-investor-${requestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "published",
    });
    const [quote] = await db
      .insert(projectQuote)
      .values({ projectRequestId: requestId, producerId, totalPriceCents: 100_000_000, status: "active", publishedToClientAt: new Date() })
      .returning({ id: projectQuote.id });
    quoteId = quote.id;
    await db.update(projectRequest).set({ selectedQuoteId: quoteId, selectedAt: new Date() }).where(eq(projectRequest.id, requestId));
  });

  afterEach(() => {
    authMock.mockReset();
    notifyOfConnectionMock.mockClear();
  });

  afterAll(async () => {
    await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
    await db.delete(projectQuote).where(eq(projectQuote.producerId, producerId));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(eq(users.id, adminUserId));
    await db.delete(users).where(eq(users.id, clientUserId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  it("refuses a client session and anonymous callers, changing nothing", async () => {
    authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
    expect((await connectSelectionAsAdmin("request", requestId)).ok).toBe(false);
    authMock.mockResolvedValue(null);
    expect((await connectSelectionAsAdmin("request", requestId)).ok).toBe(false);

    const [row] = await db.select({ status: projectQuote.status }).from(projectQuote).where(eq(projectQuote.id, quoteId));
    expect(row.status).toBe("active");
  });

  it("lists the waiting choice for the cleanup job", async () => {
    const pending = await getPendingSelections({ clientId });

    expect(pending).toEqual([{ kind: "request", id: requestId }]);
  });

  it("explains that the company data must be approved first, and connects nothing", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const result = await connectSelectionAsAdmin("request", requestId);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/B2B/);
    expect(notifyOfConnectionMock).not.toHaveBeenCalled();
  });

  it("connects the parties once the company data is approved, and a second click is harmless", async () => {
    await db.update(client).set({ b2bVerificationStatus: "approved" }).where(eq(client.id, clientId));
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    const first = await connectSelectionAsAdmin("request", requestId);
    const second = await connectSelectionAsAdmin("request", requestId);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const [row] = await db
      .select({ status: projectQuote.status, revealed: projectQuote.contactRevealedAt })
      .from(projectQuote)
      .where(eq(projectQuote.id, quoteId));
    expect(row.status).toBe("accepted");
    expect(row.revealed).not.toBeNull();
    expect(notifyOfConnectionMock).toHaveBeenCalledTimes(1);
    expect(await getPendingSelections({ clientId })).toEqual([]);
  });

  it("rejects an invalid id", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

    expect((await connectSelectionAsAdmin("request", "not-a-uuid")).ok).toBe(false);
  });
});
