import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import {
  hasTeamRecipient,
  notifyTeamOfClientCancelledRequest,
  notifyTeamOfDeadlinePassed,
  notifyTeamOfNewLargeOrder,
  notifyTeamOfNewQuote,
} from "./large-order-team";

const order = {
  kind: "request" as const,
  id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
  countryCode: "DE",
  unitCount: 12,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
  contactLocale: "de",
};

// Spec 0070 AC-24 (część): mail do zespołu o nowym zapytaniu, po polsku, bez
// danych kontaktowych klienta. Best effort.
describe("notifyTeamOfNewLargeOrder", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    delete process.env.ADVISOR_NOTIFY_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
  });

  it("sends nothing when no team address is configured", async () => {
    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends a Polish email to OPERATIONS_NOTIFY_EMAIL with a link to the admin screen and the order facts", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({
      to: "ops@example.test",
      emailType: "large_order_team_new_request",
      entityId: order.id,
    });
    expect(call.subject).toBe("Nowe zapytanie o duże zamówienie (12 domów, DE)");
    expect(call.text).toContain(`https://hub.example.test/pl/internal/large-orders/${order.id}?kind=request`);
    expect(call.text).toContain("12");
    expect(call.text).toContain("Język klienta: de");
  });

  // Spec 0070 AC-10: zapytanie, którego nie widzi żaden producent, jest alertem.
  it("turns into an alert when no producer matches the request", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    await notifyTeamOfNewLargeOrder({ ...order, matchedProducerCount: 0 });

    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.subject).toBe("Brak dopasowanych producentów: zapytanie o duże zamówienie (12 domów, DE)");
    expect(call.text).toContain("Żaden producent nie widzi tego zapytania");
    expect(call.text).toContain("Dopasowani producenci: 0");
  });

  it("keeps the normal subject and lists the count when producers match", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    await notifyTeamOfNewLargeOrder({ ...order, matchedProducerCount: 4 });

    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.subject).toBe("Nowe zapytanie o duże zamówienie (12 domów, DE)");
    expect(call.text).not.toContain("Żaden producent nie widzi");
    expect(call.text).toContain("Dopasowani producenci: 4");
  });

  it("leaves out the matched line when the count is unknown (product inquiry)", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock.mock.calls[0][0].text).not.toContain("Dopasowani producenci");
  });

  it("falls back to ADVISOR_NOTIFY_EMAIL when the new variable is not set", async () => {
    process.env.ADVISOR_NOTIFY_EMAIL = "advisor@example.test";

    await notifyTeamOfNewLargeOrder(order);

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "advisor@example.test" }));
  });

  it("reports a send failure to Sentry instead of throwing", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("resend down"));

    await expect(notifyTeamOfNewLargeOrder(order)).resolves.toBeUndefined();

    expect(captureErrorMock).toHaveBeenCalled();
  });
});

// Spec 0070 AC-37: zespół dostaje mail po zamknięciu przez klienta tylko wtedy, gdy zapytanie
// miało opublikowane podsumowanie albo wybór czekający na B2B.
describe("notifyTeamOfClientCancelledRequest", () => {
  const originalEnv = { ...process.env };
  const cancelled = { kind: "request" as const, id: order.id, countryCode: "DE", unitCount: 12, wasPublished: false, hadPendingSelection: false };

  beforeEach(() => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    process.env.AUTH_URL = "https://hub.example.test";
    sendNotificationEmailMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("stays silent for a plain open request", async () => {
    await notifyTeamOfClientCancelledRequest(cancelled);

    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends a Polish email with a link to the admin screen for a published request", async () => {
    await notifyTeamOfClientCancelledRequest({ ...cancelled, wasPublished: true });

    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({ to: "ops@example.test", emailType: "large_order_team_client_cancelled", entityId: order.id });
    expect(call.subject).toBe("Klient zamknął zapytanie o duże zamówienie (12 domów, DE)");
    expect(call.text).toContain("Podsumowanie dla tego zapytania było już opublikowane.");
    expect(call.text).toContain(`https://hub.example.test/pl/internal/large-orders/${order.id}?kind=request`);
  });

  it("mentions the pending B2B selection", async () => {
    await notifyTeamOfClientCancelledRequest({ ...cancelled, hadPendingSelection: true });

    expect(sendNotificationEmailMock.mock.calls[0][0].text).toContain("wybór czekał na zatwierdzenie danych firmy");
  });
});

// Spec 0070 AC-24: nowa oferta, mail do zespołu po polsku.
describe("notifyTeamOfNewQuote", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    sendNotificationEmailMock.mockClear();
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    delete process.env.ADVISOR_NOTIFY_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
  });

  const quote = { kind: "request" as const, id: order.id, countryCode: "DE", unitCount: 12, producerName: "Dom Test", totalPriceCents: 123450 };

  it("sends nothing without a team address", async () => {
    await notifyTeamOfNewQuote(quote);
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("names the producer and the total price and links to the admin screen", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyTeamOfNewQuote(quote);

    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({ to: "ops@example.test", emailType: "large_order_team_new_quote", entityId: order.id });
    expect(call.subject).toBe("Nowa oferta na zapytanie (12 domów, DE)");
    expect(call.text).toContain("Dom Test");
    expect(call.text).toContain(`https://hub.example.test/pl/internal/large-orders/${order.id}?kind=request`);
  });

  it("never throws when sending fails", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(notifyTeamOfNewQuote(quote)).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});

// Spec 0070 AC-25: alert w dniu terminu, z liczbą ofert, także gdy ofert nie ma.
describe("notifyTeamOfDeadlinePassed", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    sendNotificationEmailMock.mockClear();
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    delete process.env.ADVISOR_NOTIFY_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sendNotificationEmailMock.mockClear();
  });

  const passed = { kind: "product" as const, id: order.id, countryCode: "NL", unitCount: 4 };

  it("reports whether a team address exists", () => {
    expect(hasTeamRecipient()).toBe(false);
    process.env.ADVISOR_NOTIFY_EMAIL = "advisor@example.test";
    expect(hasTeamRecipient()).toBe(true);
  });

  it("returns false and sends nothing without a team address", async () => {
    expect(await notifyTeamOfDeadlinePassed({ ...passed, activeQuoteCount: 2 })).toBe(false);
    expect(sendNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("adds the close or extend hint only when there are no offers", async () => {
    process.env.OPERATIONS_NOTIFY_EMAIL = "ops@example.test";

    expect(await notifyTeamOfDeadlinePassed({ ...passed, activeQuoteCount: 0 })).toBe(true);
    const empty = sendNotificationEmailMock.mock.calls[0][0];
    expect(empty).toMatchObject({ emailType: "large_order_team_deadline" });
    expect(empty.text).toContain("Nie ma żadnej oferty");

    await notifyTeamOfDeadlinePassed({ ...passed, activeQuoteCount: 3 });
    const withOffers = sendNotificationEmailMock.mock.calls[1][0];
    expect(withOffers.text).toContain("3");
    expect(withOffers.text).not.toContain("Nie ma żadnej oferty");
  });
});
