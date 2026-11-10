import { eq, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// @/lib/observability ciągnie "server-only", który nie ładuje się pod Vitest/jsdom (ta sama granica
// co w project-request-actions.test.ts): mockujemy tylko wejście/wyjście, baza jest prawdziwa (dev).
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
const notifyTeamMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/commercial-display-team", () => ({ notifyTeamOfCommercialDisplayInquiry: notifyTeamMock }));

import { db } from "@/lib/db/client";
import { commercialDisplayInquiry } from "@/lib/db/schema";
import { COMMERCIAL_INQUIRY_LIMITS, COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR } from "./commercial-display-inquiry-specs";
import { submitCommercialDisplayInquiry } from "./commercial-display-inquiry-actions";

const EMAIL_PREFIX = "cdi-test-";
const uniqueEmail = () => `${EMAIL_PREFIX}${crypto.randomUUID()}@example.test`;

const base = (email: string) => ({
  name: "Anna Nowak",
  email,
  countryCode: "PL" as const,
  useCase: "hotel" as const,
  interests: ["displays", "led-wall"] as ("displays" | "led-wall")[],
  message: "Potrzebujemy ekranów przy basenie hotelowym.",
  locale: "pl" as const,
});

async function rowsFor(email: string) {
  return db.select().from(commercialDisplayInquiry).where(eq(commercialDisplayInquiry.contactEmail, email.toLowerCase()));
}

describe.skipIf(!process.env.DATABASE_URL)("lib/commercial-display-inquiry-actions: real DB, mocked mail and analytics", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    notifyTeamMock.mockClear();
  });

  afterAll(async () => {
    await db.delete(commercialDisplayInquiry).where(like(commercialDisplayInquiry.contactEmail, `${EMAIL_PREFIX}%`));
  });

  it("saves a valid inquiry with normalized data and tells the team", async () => {
    const email = uniqueEmail();
    const result = await submitCommercialDisplayInquiry({
      ...base(email.toUpperCase()),
      company: "Hotel Test",
      phone: "+48 600 000 000",
      screenCount: 4,
    });

    expect(result.ok).toBe(true);
    const [row] = await rowsFor(email);
    expect(row).toMatchObject({
      contactName: "Anna Nowak",
      company: "Hotel Test",
      contactEmail: email,
      contactPhone: "+48 600 000 000",
      countryCode: "PL",
      useCase: "hotel",
      interests: ["displays", "led-wall"],
      screenCount: 4,
      contactLocale: "pl",
      status: "new",
    });
    expect(notifyTeamMock).toHaveBeenCalledTimes(1);
    expect(notifyTeamMock).toHaveBeenCalledWith(expect.objectContaining({ id: row.id }));
    expect(trackEventMock).toHaveBeenCalledWith(
      "commercial_display_inquiry_submitted",
      expect.objectContaining({ countryCode: "PL", useCase: "hotel" }),
      row.id,
    );
  });

  it("stores optional fields as null when they are left blank", async () => {
    const email = uniqueEmail();
    await submitCommercialDisplayInquiry({ ...base(email), company: "", phone: "" });

    const [row] = await rowsFor(email);
    expect(row.company).toBeNull();
    expect(row.contactPhone).toBeNull();
    expect(row.screenCount).toBeNull();
  });

  it("rejects invalid input without saving anything", async () => {
    const email = uniqueEmail();
    const result = await submitCommercialDisplayInquiry({ ...base(email), message: "krótko" });

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(await rowsFor(email)).toHaveLength(0);
    expect(notifyTeamMock).not.toHaveBeenCalled();
  });

  it("answers ok to a bot that fills the hidden field, but saves and sends nothing", async () => {
    const email = uniqueEmail();
    const result = await submitCommercialDisplayInquiry({ ...base(email), website: "http://spam.example" });

    expect(result.ok).toBe(true);
    expect(await rowsFor(email)).toHaveLength(0);
    expect(notifyTeamMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("limits inquiries per email address per day", async () => {
    const email = uniqueEmail();
    for (let i = 0; i < COMMERCIAL_INQUIRY_LIMITS.perEmailPerDay; i++) {
      expect((await submitCommercialDisplayInquiry(base(email))).ok).toBe(true);
    }

    const blocked = await submitCommercialDisplayInquiry(base(email));
    expect(blocked).toEqual({ ok: false, error: COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR });
    expect(await rowsFor(email)).toHaveLength(COMMERCIAL_INQUIRY_LIMITS.perEmailPerDay);
    // Inny adres nie jest objęty cudzym limitem.
    expect((await submitCommercialDisplayInquiry(base(uniqueEmail()))).ok).toBe(true);
  });

  it("still reports success and keeps the inquiry when the team mail throws", async () => {
    notifyTeamMock.mockRejectedValueOnce(new Error("resend down"));
    const email = uniqueEmail();
    const result = await submitCommercialDisplayInquiry(base(email));

    expect(result.ok).toBe(true);
    expect(await rowsFor(email)).toHaveLength(1);
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), {
      path: "submitCommercialDisplayInquiry:notify",
    });
  });
});
