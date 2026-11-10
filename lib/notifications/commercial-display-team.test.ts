import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock, trackEvent: vi.fn() }));

import { notifyTeamOfCommercialDisplayInquiry } from "./commercial-display-team";

const ORIGINAL = { ops: process.env.OPERATIONS_NOTIFY_EMAIL, advisor: process.env.ADVISOR_NOTIFY_EMAIL };

const inquiry = {
  id: "11111111-2222-3333-4444-555555555555",
  data: {
    name: "Anna Nowak",
    company: "Hotel Test",
    email: "anna@example.com",
    phone: "+48 600 000 000",
    countryCode: "DE" as const,
    useCase: "hotel" as const,
    interests: ["displays" as const, "led-wall" as const],
    screenCount: 4,
    message: "Potrzebujemy ekranów przy basenie.",
    locale: "de" as const,
  },
};

beforeEach(() => {
  sendMock.mockClear();
  captureErrorMock.mockClear();
  delete process.env.ADVISOR_NOTIFY_EMAIL;
  process.env.OPERATIONS_NOTIFY_EMAIL = "zespol@example.test";
});

afterEach(() => {
  for (const [key, value] of [["OPERATIONS_NOTIFY_EMAIL", ORIGINAL.ops], ["ADVISOR_NOTIFY_EMAIL", ORIGINAL.advisor]] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("notifyTeamOfCommercialDisplayInquiry (spec 0083 AC-7)", () => {
  it("mails the team in Polish with every detail and replies straight to the customer", async () => {
    await notifyTeamOfCommercialDisplayInquiry(inquiry);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call).toMatchObject({
      to: "zespol@example.test",
      emailType: "commercial_display_team_new_inquiry",
      entityId: inquiry.id,
      replyTo: "anna@example.com",
    });
    expect(call.subject).toBe("Nowe zapytanie o ekrany komercyjne: Hotel lub resort, DE");
    for (const fragment of [
      "Anna Nowak",
      "Hotel Test",
      "anna@example.com",
      "+48 600 000 000",
      "Wyświetlacze komercyjne IP66, Ściana LED",
      "Liczba ekranów: 4",
      "Potrzebujemy ekranów przy basenie.",
    ]) {
      expect(call.text).toContain(fragment);
    }
  });

  it("falls back to the advisor address when the operations address is not set", async () => {
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    process.env.ADVISOR_NOTIFY_EMAIL = "doradca@example.test";
    await notifyTeamOfCommercialDisplayInquiry(inquiry);

    expect(sendMock.mock.calls[0][0].to).toBe("doradca@example.test");
  });

  it("sends nothing when no team address is configured", async () => {
    delete process.env.OPERATIONS_NOTIFY_EMAIL;
    await notifyTeamOfCommercialDisplayInquiry(inquiry);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("never throws when sending fails, it reports the error instead", async () => {
    sendMock.mockRejectedValueOnce(new Error("resend down"));

    await expect(notifyTeamOfCommercialDisplayInquiry(inquiry)).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifyTeamOfCommercialDisplayInquiry" });
  });
});
