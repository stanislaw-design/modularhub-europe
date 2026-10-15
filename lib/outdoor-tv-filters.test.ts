import { describe, expect, it } from "vitest";
import { sortOutdoorTvResults, toggleOutdoorTvValue } from "./outdoor-tv-filters";
import { buildResultsHref, parseResultsSearchParams } from "./results-filters";

describe("parseResultsSearchParams (outdoor-tv)", () => {
  it("accepts repeated keys and drops unknown values", () => {
    const filter = parseResultsSearchParams({ family: "outdoor-tv", mounting: ["w-szafie-z-winda", "na-sciane", "xyz"], purpose: "abc" });
    expect(filter.mounting).toEqual(["na-sciane", "w-szafie-z-winda"]);
    expect(filter.purpose).toBeUndefined();
  });
});

describe("toggleOutdoorTvValue", () => {
  it("adds and removes only the clicked chip", () => {
    const base = parseResultsSearchParams({ family: "outdoor-tv", mounting: "na-sciane", purpose: "cien" });
    const added = toggleOutdoorTvValue(base, "mounting", "w-szafie-z-winda");
    expect(buildResultsHref("pl", added)).toBe("/pl/results?family=outdoor-tv&mounting=na-sciane&mounting=w-szafie-z-winda&purpose=cien");
    const removed = toggleOutdoorTvValue(base, "purpose", "cien");
    expect(buildResultsHref("pl", removed)).toBe("/pl/results?family=outdoor-tv&mounting=na-sciane");
  });
});

describe("sortOutdoorTvResults", () => {
  it("orders by sun exposure, then products without it, alphabetically", () => {
    const items = [
      { name: "Premium", outdoorTvSunExposure: null },
      { name: "Platinum", outdoorTvSunExposure: "pelne-slonce" },
      { name: "Custom", outdoorTvSunExposure: null },
      { name: "Silver", outdoorTvSunExposure: "cien" },
      { name: "Gold", outdoorTvSunExposure: "czesciowe-slonce" },
    ];
    expect(sortOutdoorTvResults(items, "pl").map((i) => i.name)).toEqual(["Silver", "Gold", "Platinum", "Custom", "Premium"]);
  });
});
