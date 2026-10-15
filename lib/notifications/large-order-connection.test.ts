import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("./send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn(), trackEvent: vi.fn() }));

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { client, producer, projectQuote, projectRequest, users } from "@/lib/db/schema";
import { notifyOfConnection, notifyTeamOfPendingSelection } from "./large-order-connection";

// Spec 0070 AC-17, część C: maile połączenia. Klient w języku zapytania dostaje dane producenta,
// producent po polsku dane klienta, zespół kopię z danymi obu stron. Prawdziwa baza dev, wysyłka
// zamockowana na granicy (sendNotificationEmail).
describe.skipIf(!process.env.DATABASE_URL)("large-order connection emails: real DB, mocked sender", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const originalEnv = { ...process.env };
  const investorEmail = `lcn-investor-${requestId}@example.test`;
  const producerEmail = `lcn-producer-${producerUserId}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `lcn-client-${clientUserId}@example.test`, phone: "+48000000500", role: "client" },
      { id: producerUserId, email: producerEmail, phone: "+48000000501", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `LCN${producerId.slice(0, 7)}`,
      name: "LCN Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(projectRequest).values({
      id: requestId,
      clientId,
      contactName: "Anna Investor",
      contactEmail: investorEmail,
      contactPhone: "+49123456789",
      contactLocale: "de",
      countryCode: "DE",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "accepted",
    });
    const [quote] = await db
      .insert(projectQuote)
      .values({
        projectRequestId: requestId,
        producerId,
        totalPriceCents: 100_000_000,
        status: "accepted",
        contactRevealedAt: new Date(),
        publishedToClientAt: new Date(),
      })
      .returning({ id: projectQuote.id });
    await db.update(projectRequest).set({ selectedQuoteId: quote.id, selectedAt: new Date() }).where(eq(projectRequest.id, requestId));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sendNotificationEmailMock.mockClear();
  });

  afterAll(async () => {
    await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
    await db.delete(projectQuote).where(eq(projectQuote.producerId, producerId));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(eq(users.id, clientUserId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  it("sends the client the producer's data, the producer the client's data, and the team a copy", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    await notifyOfConnection({ kind: "request", id: requestId });

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(3);
    const calls = sendNotificationEmailMock.mock.calls.map(([input]) => input);
    const toClient = calls.find((call) => call.emailType === "large_order_client_connected");
    const toProducer = calls.find((call) => call.emailType === "large_order_producer_connected");
    const toTeam = calls.find((call) => call.emailType === "large_order_team_connected");

    expect(toClient.to).toBe(investorEmail);
    // vitest.setup.ts podstawia polski katalog dla każdego języka, więc brzmienie en, de i nl
    // pilnuje test kluczy w lib/i18n, a tutaj sprawdzamy, kto co dostaje.
    expect(toClient.subject).toBe("Połączyliśmy Cię z producentem LCN Producer");
    expect(toClient.text).toContain(producerEmail);
    expect(toClient.text).not.toContain("+49123456789");

    expect(toProducer.to).toBe(producerEmail);
    expect(toProducer.subject).toBe("Klient wybrał Twoją ofertę");
    expect(toProducer.text).toContain("Anna Investor");
    expect(toProducer.text).toContain(investorEmail);
    expect(toProducer.text).toContain("+49123456789");

    expect(toTeam.to).toBe("ops@example.test");
    expect(toTeam.text).toContain("LCN Producer");
    expect(toTeam.text).toContain("Anna Investor");
  });

  it("skips the team copy when no team address is configured", async () => {
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    delete process.env.ADVISOR_NOTIFY_EMAIL;

    await notifyOfConnection({ kind: "request", id: requestId });

    expect(sendNotificationEmailMock.mock.calls.map(([input]) => input.emailType).sort()).toEqual([
      "large_order_client_connected",
      "large_order_producer_connected",
    ]);
  });

  it("alerts the team about a choice waiting for company approval, without client contact data", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    await notifyTeamOfPendingSelection({ kind: "request", id: requestId });

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.emailType).toBe("large_order_team_pending_selection");
    expect(call.subject).toBe("Wybór klienta czeka na zatwierdzenie danych firmy (12 domów, DE)");
    expect(call.text).not.toContain(investorEmail);
  });
});
