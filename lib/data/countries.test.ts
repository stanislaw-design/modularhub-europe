import { describe, expect, it } from "vitest";
import { getCountries } from "./countries";

describe("getCountries (spec 0073 AC-1)", () => {
  it("returns Polish names without an argument", async () => {
    expect((await getCountries()).map((c) => c.name)).toEqual(["Polska", "Niemcy", "Holandia"]);
  });

  it("returns names in the requested language", async () => {
    const names = Object.fromEntries((await getCountries("de")).map((c) => [c.code, c.name]));
    expect(names).toMatchObject({ PL: "Polen", DE: "Deutschland", NL: "Niederlande" });
  });
});
