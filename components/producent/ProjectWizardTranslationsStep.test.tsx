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
}));

vi.mock("@/lib/ai/product-translation", () => ({
  ALL_PROJECT_TRANSLATION_LOCALES: ["en", "nl", "de"],
}));

import { generateProjectTranslations } from "@/lib/producer-project-translation-actions";

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
    roomLayout: [],
    faq: [],
    clientRequirements: [],
  },
};

describe("ProjectWizardTranslationsStep", () => {
  beforeEach(() => {
    vi.mocked(generateProjectTranslations).mockReset();
  });

  it("shows the empty hint and the generate button before anything has been generated", () => {
    renderStep();
    expect(screen.getByText("Wygeneruj tłumaczenia, żeby zobaczyć i poprawić treść w każdym języku.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wygeneruj tłumaczenia" })).toBeInTheDocument();
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
      roomLayout: [{ id: "room-1", name: "Salon", areaM2: 25, function: "dzienna", floorLevel: "parter" }],
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
});
