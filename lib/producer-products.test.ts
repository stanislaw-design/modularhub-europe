import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDraft } from "./data/types";
import { createEmptyDraft } from "./producer-project-draft";
import {
  clearEditDraft,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  loadEditDraft,
  savedProductToDraft,
  saveEditDraft,
  updateProduct,
} from "./producer-products";

function completeDraft(overrides: Partial<ProjectDraft> = {}): ProjectDraft {
  return {
    ...createEmptyDraft(),
    name: "Modulor 28",
    floorAreaM2: 90,
    bedrooms: 3,
    countryOfProduction: "PL",
    description: "Opis",
    family: "dom",
    category: "caloroczny",
    technicalSpecs: {
      wallBuildUp: "Szkielet",
      insulation: "U = 0.15",
      heatTransferCoefficients: "U = 0.9",
      windowClass: "Uw = 0.8",
      ventilation: "Mechaniczna",
      heatSource: "Pompa ciepła",
      fireResistance: "REI 30",
      windResistance: "Strefa 2",
    },
    floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 10 }],
    photoFiles: [{ name: "zdjecie.png", sizeBytes: 10 }],
    housePriceMinEur: 100000,
    housePriceMaxEur: 120000,
    completionStandard: "deweloperski",
    productionLeadTimeWeeksMin: 10,
    productionLeadTimeWeeksMax: 14,
    onSiteAssemblyDaysMin: 3,
    onSiteAssemblyDaysMax: 5,
    structuralWarrantyYears: 25,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("createProduct", () => {
  it("saves a complete draft as a SavedProduct with a generated id and matching family", () => {
    const product = createProduct("1234567890", completeDraft());

    expect(product).not.toBeNull();
    expect(product?.family).toBe("dom");
    expect(product?.name).toBe("Modulor 28");
    expect(listProducts("1234567890")).toHaveLength(1);
  });

  it("returns null, without throwing, when the underlying write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(createProduct("1234567890", completeDraft())).toBeNull();

    vi.restoreAllMocks();
  });
});

describe("updateProduct", () => {
  it("returns null for an id that does not exist in this producer's catalog", () => {
    expect(updateProduct("1234567890", "missing-id", completeDraft())).toBeNull();
  });

  it("updates ordinary fields (name, price) normally", () => {
    const original = createProduct("1234567890", completeDraft());
    const updated = updateProduct("1234567890", original!.id, completeDraft({ name: "Modulor 28 XL" }));

    expect(updated?.name).toBe("Modulor 28 XL");
    expect(listProducts("1234567890")[0]?.name).toBe("Modulor 28 XL");
  });

  it("keeps the product's original family even when the update payload claims a different one (spec 0022 AC-7)", () => {
    const original = createProduct("1234567890", completeDraft({ family: "dom", category: "caloroczny" }));
    expect(original?.family).toBe("dom");

    // No UI path can produce this today (the family selector is hidden in edit
    // mode), but the storage layer is the last line of defense per AC-7: it
    // must ignore family here, the same way a server action would reject it.
    const tampered = completeDraft({
      family: "pergola",
      category: null,
      pergolaSubcategory: "drewniana",
    });
    const updated = updateProduct("1234567890", original!.id, tampered);

    expect(updated?.family).toBe("dom");
    expect(listProducts("1234567890")[0]?.family).toBe("dom");
  });

  it("preserves the original id and createdAt across an update", () => {
    const original = createProduct("1234567890", completeDraft());
    const updated = updateProduct("1234567890", original!.id, completeDraft({ name: "Renamed" }));

    expect(updated?.id).toBe(original?.id);
    expect(updated?.createdAt).toBe(original?.createdAt);
  });
});

describe("savedProductToDraft", () => {
  it("round trips family, subcategory, and technicalSpecs back into an editable draft", () => {
    const product = createProduct("1234567890", completeDraft());
    const draft = savedProductToDraft(product!);

    expect(draft.family).toBe("dom");
    expect(draft.category).toBe("caloroczny");
    expect(draft.technicalSpecs).toEqual(product!.technicalSpecs);
  });
});

describe("listProducts", () => {
  it("returns an empty array, not an error, for corrupted JSON", () => {
    window.localStorage.setItem("producent:1234567890:produkty", "{not-json");

    expect(listProducts("1234567890")).toEqual([]);
  });

  it("filters out entries missing the minimal shape (id, name)", () => {
    window.localStorage.setItem(
      "producent:1234567890:produkty",
      JSON.stringify([{ id: "a", name: "Valid" }, { foo: "bar" }])
    );

    expect(listProducts("1234567890")).toHaveLength(1);
  });
});

describe("getProduct", () => {
  it("finds a product by id, and returns null for an unknown id", () => {
    const product = createProduct("1234567890", completeDraft());

    expect(getProduct("1234567890", product!.id)?.id).toBe(product!.id);
    expect(getProduct("1234567890", "unknown")).toBeNull();
  });
});

describe("deleteProduct", () => {
  it("removes the matching product and clears its edit draft", () => {
    const product = createProduct("1234567890", completeDraft());
    saveEditDraft("1234567890", product!.id, completeDraft(), 2);

    deleteProduct("1234567890", product!.id);

    expect(listProducts("1234567890")).toHaveLength(0);
    expect(loadEditDraft("1234567890", product!.id)).toBeNull();
  });
});

describe("clearEditDraft", () => {
  it("does not throw when localStorage.removeItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => clearEditDraft("1234567890", "id")).not.toThrow();

    spy.mockRestore();
  });
});
