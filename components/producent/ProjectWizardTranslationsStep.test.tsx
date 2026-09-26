import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseFormReturn } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDraft } from "@/lib/data/types";
import type { ProductTranslationLocale } from "@/lib/ai/product-translation";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardTranslationsStep } from "./ProjectWizardTranslationsStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

vi.mock("@/lib/producer-project-translation-actions", () => ({
  generateProjectTranslations: vi.fn(),
  getCostLineItemLabelTranslationsForProduct: vi.fn(),
}));

vi.mock("@/lib/ai/product-translation", () => ({
  ALL_PROJECT_TRANSLATION_LOCALES: ["en", "nl", "de"],
}));

import {
  generateProjectTranslations,
  getCostLineItemLabelTranslationsForProduct,
} from "@/lib/producer-project-translation-actions";

function renderStep(productId: string | null = "product-1", defaultValues: Partial<ProjectDraft> = {}) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={{ ...createEmptyDraft(), ...defaultValues }} onFormReady={(f) => (form = f)}>
      <ProjectWizardTranslationsStep productId={productId} />
    </WizardFormHarness>,
  );
  return () => form;
}

const emptyDraft = {
  ok: true as const,
  draft: {
    locales: ["en", "nl", "de"] as ProductTranslationLocale[],
    sourceDescription: "",
    description: {},
    sourceFoundationOptions: "",
    foundationOptions: {},
    roomLayout: [],
    faq: [],
    clientRequirements: [],
  },
};

describe("ProjectWizardTranslationsStep", () => {
  beforeEach(() => {
    vi.mocked(generateProjectTranslations).mockReset();
    vi.mocked(getCostLineItemLabelTranslationsForProduct).mockReset().mockResolvedValue({ ok: true, labels: [] });
  });

  it("shows the empty hint and the generate button before anything has been generated", () => {
    renderStep();
    expect(screen.getByText("Wygeneruj tłumaczenia, żeby zobaczyć i poprawić treść w każdym języku.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" })).toBeInTheDocument();
  });

  it("shows already-generated content on mount, without requiring a click, when editing a product that already has translations", () => {
    renderStep("product-1", { descriptionEn: "Modern house", descriptionNl: "Modern huis", descriptionDe: "Modernes Haus" });

    expect(screen.getByLabelText("Opis projektu")).toHaveValue("Modern house");
    expect(screen.queryByText("Wygeneruj tłumaczenia, żeby zobaczyć i poprawić treść w każdym języku.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wygeneruj ponownie" })).toBeInTheDocument();
  });

  it("also shows already-generated content on mount when only the foundation options translation exists (no description yet)", () => {
    renderStep("product-1", { foundationOptionsEn: "Concrete slab" });

    expect(screen.queryByText("Wygeneruj tłumaczenia, żeby zobaczyć i poprawić treść w każdym języku.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Wymagania fundamentowe")).toHaveValue("Concrete slab");
  });

  it("also shows already-generated content on mount when only room names or FAQ or client requirements are translated (no description yet)", () => {
    renderStep("product-1", { faqEn: [{ id: "faq-1", question: "Q?", answer: "A." }] });

    expect(screen.queryByText("Wygeneruj tłumaczenia, żeby zobaczyć i poprawić treść w każdym języku.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Opis projektu")).toBeInTheDocument();
  });

  it("generates translations and fills the description for the active language", async () => {
    vi.mocked(generateProjectTranslations).mockResolvedValue({
      ok: true,
      draft: { ...emptyDraft.draft, sourceDescription: "Nowoczesny dom", description: { en: "Modern house" } },
    });
    const user = userEvent.setup();
    const getForm = renderStep();

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));

    expect(generateProjectTranslations).toHaveBeenCalledWith("product-1", ["en", "nl", "de"]);
    expect(await screen.findByLabelText("Opis projektu")).toHaveValue("Modern house");
    expect(getForm().getValues("descriptionEn")).toBe("Modern house");
  });

  it("generates translations and fills the foundation options field for the active language", async () => {
    vi.mocked(generateProjectTranslations).mockResolvedValue({
      ok: true,
      draft: {
        ...emptyDraft.draft,
        sourceFoundationOptions: "Płyta fundamentowa",
        foundationOptions: { en: "Concrete slab foundation" },
      },
    });
    const user = userEvent.setup();
    const getForm = renderStep();

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));

    expect(await screen.findByLabelText("Wymagania fundamentowe")).toHaveValue("Concrete slab foundation");
    expect(getForm().getValues("foundationOptionsEn")).toBe("Concrete slab foundation");
  });

  it("switches the active language tab and shows that language's already-generated content", async () => {
    vi.mocked(generateProjectTranslations).mockResolvedValue({
      ok: true,
      draft: { ...emptyDraft.draft, description: { en: "Modern house", nl: "Modern huis", de: "Modernes Haus" } },
    });
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));
    await screen.findByLabelText("Opis projektu");
    expect(screen.getByLabelText("Opis projektu")).toHaveValue("Modern house");

    await user.click(screen.getByRole("tab", { name: "Niderlandzki" }));
    expect(screen.getByLabelText("Opis projektu")).toHaveValue("Modern huis");
  });

  it("fills room names and FAQ entries matched by id, for rows already present in the draft", async () => {
    vi.mocked(generateProjectTranslations).mockResolvedValue({
      ok: true,
      draft: {
        ...emptyDraft.draft,
        roomLayout: [{ id: "room-1", sourceName: "Salon", name: { en: "Living room" } }],
        faq: [
          {
            id: "faq-1",
            sourceQuestion: "Ile to kosztuje?",
            sourceAnswer: "Zależy od wariantu.",
            question: { en: "How much does it cost?" },
            answer: { en: "It depends on the variant." },
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderStep("product-1", {
      roomLayout: [{ id: "room-1", name: "Salon", areaM2: 25, floorLevel: "parter" }],
      faq: [{ id: "faq-1", question: "Ile to kosztuje?", answer: "Zależy od wariantu." }],
    });

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));

    expect(await screen.findByLabelText("Nazwa pomieszczenia „Salon”")).toHaveValue("Living room");
    expect(screen.getByLabelText("Pytanie 1")).toHaveValue("How much does it cost?");
    expect(screen.getByLabelText("Odpowiedź 1")).toHaveValue("It depends on the variant.");
  });

  it("shows the error and leaves the empty hint when generation fails", async () => {
    vi.mocked(generateProjectTranslations).mockResolvedValue({ ok: false, error: "Generowanie nie powiodło się." });
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Generowanie nie powiodło się.");
    expect(screen.queryByLabelText("Opis projektu")).not.toBeInTheDocument();
  });

  it("regenerates only the active language when the single-language button is clicked", async () => {
    vi.mocked(generateProjectTranslations)
      .mockResolvedValueOnce({ ok: true, draft: { ...emptyDraft.draft, description: { en: "Modern house" } } })
      .mockResolvedValueOnce({ ok: true, draft: { ...emptyDraft.draft, description: { en: "Modern house, revised" } } });
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" }));
    await screen.findByLabelText("Opis projektu");

    await user.click(screen.getByRole("button", { name: "Wygeneruj ponownie (Angielski)" }));

    expect(generateProjectTranslations).toHaveBeenLastCalledWith("product-1", ["en"]);
    expect(await screen.findByLabelText("Opis projektu")).toHaveValue("Modern house, revised");
  });

  describe("cost line item translation preview (read-only)", () => {
    it("shows the section on mount, with no generate click needed, once the background dictionary lookup resolves", async () => {
      vi.mocked(getCostLineItemLabelTranslationsForProduct).mockResolvedValue({
        ok: true,
        labels: [{ labelPl: "Fundament", translations: { en: "Foundation", nl: "Fundering", de: "Fundament" } }],
      });
      renderStep();

      expect(await screen.findByText("Co wchodzi w cenę")).toBeInTheDocument();
      expect(screen.getByText("Fundament")).toBeInTheDocument();
      expect(screen.getByText("Foundation")).toBeInTheDocument();
      // Purely a preview: no input/textarea for this section, unlike description/rooms/FAQ.
      expect(screen.queryByLabelText(/Fundament/)).not.toBeInTheDocument();
      expect(getCostLineItemLabelTranslationsForProduct).toHaveBeenCalledWith("product-1");
    });

    it("follows the active language tab, and falls back to a hint for a label still missing that language", async () => {
      vi.mocked(getCostLineItemLabelTranslationsForProduct).mockResolvedValue({
        ok: true,
        labels: [
          { labelPl: "Fundament", translations: { en: "Foundation", nl: "Fundering", de: "Fundament" } },
          { labelPl: "Transport", translations: { nl: "Vervoer" } },
        ],
      });
      const user = userEvent.setup();
      renderStep();
      await screen.findByText("Foundation");

      // "Transport" has no "en" entry yet (background job hasn't caught up).
      expect(screen.getByText("Jeszcze nie przetłumaczono")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Niderlandzki" }));

      expect(screen.getByText("Fundering")).toBeInTheDocument();
      expect(screen.getByText("Vervoer")).toBeInTheDocument();
      expect(screen.queryByText("Jeszcze nie przetłumaczono")).not.toBeInTheDocument();
    });

    it("stays hidden when the product has no cost line items yet", () => {
      renderStep();
      expect(screen.queryByText("Co wchodzi w cenę")).not.toBeInTheDocument();
    });
  });
});
