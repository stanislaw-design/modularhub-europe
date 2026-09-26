import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { updateProducerProduct } from "@/lib/producer-product-actions";
import { recognizeRoomLayout } from "@/lib/producer-room-layout-actions";
import { extractStandardsFromMaterial } from "@/lib/producer-standards-extraction-actions";
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

vi.mock("./ProducerSalesPdfUploadStep", () => ({
  ProducerSalesPdfUploadStep: () => null,
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
  setDefaultVariant: vi.fn(),
  deleteVariant: vi.fn(),
  upsertCostLineItem: vi.fn(),
  deleteCostLineItem: vi.fn(),
  upsertTimelineStage: vi.fn(),
}));

// Same server-action-chain gap as above (spec 0050 AC-4): ProjectWizardRoomLayoutStep
// imports recognizeRoomLayout ("use server" -> @/auth) at module scope.
// ProductEditWizard passes it productId/floorPlans (spec 0052, reverses the
// old AC-41 exclusion), so the room recognition card renders and calls this.
vi.mock("@/lib/producer-room-layout-actions", () => ({
  recognizeRoomLayout: vi.fn(),
}));

// extractStandardsFromMaterial ("use server" -> Azure OpenAI client chain)
// doesn't resolve under Vitest/jsdom, same gap as above. ProductEditWizard
// sets enableStandardsExtraction (spec 0052, reverses the old AC-41
// exclusion), so the standards extraction card renders and calls this.
vi.mock("@/lib/producer-standards-extraction-actions", () => ({
  extractStandardsFromMaterial: vi.fn(),
}));

// generateProjectTranslations ("use server" -> @/auth chain, spec 0050 AC-28
// to AC-30) has the same jsdom/vitest gap as the modules mocked above; no
// test here reaches the "tlumaczenia" step.
vi.mock("@/lib/producer-project-translation-actions", () => ({
  generateProjectTranslations: vi.fn(),
}));

vi.mock("@/lib/ai/product-translation", () => ({
  ALL_PROJECT_TRANSLATION_LOCALES: ["en", "nl", "de"],
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
        initialSalesPdf={null}
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
        initialSalesPdf={null}
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
        initialSalesPdf={null}
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

  // Spec 0052: both AI capabilities, previously exclusive to ProjectWizard
  // (AC-41), now also work in ProductEditWizard. The recognition/extraction
  // components' own behavior (merge, confidence badges, apply/skip flow) is
  // already covered by ProjectWizardRoomLayoutStep.test.tsx and
  // ProjectWizardVariantsStep.test.tsx; these two just prove the edit wizard
  // actually wires productId/floorPlans/enableStandardsExtraction through.
  it("shows the room recognition card in the room layout step and calls recognizeRoomLayout with the productId", async () => {
    const user = userEvent.setup();
    vi.mocked(recognizeRoomLayout).mockResolvedValue({
      ok: true,
      rooms: [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }],
    });
    render(
      <ProductEditWizard
        locale="pl"
        productId="product-1"
        initialDraft={initialDraft}
        initialPhotos={[]}
        initialFloorPlans={[{ id: "f1", url: "https://example.com/f1.jpg", filename: "rzut.jpg", variantId: null }]}
        initialSpecificationPdf={null}
        initialSalesPdf={null}
        initialVariants={[]}
        countries={countries}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Układ pomieszczeń" }));
    expect(screen.getByText("Rozpoznaj układ pomieszczeń z rzutów")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rozpoznaj pomieszczenia" }));

    expect(recognizeRoomLayout).toHaveBeenCalledWith("product-1", ["f1"]);
    await screen.findByDisplayValue("Salon");
  });

  it("shows the standards extraction card in the variants step and calls extractStandardsFromMaterial with the productId", async () => {
    const user = userEvent.setup();
    vi.mocked(extractStandardsFromMaterial).mockResolvedValue({
      ok: true,
      standards: [
        {
          name: "Comfort",
          priceEur: 90_000,
          priceOnRequest: false,
          costLineItems: [],
          proposedStandard: "deweloperski",
          confidence: "high",
        },
      ],
    });
    render(
      <ProductEditWizard
        locale="pl"
        productId="product-1"
        initialDraft={initialDraft}
        initialPhotos={[]}
        initialFloorPlans={[]}
        initialSpecificationPdf={null}
        initialSalesPdf={null}
        initialVariants={[]}
        countries={countries}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Warianty i cennik" }));
    expect(screen.getByText("Rozpoznaj standardy z materiału")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Wklejony tekst albo tabela"), "Comfort: 90-100k EUR");
    await user.click(screen.getByRole("button", { name: "Rozpoznaj standardy" }));

    expect(extractStandardsFromMaterial).toHaveBeenCalledWith("product-1", { kind: "text", text: "Comfort: 90-100k EUR" });
    expect(await screen.findByText("wysoka pewność")).toBeInTheDocument();
  });
});
