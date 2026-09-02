import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { createProduct } from "@/lib/producer-products";
import { ProductEditWizard } from "./ProductEditWizard";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

function completeSpaDraft(overrides: Partial<ProjectDraft> = {}): ProjectDraft {
  return {
    ...createEmptyDraft(),
    name: "Sauna Domowa",
    floorAreaM2: 20,
    bedrooms: 0,
    countryOfProduction: "PL",
    description: "Opis",
    family: "spa-modulowe",
    spaSubcategory: "sauna",
    technicalSpecs: {
      seatingCapacity: 4,
      waterVolumeLiters: 800,
      heatingType: "electric",
      filtrationSystem: "Piaskowa",
      shellMaterial: "Cedr",
      electricalRequirement: "400V",
      foundationType: "Płyta betonowa",
    },
    floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 10 }],
    photoFiles: [{ name: "zdjecie.png", sizeBytes: 10 }],
    housePriceMinEur: 5000,
    housePriceMaxEur: 7000,
    completionStandard: "pod-klucz",
    productionLeadTimeWeeksMin: 4,
    productionLeadTimeWeeksMax: 6,
    onSiteAssemblyDaysMin: 1,
    onSiteAssemblyDaysMax: 2,
    structuralWarrantyYears: 5,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  replace.mockClear();
  push.mockClear();
});

describe("ProductEditWizard", () => {
  it("loads the saved product and shows family as locked, read-only text, not a selector (spec 0022 AC-7)", async () => {
    const product = createProduct("1234567890", completeSpaDraft())!;

    render(<ProductEditWizard locale="pl" nip="1234567890" productId={product.id} countries={countries} />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Informacje podstawowe" })
    ).toBeInTheDocument();
    expect(screen.getByText("Rodzina produktu")).toBeInTheDocument();
    expect(screen.getByText("Spa modułowe")).toBeInTheDocument();
    expect(screen.queryByLabelText(/rodzina produktu/i)).not.toBeInTheDocument();
  });

  it("redirects to the product list when the product id does not exist", async () => {
    render(<ProductEditWizard locale="pl" nip="1234567890" productId="unknown-id" countries={countries} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/pl/producent/produkty?nip=1234567890"));
  });

  it("keeps the original family in storage after walking to the summary and saving, with no UI path to change it", async () => {
    const user = userEvent.setup();
    const product = createProduct("1234567890", completeSpaDraft())!;

    render(<ProductEditWizard locale="pl" nip="1234567890" productId={product.id} countries={countries} />);
    await screen.findByRole("heading", { level: 2, name: "Informacje podstawowe" });

    await user.click(screen.getByRole("button", { name: "Dalej" })); // -> techniczne
    await user.click(screen.getByRole("button", { name: "Dalej" })); // -> pliki
    await user.click(screen.getByRole("button", { name: "Dalej" })); // -> cena
    await user.click(screen.getByRole("button", { name: "Dalej" })); // -> podsumowanie
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const stored = JSON.parse(window.localStorage.getItem("producent:1234567890:produkty") ?? "[]");
    expect(stored[0].family).toBe("spa-modulowe");
  });
});
