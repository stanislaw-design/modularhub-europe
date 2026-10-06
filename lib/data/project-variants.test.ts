import { describe, expect, it } from "vitest";
import type { ProductOptionGroup } from "@/lib/db/queries";
import { createMockProject } from "@/test/fixtures/project";
import type { ProjectVariant } from "./types";
import {
  flattenSelectedProductOptionIds,
  getDefaultProjectVariant,
  getInPriceCostLineItemLabels,
  getProjectPriceDisplay,
  getSelectedProductOptionsPrice,
  resolveSelectedProductOptions,
  toggleProductOption,
} from "./project-variants";

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

// Spec 0059: grupy opcji konfiguratora dla produktów katalogowych.
const INSULATION_GROUP: ProductOptionGroup = {
  id: "g-insulation",
  name: "Poziom ocieplenia", sourceName: "Poziom ocieplenia",
  selectionType: "single",
  options: [
    { id: "o-standard", label: "Standard", sourceLabel: "Standard", priceCents: 650000, priceOnRequest: false, isDefault: true, imageUrl: null },
    { id: "o-premium", label: "Premium", sourceLabel: "Premium", priceCents: 980000, priceOnRequest: false, isDefault: false, imageUrl: null },
  ],
};
const EXTRAS_GROUP: ProductOptionGroup = {
  id: "g-extras",
  name: "Dodatki", sourceName: "Dodatki",
  selectionType: "multi",
  options: [
    { id: "o-fireplace", label: "Kominek", sourceLabel: "Kominek", priceCents: 250000, priceOnRequest: false, isDefault: false, imageUrl: null },
    { id: "o-ac", label: "Klimatyzacja", sourceLabel: "Klimatyzacja", priceCents: 0, priceOnRequest: true, isDefault: false, imageUrl: null },
  ],
};

describe("resolveSelectedProductOptions (spec 0059 AC-2, AC-6)", () => {
  it("defaults a single group to its is_default option when the URL carries nothing for it", () => {
    const resolved = resolveSelectedProductOptions([INSULATION_GROUP], undefined);
    expect(resolved.get("g-insulation")).toEqual(["o-standard"]);
  });

  it("falls back to the first option by sort order when a single group has no is_default option (data error)", () => {
    const groupWithoutDefault: ProductOptionGroup = {
      ...INSULATION_GROUP,
      options: INSULATION_GROUP.options.map((option) => ({ ...option, isDefault: false })),
    };
    const resolved = resolveSelectedProductOptions([groupWithoutDefault], undefined);
    expect(resolved.get("g-insulation")).toEqual(["o-standard"]);
  });

  it("honors an explicit, valid single-group selection from the URL", () => {
    const resolved = resolveSelectedProductOptions([INSULATION_GROUP], "o-premium");
    expect(resolved.get("g-insulation")).toEqual(["o-premium"]);
  });

  it("ignores unknown/stale option ids and still falls back to the default (AC-6)", () => {
    const resolved = resolveSelectedProductOptions([INSULATION_GROUP], "deleted-option-id");
    expect(resolved.get("g-insulation")).toEqual(["o-standard"]);
  });

  it("resolves a single group with two ids from itself to the first, ignoring the rest (AC-6)", () => {
    const resolved = resolveSelectedProductOptions([INSULATION_GROUP], "o-premium,o-standard");
    expect(resolved.get("g-insulation")).toEqual(["o-premium"]);
  });

  it("leaves a multi group empty by default (no option pre-selected)", () => {
    const resolved = resolveSelectedProductOptions([EXTRAS_GROUP], undefined);
    expect(resolved.get("g-extras")).toEqual([]);
  });

  it("selects only the valid, deduplicated ids for a multi group", () => {
    const resolved = resolveSelectedProductOptions([EXTRAS_GROUP], "o-fireplace,unknown-id,o-fireplace");
    expect(resolved.get("g-extras")).toEqual(["o-fireplace"]);
  });
});

describe("toggleProductOption (spec 0059 AC-3)", () => {
  it("replaces the single group's selection and serializes every group's full resolved state", () => {
    const groups = [INSULATION_GROUP, EXTRAS_GROUP];
    const current = resolveSelectedProductOptions(groups, undefined);
    const next = toggleProductOption(groups, current, "g-insulation", "o-premium");
    expect(next.split(",").sort()).toEqual(["o-premium"]);
  });

  it("adds an unselected option to a multi group without disturbing other groups", () => {
    const groups = [INSULATION_GROUP, EXTRAS_GROUP];
    const current = resolveSelectedProductOptions(groups, undefined);
    const next = toggleProductOption(groups, current, "g-extras", "o-fireplace");
    expect(next.split(",").sort()).toEqual(["o-fireplace", "o-standard"]);
  });

  it("removes an already-selected option from a multi group (toggle off)", () => {
    const groups = [INSULATION_GROUP, EXTRAS_GROUP];
    const current = resolveSelectedProductOptions(groups, "o-fireplace");
    const next = toggleProductOption(groups, current, "g-extras", "o-fireplace");
    expect(next.split(",").sort()).toEqual(["o-standard"]);
  });
});

describe("getSelectedProductOptionsPrice (spec 0059 AC-4)", () => {
  it("sums the price (in EUR) of every selected option across groups", () => {
    const groups = [INSULATION_GROUP, EXTRAS_GROUP];
    const selected = flattenSelectedProductOptionIds(resolveSelectedProductOptions(groups, "o-premium,o-fireplace"));
    expect(getSelectedProductOptionsPrice(groups, selected)).toEqual({ priceOnRequest: false, totalEur: 12300 });
  });

  it("returns zero when no option is selected", () => {
    expect(getSelectedProductOptionsPrice([INSULATION_GROUP, EXTRAS_GROUP], [])).toEqual({
      priceOnRequest: false,
      totalEur: 0,
    });
  });

  it("propagates priceOnRequest from any single selected option, never a misleading exact sum", () => {
    const groups = [INSULATION_GROUP, EXTRAS_GROUP];
    const selected = flattenSelectedProductOptionIds(resolveSelectedProductOptions(groups, "o-standard,o-ac"));
    expect(getSelectedProductOptionsPrice(groups, selected)).toEqual({ priceOnRequest: true });
  });
});
