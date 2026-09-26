import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import type { ProjectVariant } from "./types";
import { getDefaultProjectVariant, getInPriceCostLineItemLabels, getProjectPriceDisplay } from "./project-variants";

function makeVariant(overrides: Partial<ProjectVariant>): ProjectVariant {
  return {
    id: "v",
    completionStandard: "deweloperski",
    currency: "EUR",
    priceOnRequest: false,
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
    const variant = makeVariant({ id: "a", isDefault: true, priceMin: 100000 });
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

describe("getInPriceCostLineItemLabels (spec 0051 AC-6)", () => {
  it("returns up to `max` labels with status w-cenie, in list order, and zero extraCount when within the limit", () => {
    const variant = makeVariant({
      costLineItems: [
        { id: "1", label: "Fundament", status: "w-cenie" },
        { id: "2", label: "Transport", status: "po-stronie-klienta" },
        { id: "3", label: "Ściany i dach", status: "w-cenie" },
      ],
    });
    expect(getInPriceCostLineItemLabels(variant)).toEqual({ labels: ["Fundament", "Ściany i dach"], extraCount: 0 });
  });

  it("caps at `max` labels and reports the remaining count", () => {
    const variant = makeVariant({
      costLineItems: [
        { id: "1", label: "A", status: "w-cenie" },
        { id: "2", label: "B", status: "w-cenie" },
        { id: "3", label: "C", status: "w-cenie" },
        { id: "4", label: "D", status: "w-cenie" },
      ],
    });
    expect(getInPriceCostLineItemLabels(variant)).toEqual({ labels: ["A", "B", "C"], extraCount: 1 });
  });

  it("returns an empty summary when there are no items, or none with status w-cenie", () => {
    expect(getInPriceCostLineItemLabels(makeVariant({ costLineItems: [] }))).toEqual({ labels: [], extraCount: 0 });
    expect(
      getInPriceCostLineItemLabels(makeVariant({ costLineItems: [{ id: "1", label: "Transport", status: "do-wyceny" }] })),
    ).toEqual({ labels: [], extraCount: 0 });
  });
});
