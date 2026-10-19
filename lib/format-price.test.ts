import { describe, expect, it } from "vitest";
import { formatPriceEur } from "./format-price";

const plain = (value: string) => value.replace(/\s/g, " ");

describe("formatPriceEur (spec 0073 AC-6)", () => {
  it("formats in euro without cents and follows the language", () => {
    expect(plain(formatPriceEur(129000, "pl"))).toBe("129 000 €");
    expect(plain(formatPriceEur(129000, "en"))).toBe("€129,000");
    expect(plain(formatPriceEur(129000, "de"))).toBe("129.000 €");
  });
});
