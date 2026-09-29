import { describe, expect, it } from "vitest";
import { shortReference } from "./reference";

describe("shortReference", () => {
  it("strips dashes and uppercases the first 8 characters of a UUID", () => {
    expect(shortReference("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("A1B2C3D4");
  });

  it("is stable and short for a non-UUID id too", () => {
    expect(shortReference("offer-1")).toBe("OFFER1");
  });
});
