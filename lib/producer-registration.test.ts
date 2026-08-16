import { describe, expect, it } from "vitest";
import type { CountryCode } from "./data/types";
import { normalizeNip, NIP_PATTERN, parseRegistrationDetails } from "./producer-registration";

const knownCountryCodes = new Set<CountryCode>(["PL", "DE", "NL"]);

describe("normalizeNip", () => {
  it("strips spaces", () => {
    expect(normalizeNip("123 456 78 90")).toBe("1234567890");
  });

  it("strips hyphens", () => {
    expect(normalizeNip("123-456-78-90")).toBe("1234567890");
  });

  it("strips a mix of spaces and hyphens", () => {
    expect(normalizeNip("123-456 78-90")).toBe("1234567890");
  });

  it("leaves an already normalized value unchanged", () => {
    expect(normalizeNip("1234567890")).toBe("1234567890");
  });
});

describe("NIP_PATTERN", () => {
  it("matches exactly 10 digits", () => {
    expect(NIP_PATTERN.test("1234567890")).toBe(true);
  });

  it("rejects fewer than 10 digits", () => {
    expect(NIP_PATTERN.test("123456789")).toBe(false);
  });

  it("rejects more than 10 digits", () => {
    expect(NIP_PATTERN.test("12345678901")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(NIP_PATTERN.test("123-456-78-90")).toBe(false);
  });
});

describe("parseRegistrationDetails", () => {
  it("returns the parsed details for a fully valid set of params", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "PL,DE", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toEqual({ nip: "1234567890", countries: ["PL", "DE"], technology: "szkielet-drewniany" });
  });

  it("returns null when nip is missing", () => {
    expect(
      parseRegistrationDetails({ countries: "PL", technology: "szkielet-drewniany" }, knownCountryCodes)
    ).toBeNull();
  });

  it("returns null when nip is not 10 digits", () => {
    expect(
      parseRegistrationDetails(
        { nip: "123", countries: "PL", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("returns null when nip is given as an array (repeated query param)", () => {
    expect(
      parseRegistrationDetails(
        { nip: ["1234567890", "1234567890"], countries: "PL", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("returns null when countries is missing", () => {
    expect(
      parseRegistrationDetails({ nip: "1234567890", technology: "szkielet-drewniany" }, knownCountryCodes)
    ).toBeNull();
  });

  it("returns null when countries is an empty string", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("returns null when countries is given as an array (repeated query param)", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: ["PL", "DE"], technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("returns null when technology is missing", () => {
    expect(
      parseRegistrationDetails({ nip: "1234567890", countries: "PL" }, knownCountryCodes)
    ).toBeNull();
  });

  it("returns null when technology is not one of the known values", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "PL", technology: "wybudowany-z-cegiel" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("drops duplicate country codes", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "PL,PL,DE", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toEqual({ nip: "1234567890", countries: ["PL", "DE"], technology: "szkielet-drewniany" });
  });

  it("drops country codes not present in knownCountryCodes", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "PL,XX,DE", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toEqual({ nip: "1234567890", countries: ["PL", "DE"], technology: "szkielet-drewniany" });
  });

  it("returns null when every country code is unknown", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "XX,YY", technology: "szkielet-drewniany" },
        knownCountryCodes
      )
    ).toBeNull();
  });

  it("returns null when knownCountryCodes is empty regardless of countries", () => {
    expect(
      parseRegistrationDetails(
        { nip: "1234567890", countries: "PL,DE", technology: "szkielet-drewniany" },
        new Set()
      )
    ).toBeNull();
  });
});
