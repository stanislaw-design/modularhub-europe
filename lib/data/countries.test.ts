import { describe, expect, it } from "vitest";
import { MARKET_COUNTRY_CODES } from "@/lib/countries";
import { getCountries } from "./countries";

describe("getCountries (spec 0073 AC-1)", () => {
  it("returns Polish names without an argument", async () => {
    expect((await getCountries()).map((c) => c.name)).toEqual(["Polska", "Niemcy", "Holandia", "Belgia", "Włochy", "Francja"]);
  });

  it("returns the six market countries in the order of MARKET_COUNTRY_CODES (spec 0082 AC-2)", async () => {
    expect((await getCountries()).map((c) => c.code)).toEqual([...MARKET_COUNTRY_CODES]);
  });

  it("returns names in the requested language", async () => {
    const names = Object.fromEntries((await getCountries("de")).map((c) => [c.code, c.name]));
    expect(names).toMatchObject({
      PL: "Polen",
      DE: "Deutschland",
      NL: "Niederlande",
      BE: "Belgien",
      IT: "Italien",
      FR: "Frankreich",
    });
  });
});
