import { describe, expect, it } from "vitest";
import { PLOT_ANALYSIS_CURRENCY, PLOT_ANALYSIS_PRICE_EUR, getBindingOfferPriceEur } from "./pricing";

describe("PLOT_ANALYSIS_PRICE_EUR / PLOT_ANALYSIS_CURRENCY", () => {
  it("is a single positive constant price shared by every plot analysis gateway", () => {
    expect(PLOT_ANALYSIS_PRICE_EUR).toBeGreaterThan(0);
    expect(PLOT_ANALYSIS_CURRENCY).toBe("EUR");
  });
});

describe("getBindingOfferPriceEur", () => {
  it("returns the project's priceMax, not priceMin or a computed midpoint", () => {
    expect(getBindingOfferPriceEur({ priceMax: 142000 })).toBe(142000);
  });

  it("never exceeds the highest price the client was already quoted, by construction", () => {
    const price = getBindingOfferPriceEur({ priceMax: 63000 });
    expect(price).toBeLessThanOrEqual(63000);
  });

  it("passes through a zero priceMax unchanged, rather than treating it as missing", () => {
    expect(getBindingOfferPriceEur({ priceMax: 0 })).toBe(0);
  });
});
