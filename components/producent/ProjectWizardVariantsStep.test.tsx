import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseFormReturn } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDraft } from "@/lib/data/types";
import type { ProducerVariantForEdit } from "@/lib/db/queries";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardVariantsStep } from "./ProjectWizardVariantsStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

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

import {
  cloneVariant,
  createVariant,
  deleteCostLineItem,
  deleteVariant,
  setDefaultVariant,
  updateVariant,
  updateVariantTranslation,
  upsertCostLineItem,
  upsertTimelineStage,
} from "@/lib/producer-product-variant-actions";

function renderStep(productId: string | null = "product-1", initialVariants: ProducerVariantForEdit[] = []) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={createEmptyDraft()} onFormReady={(f) => (form = f)}>
      <ProjectWizardVariantsStep productId={productId} initialVariants={initialVariants} />
    </WizardFormHarness>,
  );
  return () => form;
}

function editVariantFixture(overrides: Partial<ProducerVariantForEdit> = {}): ProducerVariantForEdit {
  return {
    id: "variant-existing-1",
    completionStandard: "deweloperski",
    isDefault: true,
    priceMinCents: 10_000_000,
    priceMaxCents: 12_000_000,
    priceOnRequest: false,
    scopeSummary: "Zakres podstawowy",
    excludedScope: null,
    scopeSummaryEn: "Base scope",
    scopeSummaryNl: null,
    costLineItems: [{ id: "item-1", label: "Fundament", status: "w-cenie", responsibleParty: null }],
    timelineStages: [{ stageKey: "formalnosci", durationMinDays: 2, durationMaxDays: 4, startsFromLabel: null, responsibleParty: null }],
    ...overrides,
  };
}

// Once a first variant exists, a "clone from" section with two more
// "Wybierz…" selects appears alongside the add-variant one (always first in
// the DOM), so the add-variant standard select is picked by position.
async function addVariant(user: ReturnType<typeof userEvent.setup>, standardLabel: string) {
  await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);
  await user.click(screen.getByRole("option", { name: standardLabel }));
  await user.click(screen.getByRole("button", { name: "Dodaj wariant" }));
}

describe("ProjectWizardVariantsStep", () => {
  beforeEach(() => {
    vi.mocked(createVariant).mockReset();
    vi.mocked(cloneVariant).mockReset();
    vi.mocked(updateVariant).mockReset();
    vi.mocked(updateVariantTranslation).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(setDefaultVariant).mockReset();
    vi.mocked(deleteVariant).mockReset();
    vi.mocked(upsertCostLineItem).mockReset();
    vi.mocked(deleteCostLineItem).mockReset();
    vi.mocked(upsertTimelineStage).mockReset().mockResolvedValue({ ok: true });
  });

  it("shows the empty hint and the add-variant controls when there are no variants yet", () => {
    renderStep();
    expect(screen.getByText("Nie dodano jeszcze żadnego wariantu.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dodaj wariant" })).toBeInTheDocument();
  });

  it("creates a variant via createVariant and renders it as the default", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: true, variantId: "variant-1" });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");

    expect(createVariant).toHaveBeenCalledWith("product-1", "deweloperski");
    expect(screen.getByRole("heading", { level: 3, name: "Standard deweloperski" })).toBeInTheDocument();
    expect(screen.getByText("Domyślny")).toBeInTheDocument();
  });

  it("surfaces the error and does not add a card when createVariant fails", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: false, error: "Ten standard wykończenia już ma wariant." });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");

    expect(await screen.findByText("Ten standard wykończenia już ma wariant.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("saves price and scope through updateVariant, and both translations, when Zapisz wariant is clicked", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: true, variantId: "variant-1" });
    vi.mocked(updateVariant).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const getForm = renderStep();

    await addVariant(user, "Standard deweloperski");
    await user.type(screen.getByLabelText("Cena minimalna (EUR)"), "100000");
    await user.type(screen.getByLabelText("Cena maksymalna (EUR)"), "120000");
    await user.click(screen.getByRole("button", { name: "Zapisz wariant" }));

    expect(await screen.findByText("Zapisano.")).toBeInTheDocument();
    expect(updateVariant).toHaveBeenCalledWith("variant-1", {
      priceMinEur: 100000,
      priceMaxEur: 120000,
      priceOnRequest: false,
      scopeSummary: "",
      excludedScope: "",
      variantLabel: "",
    });
    expect(updateVariantTranslation).toHaveBeenCalledWith("variant-1", "en", "");
    expect(updateVariantTranslation).toHaveBeenCalledWith("variant-1", "nl", "");

    // AC-1/AC-4: the outer draft's variantsSummary mirror reflects the saved price.
    expect(getForm().getValues("variantsSummary")).toEqual([{ isDefault: true, priceMinCents: 10_000_000 }]);
  });

  it("switches the default variant via setDefaultVariant when a second variant is added and picked", async () => {
    vi.mocked(createVariant)
      .mockResolvedValueOnce({ ok: true, variantId: "variant-1" })
      .mockResolvedValueOnce({ ok: true, variantId: "variant-2" });
    vi.mocked(setDefaultVariant).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");
    await addVariant(user, "Pod klucz");

    // Only the non-default variant renders the "set as default" radio, so
    // exactly one exists here (the second, "Pod klucz").
    await user.click(screen.getByRole("radio", { name: "Ustaw jako domyślny" }));

    expect(setDefaultVariant).toHaveBeenCalledWith("variant-2");
  });

  it("deletes a variant via deleteVariant and removes its card", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: true, variantId: "variant-1" });
    vi.mocked(deleteVariant).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");
    await user.click(screen.getByRole("button", { name: "Usuń wariant" }));

    expect(deleteVariant).toHaveBeenCalledWith("variant-1");
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByText("Nie dodano jeszcze żadnego wariantu.")).toBeInTheDocument();
  });

  it("adds a cost line item locally, then saves it through upsertCostLineItem", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: true, variantId: "variant-1" });
    vi.mocked(updateVariant).mockResolvedValue({ ok: true });
    vi.mocked(upsertCostLineItem).mockResolvedValue({ ok: true, itemId: "item-1" });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");
    await user.click(screen.getByRole("button", { name: "Dodaj pozycję kosztową" }));
    await user.type(screen.getByLabelText("Pozycja"), "Fundament");
    await user.click(screen.getByRole("button", { name: "Zapisz wariant" }));

    expect(await screen.findByText("Zapisano.")).toBeInTheDocument();
    expect(upsertCostLineItem).toHaveBeenCalledWith("variant-1", {
      id: null,
      label: "Fundament",
      status: "w-cenie",
      responsibleParty: "",
    });
  });

  it("removes an unsaved cost line item locally without calling deleteCostLineItem", async () => {
    vi.mocked(createVariant).mockResolvedValue({ ok: true, variantId: "variant-1" });
    const user = userEvent.setup();
    renderStep();

    await addVariant(user, "Standard deweloperski");
    await user.click(screen.getByRole("button", { name: "Dodaj pozycję kosztową" }));
    await user.click(screen.getByRole("button", { name: "Usuń pozycję kosztową" }));

    expect(deleteCostLineItem).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Pozycja")).not.toBeInTheDocument();
  });

  // ProductEditWizard hydration path (spec 0045 Build plan zadanie 5/13): a
  // producer editing an already-saved product must see its real, already
  // persisted variant, not an empty step.
  describe("with initialVariants (edit mode)", () => {
    it("renders an already-saved variant with its price, cost items, and timeline pre-filled, without calling createVariant", () => {
      renderStep("product-1", [editVariantFixture()]);

      expect(createVariant).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { level: 3, name: "Standard deweloperski" })).toBeInTheDocument();
      expect(screen.getByText("Domyślny")).toBeInTheDocument();
      expect(screen.getByLabelText("Cena minimalna (EUR)")).toHaveValue(100000);
      expect(screen.getByLabelText("Cena maksymalna (EUR)")).toHaveValue(120000);
      expect(screen.getByLabelText("Pozycja")).toHaveValue("Fundament");
      // Five fixed timeline-stage rows always render; "formalnosci" (with the
      // fixture's duration) is first, so its "Dni od" input is index 0.
      expect(screen.getAllByLabelText("Dni od")[0]).toHaveValue(2);
    });

    it("re-saves an already-saved variant by its real id, reusing the existing cost item id", async () => {
      vi.mocked(updateVariant).mockResolvedValue({ ok: true });
      vi.mocked(upsertCostLineItem).mockResolvedValue({ ok: true, itemId: "item-1" });
      const user = userEvent.setup();
      renderStep("product-1", [editVariantFixture()]);

      await user.click(screen.getByRole("button", { name: "Zapisz wariant" }));

      expect(await screen.findByText("Zapisano.")).toBeInTheDocument();
      expect(updateVariant).toHaveBeenCalledWith("variant-existing-1", {
        priceMinEur: 100000,
        priceMaxEur: 120000,
        priceOnRequest: false,
        scopeSummary: "Zakres podstawowy",
        excludedScope: "",
        variantLabel: "",
      });
      expect(upsertCostLineItem).toHaveBeenCalledWith("variant-existing-1", {
        id: "item-1",
        label: "Fundament",
        status: "w-cenie",
        responsibleParty: "",
      });
    });
  });
});
