import { afterEach, describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

// Globalny mock getTranslations (vitest.setup.ts) zawsze czyta polskie teksty; ten test
// sprawdza właśnie język odbiorcy, więc czyta plik tłumaczeń wskazanego języka.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const messages = (await import(`../../messages/${locale}.json`)).default as Record<string, Record<string, string>>;
    return (key: string, values: Record<string, string | number> = {}) =>
      messages[namespace][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));
  },
}));

import { notifyClientOfPublishedSummary, notifyClientOfRequestOnBehalf } from "./large-order-client";

const input = {
  kind: "request" as const,
  id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
  email: "klient@example.test",
  name: "Hans Muster",
  locale: "de",
  countryCode: "DE",
  unitCount: 12,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
};

// Spec 0070 AC-20, AC-23: mail do klienta w jego języku, link wraca na /{locale}/panel/quotes.
describe("notifyClientOfRequestOnBehalf", () => {
  afterEach(() => {
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
    delete process.env.AUTH_URL;
  });

  it("writes the email in the client language and points the login link back to the localized quotes panel", async () => {
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyClientOfRequestOnBehalf(input);

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({ to: "klient@example.test", emailType: "large_order_client_request_on_behalf" });
    expect(call.subject).toBe("ModularHub hat in Ihrem Namen eine Anfrage gestellt");
    expect(call.text).toContain("Hans Muster");
    expect(call.text).toContain(
      `https://hub.example.test/de/login?callbackUrl=${encodeURIComponent("/de/panel/quotes")}`,
    );
  });

  it("never throws when sending fails, the error goes to Sentry", async () => {
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(notifyClientOfRequestOnBehalf(input)).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});

// Spec 0070 AC-14, AC-23, AC-24: mail o opublikowanym podsumowaniu, w języku zapytania.
describe("notifyClientOfPublishedSummary", () => {
  afterEach(() => {
    sendNotificationEmailMock.mockClear();
    captureErrorMock.mockClear();
    delete process.env.AUTH_URL;
  });

  const summary = {
    kind: "request" as const,
    id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
    email: "klient@example.test",
    name: "Hans Muster",
    locale: "de",
    countryCode: "DE",
    unitCount: 12,
  };

  it("writes in the request language and links to the localized quotes panel, with no prices or producer names", async () => {
    process.env.AUTH_URL = "https://hub.example.test/";

    await notifyClientOfPublishedSummary(summary);

    expect(sendNotificationEmailMock).toHaveBeenCalledTimes(1);
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call).toMatchObject({ to: "klient@example.test", emailType: "large_order_client_summary_published" });
    expect(call.subject).toBe("Der Angebotsvergleich zu Ihrer Anfrage ist fertig");
    expect(call.text).toContain("Hans Muster");
    expect(call.text).toContain(
      `https://hub.example.test/de/login?callbackUrl=${encodeURIComponent("/de/panel/quotes")}`,
    );
  });

  it("never throws when sending fails, the error goes to Sentry", async () => {
    sendNotificationEmailMock.mockRejectedValueOnce(new Error("provider down"));

    await expect(notifyClientOfPublishedSummary(summary)).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});
