import { describe, expect, it } from "vitest";
import { appendSlugSuffix, slugifyProductName } from "./product-slug";

describe("slugifyProductName", () => {
  it("lowercases and hyphenates a plain name", () => {
    expect(slugifyProductName("Pomerania 40")).toBe("pomerania-40");
  });

  it("transliterates Polish diacritics to their Latin equivalents (AC-1)", () => {
    expect(slugifyProductName("Dom Żaglówka")).toBe("dom-zaglowka");
    expect(slugifyProductName("Ćma Łąka Świerkowa Źrebięcia Ńord Ó")).toBe("cma-laka-swierkowa-zrebiecia-nord-o");
  });

  it("collapses punctuation/whitespace runs into a single hyphen and trims edges", () => {
    expect(slugifyProductName("  Cas 106 -- Pisz!!  ")).toBe("cas-106-pisz");
    expect(slugifyProductName("A/B (test)")).toBe("a-b-test");
  });

  it("returns an empty string for a name with no sluggable characters", () => {
    expect(slugifyProductName("   ")).toBe("");
    expect(slugifyProductName("!!!")).toBe("");
  });
});

describe("appendSlugSuffix", () => {
  it("appends a 4-char hex suffix to the base slug", () => {
    expect(appendSlugSuffix("pomerania-40", () => 0)).toBe("pomerania-40-0000");
    expect(appendSlugSuffix("pomerania-40", () => 0.999999)).toBe("pomerania-40-ffff");
  });

  it("produces a different suffix for a different random draw (collision retry, AC-2)", () => {
    const first = appendSlugSuffix("pomerania-40", () => 0.1);
    const second = appendSlugSuffix("pomerania-40", () => 0.2);
    expect(first).not.toBe(second);
  });
});
