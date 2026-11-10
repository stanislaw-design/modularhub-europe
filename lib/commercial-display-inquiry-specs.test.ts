import { describe, expect, it } from "vitest";
import { COMMERCIAL_INQUIRY_LIMITS, commercialDisplayInquirySchema } from "./commercial-display-inquiry-specs";

const valid = {
  name: "Anna Nowak",
  email: "  Anna@Example.COM ",
  countryCode: "PL",
  useCase: "hotel",
  interests: ["displays"],
  message: "Potrzebujemy trzech ekranów przy basenie.",
  locale: "pl",
} as const;

describe("commercialDisplayInquirySchema (spec 0083)", () => {
  it("accepts a minimal valid inquiry and normalizes the email", () => {
    const parsed = commercialDisplayInquirySchema.parse(valid);

    expect(parsed.email).toBe("anna@example.com");
    expect(parsed.company).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.screenCount).toBeUndefined();
  });

  it("turns blank optional text into undefined", () => {
    const parsed = commercialDisplayInquirySchema.parse({ ...valid, company: "  ", phone: "" });

    expect(parsed.company).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
  });

  it.each([
    ["a too short name", { name: "A" }],
    ["an invalid email", { email: "not-an-email" }],
    ["a country outside the six markets", { countryCode: "US" }],
    ["an unknown use case", { useCase: "casino" }],
    ["no interests", { interests: [] }],
    ["an unknown interest", { interests: ["tv"] }],
    ["a message below the minimum", { message: "krótko" }],
    ["a message above the maximum", { message: "x".repeat(COMMERCIAL_INQUIRY_LIMITS.messageMax + 1) }],
    ["zero screens", { screenCount: 0 }],
    ["too many screens", { screenCount: COMMERCIAL_INQUIRY_LIMITS.screenCountMax + 1 }],
    ["a fractional screen count", { screenCount: 2.5 }],
    ["an unsupported locale", { locale: "fr" }],
  ])("rejects %s", (_label, override) => {
    expect(commercialDisplayInquirySchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("accepts every supported locale and the largest allowed screen count", () => {
    for (const locale of ["pl", "en", "de", "nl"] as const) {
      expect(commercialDisplayInquirySchema.safeParse({ ...valid, locale }).success).toBe(true);
    }
    expect(
      commercialDisplayInquirySchema.safeParse({ ...valid, screenCount: COMMERCIAL_INQUIRY_LIMITS.screenCountMax }).success,
    ).toBe(true);
  });
});
