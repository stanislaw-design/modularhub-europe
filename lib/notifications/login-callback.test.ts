import { describe, expect, it } from "vitest";
import { parseGuestLinkVariant } from "./login-callback";

const ID = "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607";
const link = (callback: string) =>
  `https://modularhub.eu/api/auth/callback/resend?callbackUrl=${encodeURIComponent(callback)}&token=abc&email=a%40b.test`;

// Spec 0066 AC-7, AC-10, AC-16: marker `welcome` w adresie powrotu wybiera wariant maila.
describe("parseGuestLinkVariant", () => {
  it("reads the new variant, locale and inquiry id from a relative callback", () => {
    expect(parseGuestLinkVariant(link(`/nl/panel/inquiries/${ID}?welcome=new`))).toEqual({
      variant: "new",
      inquiryId: ID,
      locale: "nl",
    });
  });

  it("reads the existing variant from an absolute callback", () => {
    expect(parseGuestLinkVariant(link(`https://modularhub.eu/de/panel/inquiries/${ID}?welcome=existing`))).toEqual({
      variant: "existing",
      inquiryId: ID,
      locale: "de",
    });
  });

  it("falls back to the default locale for an unknown locale segment", () => {
    expect(parseGuestLinkVariant(link(`/xx/panel/inquiries/${ID}?welcome=new`))?.locale).toBe("pl");
  });

  it("returns null for a normal login link, an unknown marker or a different path", () => {
    expect(parseGuestLinkVariant(link("/pl/panel"))).toBeNull();
    expect(parseGuestLinkVariant(link(`/pl/panel/inquiries/${ID}`))).toBeNull();
    expect(parseGuestLinkVariant(link(`/pl/panel/inquiries/${ID}?welcome=admin`))).toBeNull();
    expect(parseGuestLinkVariant(link(`/pl/internal/cases/${ID}?welcome=new`))).toBeNull();
    expect(parseGuestLinkVariant("https://modularhub.eu/api/auth/callback/resend?token=abc")).toBeNull();
    expect(parseGuestLinkVariant("not a url")).toBeNull();
  });
});
