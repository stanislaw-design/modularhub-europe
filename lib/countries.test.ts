import { describe, expect, it } from "vitest";
import { COUNTRY_FLAGS, MARKET_COUNTRY_CODES, isMarketCountryCode } from "./countries";

// Spec 0082 AC-1, AC-2: jedna lista sześciu krajów rynku, strażnik typu i mapa flag.
describe("market countries (spec 0082)", () => {
  it("lists exactly the six market countries in a fixed order (AC-1)", () => {
    expect([...MARKET_COUNTRY_CODES]).toEqual(["PL", "DE", "NL", "BE", "IT", "FR"]);
  });

  it.each(["PL", "DE", "NL", "BE", "IT", "FR"])("accepts %s as a market country (AC-1)", (code) => {
    expect(isMarketCountryCode(code)).toBe(true);
  });

  it.each(["US", "XX", "pl", "Pl", "", " PL", "PL ", "GB"])("rejects %j as a market country (AC-1)", (code) => {
    expect(isMarketCountryCode(code)).toBe(false);
  });

  it.each([null, undefined, 0, 1, true, {}, ["PL"], Symbol("PL")])("rejects the non string value %p (AC-1)", (value) => {
    expect(isMarketCountryCode(value)).toBe(false);
  });

  it("has one non empty flag for every market country and no extra entries (AC-2)", () => {
    expect(Object.keys(COUNTRY_FLAGS).sort()).toEqual([...MARKET_COUNTRY_CODES].sort());
    for (const code of MARKET_COUNTRY_CODES) {
      expect(COUNTRY_FLAGS[code].length).toBeGreaterThan(0);
    }
  });

  it("uses a different flag for each country (AC-2)", () => {
    expect(new Set(Object.values(COUNTRY_FLAGS)).size).toBe(MARKET_COUNTRY_CODES.length);
  });
});
