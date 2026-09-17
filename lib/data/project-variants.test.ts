import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import type { ProjectVariant } from "./types";
import { getDefaultProjectVariant, getProjectPriceDisplay } from "./project-variants";

function makeVariant(overrides: Partial<ProjectVariant>): ProjectVariant {
  return {
    id: "v",
    completionStandard: "deweloperski",
    currency: "EUR",
    isDefault: false,
    costLineItems: [],
    timelineStages: [],
    ...overrides,
  };
}

describe("getDefaultProjectVariant", () => {
  it("returns the variant marked isDefault (spec 0042 AC-1)", () => {
    const project = createMockProject({
      variants: [makeVariant({ id: "a" }), makeVariant({ id: "b", isDefault: true }), makeVariant({ id: "c" })],
    });
    expect(getDefaultProjectVariant(project)?.id).toBe("b");
  });

  it("falls back to the first variant when none is marked default", () => {
    const project = createMockProject({ variants: [makeVariant({ id: "a" }), makeVariant({ id: "b" })] });
    expect(getDefaultProjectVariant(project)?.id).toBe("a");
  });

  it("returns undefined when the product has no variant (spec 0042 AC-11)", () => {
    const project = createMockProject({ variants: [] });
    expect(getDefaultProjectVariant(project)).toBeUndefined();
  });
});

describe("getProjectPriceDisplay", () => {
  it("returns the priced default variant when a real price exists (spec 0044 AC-1)", () => {
    const variant = makeVariant({ id: "a", isDefault: true, priceMin: 100000, priceMax: 120000 });
    const project = createMockProject({ priceOnRequest: false, variants: [variant] });
    expect(getProjectPriceDisplay(project)).toEqual({ priceOnRequest: false, variant });
  });

  it("flags priceOnRequest when the scope is empty, keeping the real variant (spec 0044 AC-2)", () => {
    const variant = makeVariant({ id: "a", isDefault: true, priceMin: 100000, scopeSummary: undefined });
    const project = createMockProject({ priceOnRequest: false, variants: [variant] });
    expect(getProjectPriceDisplay(project)).toEqual({ priceOnRequest: false, variant });
  });

  it("flags priceOnRequest when Project.priceOnRequest is true, even with a priced variant", () => {
    const variant = makeVariant({ id: "a", isDefault: true, priceMin: 100000 });
    const project = createMockProject({ priceOnRequest: true, variants: [variant] });
    expect(getProjectPriceDisplay(project)).toEqual({ priceOnRequest: true });
  });

  it("flags priceOnRequest when the product has no variant at all (spec 0044 AC-2)", () => {
    const project = createMockProject({ priceOnRequest: false, variants: [] });
    expect(getProjectPriceDisplay(project)).toEqual({ priceOnRequest: true });
  });

  it("flags priceOnRequest when the default variant itself has no priceMin", () => {
    const variant = makeVariant({ id: "a", isDefault: true, priceMin: undefined });
    const project = createMockProject({ priceOnRequest: false, variants: [variant] });
    expect(getProjectPriceDisplay(project)).toEqual({ priceOnRequest: true });
  });
});
