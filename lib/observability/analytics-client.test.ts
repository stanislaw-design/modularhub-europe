import { describe, expect, it } from "vitest";
import { ATTRIBUTED_PAGE_TYPES, pageTypeFromPath } from "./analytics-client";

describe("pageTypeFromPath", () => {
  it.each([
    ["/", "home"],
    ["/results", "results"],
    ["/sauna", "other"],
    ["/sauna/kora-relax-550", "sauna"],
    ["/project/x", "project"],
    ["/outdoor-tv/x", "outdoor_tv"],
    ["/modularprojects/x", "modularproject"],
    ["/producers/abc", "producer"],
    ["/contact", "other"],
  ])("%s -> %s", (path, type) => {
    expect(pageTypeFromPath(path)).toBe(type);
  });

  it("leaves detail pages to the attribution component", () => {
    expect(ATTRIBUTED_PAGE_TYPES.has(pageTypeFromPath("/sauna/x"))).toBe(true);
    expect(ATTRIBUTED_PAGE_TYPES.has(pageTypeFromPath("/results"))).toBe(false);
  });
});
