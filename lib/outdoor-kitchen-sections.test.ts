import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import { splitOutdoorKitchenSections } from "./outdoor-kitchen-sections";

function kitchen(id: string, kitchenType: "box" | "modular" | null, priceMin: number): Project {
  return {
    id,
    priceMin,
    priceOnRequest: false,
    outdoorKitchenTechnicalSpecs: kitchenType ? ({ kitchenType } as Project["outdoorKitchenTechnicalSpecs"]) : undefined,
  } as Project;
}

// Spec 0086 AC-12, AC-13.
describe("splitOutdoorKitchenSections", () => {
  it("puts box kitchens first, modular second, each sorted by price ascending", () => {
    const sections = splitOutdoorKitchenSections([
      kitchen("premium", "modular", 8750),
      kitchen("prestige-set", "box", 15600),
      kitchen("compact", "modular", 4554),
      kitchen("wood", "box", 6500),
    ]);
    expect(sections.map((section) => section.kitchenType)).toEqual(["box", "modular"]);
    expect(sections[0].projects.map((project) => project.id)).toEqual(["wood", "prestige-set"]);
    expect(sections[1].projects.map((project) => project.id)).toEqual(["compact", "premium"]);
  });

  it("skips an empty section and products without kitchen data", () => {
    const sections = splitOutdoorKitchenSections([kitchen("compact", "modular", 4554), kitchen("broken", null, 1)]);
    expect(sections).toHaveLength(1);
    expect(sections[0].projects.map((project) => project.id)).toEqual(["compact"]);
  });

  it("returns no sections for no products", () => {
    expect(splitOutdoorKitchenSections([])).toEqual([]);
  });
});
