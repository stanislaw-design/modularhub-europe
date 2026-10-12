import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import {
  COMPARE_ROWS_BY_KIND,
  getCompareListPath,
  isEligibleForCompareKind,
  parseCompareKind,
  SAUNA_COMPARE_ROWS,
} from "./compare-rows";

describe("parseCompareKind (spec 0068 AC-13)", () => {
  it("defaults to dom for no value, an unknown value or an array", () => {
    expect(parseCompareKind(undefined)).toBe("dom");
    expect(parseCompareKind("nonsense")).toBe("dom");
    expect(parseCompareKind(["sauna"])).toBe("dom");
  });

  it("maps sauna and its spa-modulowe alias to sauna", () => {
    expect(parseCompareKind("sauna")).toBe("sauna");
    expect(parseCompareKind("spa-modulowe")).toBe("sauna");
  });
});

describe("isEligibleForCompareKind (spec 0068 AC-14)", () => {
  it("accepts only spa-modulowe + sauna for sauna, so a jacuzzi never inherits the table", () => {
    expect(isEligibleForCompareKind("sauna", { family: "spa-modulowe", spaSubcategory: "sauna" })).toBe(true);
    expect(isEligibleForCompareKind("sauna", { family: "spa-modulowe", spaSubcategory: "jacuzzi" })).toBe(false);
    expect(isEligibleForCompareKind("sauna", { family: "dom", spaSubcategory: null })).toBe(false);
  });

  it("keeps the dom rule unchanged", () => {
    expect(isEligibleForCompareKind("dom", { family: "dom", spaSubcategory: null })).toBe(true);
    expect(isEligibleForCompareKind("dom", { family: "spa-modulowe", spaSubcategory: "sauna" })).toBe(false);
  });
});

describe("getCompareListPath", () => {
  it("returns the list that matches the kind", () => {
    expect(getCompareListPath("dom", "de")).toBe("/de/results");
    expect(getCompareListPath("sauna", "de")).toBe("/de/sauna");
  });
});

describe("COMPARE_ROWS_BY_KIND (spec 0068 AC-15)", () => {
  it("has a row list for every kind, with unique keys", () => {
    for (const rows of Object.values(COMPARE_ROWS_BY_KIND)) {
      const keys = rows.map((row) => row.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(COMPARE_ROWS_BY_KIND.sauna).toBe(SAUNA_COMPARE_ROWS);
    expect(COMPARE_ROWS_BY_KIND.sauna).toHaveLength(11);
  });
});

describe("SAUNA_COMPARE_ROWS values", () => {
  const project = createMockProject({
    family: "spa-modulowe",
    spaSubcategory: "sauna",
    saunaTechnicalSpecs: {
      claddingMaterial: "Świerk",
      interiorWoodType: "  ",
      benchMaterial: "Abachi",
      insulationType: "Wełna",
      glazingType: "Szkło",
      seatingCapacity: null,
      hasChangingArea: false,
      changingAreaDescription: "ignorowany",
      electricalRequirement: "400 V",
    },
  });

  function value(key: string) {
    return SAUNA_COMPARE_ROWS.find((row) => row.key === key)?.getValue(project);
  }

  it("treats blank text and a null seating as missing data", () => {
    expect(value("interiorWood")).toEqual({ type: "text", text: undefined });
    expect(value("seating")).toEqual({ type: "text", text: undefined });
    expect(value("cladding")).toEqual({ type: "text", text: "Świerk" });
  });

  it("ignores the changing area description when there is no changing area", () => {
    expect(value("changingArea")).toEqual({ type: "yesno", value: false, description: undefined });
  });

  it("survives a product with no sauna specs at all", () => {
    const bare = createMockProject({ saunaTechnicalSpecs: undefined });
    for (const row of SAUNA_COMPARE_ROWS) expect(() => row.getValue(bare)).not.toThrow();
  });
});
