import { describe, expect, it } from "vitest";
import { getBindingOfferPriceEur, getMockTransportPriceEur } from "./pricing";

describe("getMockTransportPriceEur", () => {
  it("returns a distinct flat rate per delivery country", () => {
    const pl = getMockTransportPriceEur("PL");
    const de = getMockTransportPriceEur("DE");
    const nl = getMockTransportPriceEur("NL");

    expect(pl).toBe(3200);
    expect(de).toBe(4600);
    expect(nl).toBe(5400);
    expect(new Set([pl, de, nl]).size).toBe(3);
  });

  it("returns the same value on repeated calls for the same country", () => {
    expect(getMockTransportPriceEur("DE")).toBe(getMockTransportPriceEur("DE"));
  });
});

describe("getBindingOfferPriceEur", () => {
  it("returns the project's top of range price", () => {
    expect(getBindingOfferPriceEur({ priceMax: 142000 })).toBe(142000);
  });
});
