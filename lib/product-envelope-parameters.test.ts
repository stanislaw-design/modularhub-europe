import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_COUNTRY_CODES,
  ENVELOPE_ELEMENTS,
  envelopeSymbol,
  isQuantityAllowedForElement,
  productEnvelopeParameterInputSchema,
  supportsEnvelopeParameters,
} from "./product-envelope-parameters";
import { isIntendedUseConsistent } from "./intended-use";

const valid = {
  element: "wall",
  quantity: "u_value",
  value: "0,22",
  method: "calculation",
  methodNote: "  EN ISO 6946  ",
  asOfDate: "2026-10-01",
} as const;

describe("productEnvelopeParameterInputSchema (spec 0075 AC-2)", () => {
  it("accepts a polish decimal comma and trims the method note", () => {
    const parsed = productEnvelopeParameterInputSchema.parse(valid);
    expect(parsed.value).toBe(0.22);
    expect(parsed.methodNote).toBe("EN ISO 6946");
  });

  it("turns an empty note into null", () => {
    expect(productEnvelopeParameterInputSchema.parse({ ...valid, methodNote: "" }).methodNote).toBeNull();
  });

  it("rejects Rc for a door, a window and glazing", () => {
    for (const element of ["door", "window", "glazing"] as const) {
      expect(
        productEnvelopeParameterInputSchema.safeParse({ ...valid, element, quantity: "rc_value", value: "2" }).success,
      ).toBe(false);
    }
  });

  it("accepts Rc for a wall", () => {
    expect(
      productEnvelopeParameterInputSchema.safeParse({ ...valid, quantity: "rc_value", value: "4.5" }).success,
    ).toBe(true);
  });

  it("rejects a U value of 9 and one below 0.05", () => {
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, value: "9" }).success).toBe(false);
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, value: "0.01" }).success).toBe(false);
  });

  it("rejects an Rc value above 20 and non numeric input", () => {
    expect(
      productEnvelopeParameterInputSchema.safeParse({ ...valid, quantity: "rc_value", value: "25" }).success,
    ).toBe(false);
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, value: "abc" }).success).toBe(false);
  });

  it("rejects a note over 300 characters and a malformed date", () => {
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, methodNote: "x".repeat(301) }).success).toBe(
      false,
    );
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, asOfDate: "01.10.2026" }).success).toBe(false);
    expect(productEnvelopeParameterInputSchema.safeParse({ ...valid, asOfDate: "2026-13-45" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("allows Rc only for solid building parts", () => {
    expect(ENVELOPE_ELEMENTS.filter((element) => isQuantityAllowedForElement(element, "rc_value"))).toEqual([
      "wall",
      "roof",
      "floor_ground",
      "floor_air",
    ]);
  });

  it("names the symbols Uw, Ug and Ud for window, glazing and door", () => {
    expect(envelopeSymbol("window", "u_value")).toBe("Uw");
    expect(envelopeSymbol("glazing", "u_value")).toBe("Ug");
    expect(envelopeSymbol("door", "u_value")).toBe("Ud");
    expect(envelopeSymbol("wall", "rc_value")).toBe("Rc");
    expect(envelopeSymbol("roof", "u_value")).toBe("U");
  });

  it("supports a house and a residential container only (spec 0075 AC-4)", () => {
    expect(supportsEnvelopeParameters({ family: "dom" })).toBe(true);
    expect(supportsEnvelopeParameters({ family: "kontenery-modulowe", containerSubcategory: "mieszkalne" })).toBe(true);
    expect(supportsEnvelopeParameters({ family: "kontenery-modulowe", containerSubcategory: "gastronomiczne" })).toBe(
      false,
    );
    expect(supportsEnvelopeParameters({ family: "spa-modulowe" })).toBe(false);
  });

  it("compliance countries include BE, IT and FR (spec 0075 AC-8)", () => {
    expect(COMPLIANCE_COUNTRY_CODES).toEqual(["PL", "DE", "NL", "BE", "IT", "FR"]);
  });

  it("intended use needs months exactly when seasonal (spec 0075 AC-7)", () => {
    expect(isIntendedUseConsistent({})).toBe(true);
    expect(isIntendedUseConsistent({ intendedUse: "year_round" })).toBe(true);
    expect(isIntendedUseConsistent({ intendedUse: "seasonal", intendedUseMonths: 5 })).toBe(true);
    expect(isIntendedUseConsistent({ intendedUse: "seasonal" })).toBe(false);
    expect(isIntendedUseConsistent({ intendedUse: "year_round", intendedUseMonths: 5 })).toBe(false);
    expect(isIntendedUseConsistent({ intendedUseMonths: 5 })).toBe(false);
  });
});

// Spec 0075 AC-11, AC-16: the explanation texts exist in all four languages, are real
// translations, and never claim compliance with the rules of a country.
describe("EnvelopeParameters messages", () => {
  const locales = ["pl", "en", "de", "nl"] as const;
  const forbidden = [
    "zgodne z",
    "zgodny z",
    "spełnia przepisy",
    "spełnia wymagania",
    "complies with",
    "compliant with",
    "meets the requirements",
    "konform",
    "entspricht den",
    "erfüllt die",
    "voldoet aan",
  ];
  const messages = Object.fromEntries(
    locales.map((locale) => [locale, JSON.parse(readFileSync(`messages/${locale}.json`, "utf-8"))]),
  ) as Record<(typeof locales)[number], { EnvelopeParameters: Record<string, unknown> }>;

  function flatten(value: unknown, prefix = ""): [string, string][] {
    if (typeof value === "string") return [[prefix, value]];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  it("has the same keys in every language", () => {
    const keys = (locale: (typeof locales)[number]) =>
      flatten(messages[locale].EnvelopeParameters)
        .map(([key]) => key)
        .sort();
    for (const locale of ["en", "de", "nl"] as const) expect(keys(locale)).toEqual(keys("pl"));
  });

  it("is a real translation, not a copy of the polish text", () => {
    const pl = new Map(flatten(messages.pl.EnvelopeParameters));
    for (const locale of ["en", "de", "nl"] as const) {
      const same = flatten(messages[locale].EnvelopeParameters).filter(
        ([key, text]) => text === pl.get(key) && text.split(" ").length > 3,
      );
      expect(same).toEqual([]);
    }
  });

  it("never uses a phrase that announces compliance with rules", () => {
    for (const locale of locales) {
      for (const [key, text] of flatten(messages[locale].EnvelopeParameters)) {
        for (const phrase of forbidden) expect(text.toLowerCase(), `${locale} ${key}`).not.toContain(phrase);
      }
    }
  });
});
