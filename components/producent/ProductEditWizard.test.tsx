import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { updateProducerProduct } from "@/lib/producer-product-actions";
import { ProductEditWizard } from "./ProductEditWizard";

const countries: Country[] = [{ code: "PL", name: "Polska" }];

// Same jsdom/vitest gap as ProjectWizard.test.tsx: ProducerProductPhotosStep's
// import chain reaches next-auth via a server action, unrelated to what these
// tests exercise.
vi.mock("./ProducerProductPhotosStep", () => ({
  ProducerProductPhotosStep: () => null,
}));

vi.mock("./ProducerFloorPlanUploadStep", () => ({
  ProducerFloorPlanUploadStep: () => null,
}));

vi.mock("./ProducerSpecificationPdfUploadStep", () => ({
  ProducerSpecificationPdfUploadStep: () => null,
}));

vi.mock("@/lib/producer-product-actions", () => ({
  updateProducerProduct: vi.fn(),
}));

// ProjectWizardVariantsStep pulls in the same @/auth -> next-auth chain as
// ProducerProductPhotosStep above; no test here reaches the "warianty" step.
vi.mock("@/lib/producer-product-variant-actions", () => ({
  createVariant: vi.fn(),
  cloneVariant: vi.fn(),
  updateVariant: vi.fn(),
  updateVariantTranslation: vi.fn(),
  setDefaultVariant: vi.fn(),
  deleteVariant: vi.fn(),
  upsertCostLineItem: vi.fn(),
  deleteCostLineItem: vi.fn(),
  upsertTimelineStage: vi.fn(),
}));

// Same server-action-chain gap as above (spec 0050 AC-4): ProjectWizardBasicInfoStep
// now imports recognizeRoomLayout ("use server" -> @/auth) at module scope,
// even though ProductEditWizard never passes it the props that would render
// the AI section (AC-41, no room recognition on an existing product's edit).
vi.mock("@/lib/producer-room-layout-actions", () => ({
  recognizeRoomLayout: vi.fn(),
}));

// extractStandardsFromMaterial ("use server" -> Azure OpenAI client chain)
// doesn't resolve under Vitest/jsdom, same gap as above; ProductEditWizard
// also never sets enableStandardsExtraction (AC-41).
vi.mock("@/lib/producer-standards-extraction-actions", () => ({
  extractStandardsFromMaterial: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

const initialDraft = {
  ...createEmptyDraft(),
  name: "Modulor 28",
  floorAreaM2: 120,
  bedrooms: 3,
  countryOfProduction: "PL" as const,
  description: "Opis projektu",
  family: "dom" as const,
  category: "caloroczny" as const,
};

describe("ProductEditWizard", () => {
  beforeEach(() => {
    vi.mocked(updateProducerProduct).mockReset();
  });

  it("pre-fills the basic info step with the initial draft and locks the family selector", () => {
    render(
      <ProductEditWizard
        locale="pl"
        productId="product-1"
        initialDraft={initialDraft}
        initialPhotos={[]}
        initialFloorPlans={[]}
        initialSpecificationPdf={null}
        initialVariants={[]}
        countries={countries}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Edytuj produkt" })).toBeInTheDocument();
    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("Modulor 28");
    // familyLocked pokazuje wartość jako tekst, nie select (spec 0022 AC-7).
    expect(screen.queryByRole("button", { name: "Dom" })).not.toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
  });

  it("allows jumping straight to a later step since every step starts unlocked when editing", async () => {
    const user = userEvent.setup();
    render(
      <ProductEditWizard
        locale="pl"
        productId="product-1"
        initialDraft={initialDraft}
        initialPhotos={[]}
        initialFloorPlans={[]}
        initialSpecificationPdf={null}
        initialVariants={[]}
        countries={countries}
      />,
    );

    await user.click(screen.getByRole("button", { name: /podsumowanie/i }));

    expect(screen.getByRole("heading", { level: 2, name: "Podsumowanie" })).toBeInTheDocument();
    expect(screen.getByText("Modulor 28")).toBeInTheDocument();
  });

  it("saves with publish true and redirects when the summary step's save button is clicked", async () => {
    vi.mocked(updateProducerProduct).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <ProductEditWizard
        locale="pl"
        productId="product-1"
        initialDraft={initialDraft}
        initialPhotos={[]}
        initialFloorPlans={[]}
        initialSpecificationPdf={null}
        initialVariants={[]}
        countries={countries}
      />,
    );

    await user.click(screen.getByRole("button", { name: /podsumowanie/i }));
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    expect(updateProducerProduct).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ name: "Modulor 28" }),
      { publish: true },
    );
  });
});
