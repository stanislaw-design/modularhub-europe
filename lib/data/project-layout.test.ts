import { describe, expect, it } from "vitest";
import {
  assertLayoutGroupRule,
  resolveProjectLayout,
  shortVersionName,
  selectFloorPlans,
  type LayoutGroupShape,
  type ProductOptionLayout,
} from "./project-layout";
import type { ProjectDocument } from "./types";

const project = {
  roomLayout: [{ name: "Salon", areaM2: 30, floorLevel: "parter" as const }],
  floorAreaM2: 82.09,
  rooms: 4,
  bedrooms: 2,
  bathrooms: 1,
};

const layoutGroup: LayoutGroupShape = {
  id: "g-layout",
  selectionType: "single",
  options: [
    { id: "o-base", label: "Wersja podstawowa" },
    { id: "o-v2", label: "Wersja 2" },
    { id: "o-v3", label: "Wersja 3" },
  ],
};
const otherGroup: LayoutGroupShape = { id: "g-roof", selectionType: "single", options: [{ id: "o-roof", label: "Dach" }] };
const multiGroup: LayoutGroupShape = { id: "g-multi", selectionType: "multi", options: [{ id: "o-multi", label: "Kominek" }] };

const layouts = new Map<string, ProductOptionLayout>([
  [
    "o-base",
    { optionId: "o-base", floorAreaM2: 82.09, rooms: null, bedrooms: null, bathrooms: null, roomLayout: null, description: null },
  ],
  [
    "o-v2",
    {
      optionId: "o-v2",
      floorAreaM2: 91.05,
      rooms: 5,
      bedrooms: 3,
      bathrooms: null,
      roomLayout: [{ name: "Garderoba", areaM2: 4, floorLevel: "parter" }],
      description: "Trzy sypialnie i garderoba.",
    },
  ],
  [
    "o-v3",
    { optionId: "o-v3", floorAreaM2: null, rooms: null, bedrooms: null, bathrooms: null, roomLayout: null, description: "  " },
  ],
]);

function selection(optionId: string) {
  return new Map([[layoutGroup.id, [optionId]]]);
}

describe("resolveProjectLayout", () => {
  it("takes pomieszczenia, metraz, liczby i opis from the selected option (AC-1)", () => {
    const result = resolveProjectLayout({ project, groups: [layoutGroup, otherGroup], layouts, selected: selection("o-v2") });
    expect(result.layoutOptionId).toBe("o-v2");
    expect(result.layoutOptionLabel).toBe("Wersja 2");
    expect(result.rooms).toEqual([{ name: "Garderoba", areaM2: 4, floorLevel: "parter" }]);
    expect(result.floorAreaM2).toBe(91.05);
    expect(result.roomCount).toBe(5);
    expect(result.bedroomCount).toBe(3);
    expect(result.description).toBe("Trzy sypialnie i garderoba.");
  });

  it("falls back per field to the product when the option field is empty (AC-4)", () => {
    const result = resolveProjectLayout({ project, groups: [layoutGroup], layouts, selected: selection("o-v3") });
    expect(result.rooms).toBe(project.roomLayout);
    expect(result.floorAreaM2).toBe(82.09);
    expect(result.roomCount).toBe(4);
    expect(result.bathroomCount).toBe(1);
    expect(result.description).toBeNull();
  });

  it("returns the product values and no override for a product without layout options (AC-3, AC-9)", () => {
    const result = resolveProjectLayout({
      project,
      groups: [otherGroup, multiGroup],
      layouts: new Map(),
      selected: new Map([[otherGroup.id, ["o-roof"]]]),
    });
    expect(result.layoutOptionId).toBeNull();
    expect(result.rooms).toBe(project.roomLayout);
    expect(result.floorAreaM2).toBeNull();
    expect(result.roomCount).toBe(4);
  });

  it("uses product values when the selected option has no layout row", () => {
    const sparse = new Map([...layouts].filter(([id]) => id !== "o-base"));
    const result = resolveProjectLayout({ project, groups: [layoutGroup], layouts: sparse, selected: selection("o-base") });
    expect(result.layoutOptionId).toBe("o-base");
    expect(result.floorAreaM2).toBeNull();
    expect(result.rooms).toBe(project.roomLayout);
  });

  it("does not mutate the product (AC-5: base version stays intact)", () => {
    const frozen = structuredClone(project);
    resolveProjectLayout({ project, groups: [layoutGroup], layouts, selected: selection("o-v2") });
    expect(project).toEqual(frozen);
  });
});

describe("shortVersionName", () => {
  it("cuts a long option label at the first colon and keeps short labels whole", () => {
    expect(shortVersionName("Wersja 2: trzy sypialnie na poddaszu i poszerzony korytarz")).toBe("Wersja 2");
    expect(shortVersionName("Wersja podstawowa: cztery pokoje")).toBe("Wersja podstawowa");
    expect(shortVersionName("Wersja 2")).toBe("Wersja 2");
    expect(shortVersionName(": bez nazwy")).toBe(": bez nazwy");
  });

  it("is applied to the resolved label used for floor plan captions", () => {
    const long: LayoutGroupShape = { id: "g", selectionType: "single", options: [{ id: "o", label: "Wersja 3: poszerzony salon" }] };
    const result = resolveProjectLayout({
      project,
      groups: [long],
      layouts: new Map([["o", { optionId: "o", floorAreaM2: 82.86, rooms: null, bedrooms: null, bathrooms: null, roomLayout: null, description: null }]]),
      selected: new Map([["g", ["o"]]]),
    });
    expect(result.layoutOptionLabel).toBe("Wersja 3");
  });
});

function plan(url: string, extra: Partial<ProjectDocument> = {}): ProjectDocument {
  return { url, purpose: "product_floor_plan", ...extra };
}

describe("selectFloorPlans", () => {
  const allowed = ["o-base", "o-v2", "o-v3"];

  it("shows only the selected option's own plans when it has some (AC-2, AC-3)", () => {
    const docs = [
      plan("base-1"),
      plan("v2-pietro", { productOptionId: "o-v2", floorLevel: "pietro" }),
      plan("v2-parter", { productOptionId: "o-v2", floorLevel: "parter" }),
      plan("v3-parter", { productOptionId: "o-v3", floorLevel: "parter" }),
    ];
    const urls = selectFloorPlans(docs, { layoutOptionId: "o-v2", allowedOptionIds: allowed }).map((d) => d.url);
    expect(urls).toEqual(["v2-parter", "v2-pietro"]);
  });

  it("falls back to plans without an option when the option has none (AC-3)", () => {
    const docs = [plan("base-1"), plan("v2-parter", { productOptionId: "o-v2", floorLevel: "parter" })];
    const urls = selectFloorPlans(docs, { layoutOptionId: "o-base", allowedOptionIds: allowed }).map((d) => d.url);
    expect(urls).toEqual(["base-1"]);
  });

  it("behaves as before for a product with no layout options (AC-9)", () => {
    const docs = [plan("a"), plan("b", { productVariantId: "v-x" }), plan("c", { productVariantId: "v-y" })];
    const urls = selectFloorPlans(docs, { selectedVariantId: "v-x", layoutOptionId: null, allowedOptionIds: [] }).map(
      (d) => d.url,
    );
    expect(urls).toEqual(["a", "b"]);
  });

  it("filters by variant on both the option and the fallback set", () => {
    const docs = [
      plan("v2-a", { productOptionId: "o-v2", productVariantId: "v-x" }),
      plan("v2-b", { productOptionId: "o-v2", productVariantId: "v-y" }),
    ];
    expect(selectFloorPlans(docs, { selectedVariantId: "v-y", layoutOptionId: "o-v2", allowedOptionIds: allowed }).map((d) => d.url)).toEqual([
      "v2-b",
    ]);
    // Wariant bez rzutu opcji: spada na zapasowe (tu brak), nie na cudze rzuty opcji.
    expect(selectFloorPlans(docs, { selectedVariantId: "v-z", layoutOptionId: "o-v2", allowedOptionIds: allowed })).toEqual([]);
  });

  it("ignores plans pointing at an option outside the product's groups (orphans)", () => {
    const docs = [plan("orphan", { productOptionId: "o-gone", floorLevel: "parter" }), plan("base")];
    expect(selectFloorPlans(docs, { layoutOptionId: "o-gone", allowedOptionIds: allowed }).map((d) => d.url)).toEqual(["base"]);
  });

  it("orders parter, pietro, poddasze, then no floor, keeping input order inside a floor", () => {
    const docs = [
      plan("none"),
      plan("pod", { floorLevel: "poddasze" }),
      plan("par-b", { floorLevel: "parter" }),
      plan("pie", { floorLevel: "pietro" }),
      plan("par-a", { floorLevel: "parter" }),
    ];
    const urls = selectFloorPlans(docs, { allowedOptionIds: [] }).map((d) => d.url);
    expect(urls).toEqual(["par-b", "par-a", "pie", "pod", "none"]);
  });

  it("ignores documents of other purposes", () => {
    const docs: ProjectDocument[] = [{ url: "photo", purpose: "product_photo" }, plan("fp")];
    expect(selectFloorPlans(docs, { allowedOptionIds: [] }).map((d) => d.url)).toEqual(["fp"]);
  });
});

describe("assertLayoutGroupRule", () => {
  it("accepts layout data on one single group of the product (AC-8)", () => {
    expect(() => assertLayoutGroupRule([layoutGroup, otherGroup], ["o-base", "o-v2"], ["o-v2"])).not.toThrow();
  });

  it("rejects two single groups carrying layout data", () => {
    expect(() => assertLayoutGroupRule([layoutGroup, otherGroup], ["o-v2", "o-roof"])).toThrow(/Więcej niż jedna grupa/);
  });

  it("rejects layout data on a multi group option", () => {
    expect(() => assertLayoutGroupRule([layoutGroup, multiGroup], ["o-multi"])).toThrow(/multi/);
  });

  it("rejects layout data on an option outside the product's groups", () => {
    expect(() => assertLayoutGroupRule([layoutGroup], ["o-foreign"])).toThrow(/nie należy do grupy/);
  });

  it("rejects a floor plan pointing at another product's option or a multi option", () => {
    expect(() => assertLayoutGroupRule([layoutGroup], [], ["o-foreign"])).toThrow(/spoza grup/);
    expect(() => assertLayoutGroupRule([layoutGroup, multiGroup], [], ["o-multi"])).toThrow(/multi/);
  });
});
