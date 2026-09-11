import { describe, expect, it } from "vitest";
import { getMockAssemblyPriceEur, PLOT_ANALYSIS_CURRENCY, PLOT_ANALYSIS_PRICE_EUR } from "./pricing";

describe("PLOT_ANALYSIS_PRICE_EUR / PLOT_ANALYSIS_CURRENCY", () => {
  it("exposes the fixed plot analysis price and currency", () => {
    expect(PLOT_ANALYSIS_PRICE_EUR).toBe(149);
    expect(PLOT_ANALYSIS_CURRENCY).toBe("EUR");
  });
});

describe("getMockAssemblyPriceEur", () => {
  it("returns a distinct flat rate per delivery country", () => {
    const pl = getMockAssemblyPriceEur("PL");
    const de = getMockAssemblyPriceEur("DE");
    const nl = getMockAssemblyPriceEur("NL");

    expect(pl).toBe(1800);
    expect(de).toBe(2600);
    expect(nl).toBe(2900);
    expect(new Set([pl, de, nl]).size).toBe(3);
  });

  it("returns the same value on repeated calls for the same country", () => {
    expect(getMockAssemblyPriceEur("DE")).toBe(getMockAssemblyPriceEur("DE"));
  });
});
