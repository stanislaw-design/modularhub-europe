import { describe, expect, it } from "vitest";
import {
  COMMUNICATION_LOCALES,
  getProducerCommunicationLocale,
  groupByCommunicationLocale,
  intlLocaleFor,
  isCommunicationLocale,
  normalizeCommunicationLocale,
} from "./producer-communication-locale";

// Spec 0077 AC-29, AC-30.
describe("producer communication locale helpers", () => {
  it("accepts exactly the four languages", () => {
    expect([...COMMUNICATION_LOCALES]).toEqual(["pl", "en", "de", "nl"]);
    for (const value of COMMUNICATION_LOCALES) expect(isCommunicationLocale(value)).toBe(true);
    for (const value of ["fr", "PL", "", null, undefined, 3]) expect(isCommunicationLocale(value)).toBe(false);
  });

  it("falls back to pl for an invalid or missing value", () => {
    expect(normalizeCommunicationLocale("de")).toBe("de");
    for (const value of ["fr", "", null, undefined]) expect(normalizeCommunicationLocale(value)).toBe("pl");
  });

  it("formats dates by the recipient language", () => {
    const date = new Date("2026-11-05T12:00:00Z");
    const format = (locale: "pl" | "en" | "de" | "nl") =>
      new Intl.DateTimeFormat(intlLocaleFor(locale), { dateStyle: "long", timeZone: "UTC" }).format(date);
    expect(format("pl")).toContain("listopada");
    expect(format("de")).toContain("November");
    expect(format("nl")).toContain("november");
    expect(format("en")).toContain("November");
  });

  it("groups recipients by language so each mail renders once per language", () => {
    const groups = groupByCommunicationLocale([
      { email: "a", locale: "pl" as const },
      { email: "b", locale: "de" as const },
      { email: "c", locale: "pl" as const },
    ]);
    expect(groups.get("pl")?.map((item) => item.email)).toEqual(["a", "c"]);
    expect(groups.get("de")?.map((item) => item.email)).toEqual(["b"]);
    expect(groups.has("nl")).toBe(false);
  });

  it.skipIf(!process.env.DATABASE_URL)("returns pl for a missing producer (AC-30)", async () => {
    expect(await getProducerCommunicationLocale(crypto.randomUUID())).toBe("pl");
  });
});
