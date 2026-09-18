import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { createProducerProduct, updateProducerProduct } from "@/lib/producer-product-actions";
import { ProjectWizard } from "./ProjectWizard";

const countries: Country[] = [{ code: "PL", name: "Polska" }];

// ProjectWizardFilesStep pulls in ProducerProductPhotosStep, which pulls in a
// server action chain (@/auth -> next-auth) that jsdom/vitest can't resolve —
// same gap as ProjectWizardFilesStep.test.tsx. Stub it; no test here reaches
// the files step's photo upload UI.
vi.mock("./ProducerProductPhotosStep", () => ({
  ProducerProductPhotosStep: () => null,
}));

vi.mock("./ProducerFloorPlanUploadStep", () => ({
  ProducerFloorPlanUploadStep: () => null,
}));

vi.mock("@/lib/producer-product-actions", () => ({
  createProducerProduct: vi.fn(),
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

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

// Wypełnia krok "Informacje podstawowe" minimalnym kompletem wymaganych pól
// (rodzina "dom" + jej podkategoria), żeby "Dalej" przepuściło walidację
// isStepComplete (lib/producer-project-draft.ts).
async function fillBasicInfoStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);
  await user.click(screen.getByRole("option", { name: "Dom" }));
  // Po wyborze rodziny pojawia się selekt podkategorii, więc znów są dwa
  // "Wybierz…" (podkategoria, potem kraj) — podkategoria jest pierwsza w DOM.
  await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);
  await user.click(screen.getByRole("option", { name: "Całoroczny" }));
  await user.type(screen.getByLabelText(/nazwa projektu/i), "Modulor 28");
  await user.type(screen.getByLabelText(/metraż/i), "120");
  await user.type(screen.getByLabelText(/liczba sypialni/i), "3");
  await user.click(screen.getByRole("button", { name: "Wybierz…" }));
  await user.click(screen.getByRole("option", { name: "Polska" }));
  await user.type(screen.getByLabelText("Opis *"), "Opis projektu");
}

describe("ProjectWizard", () => {
  beforeEach(() => {
    vi.mocked(createProducerProduct).mockReset();
    vi.mocked(updateProducerProduct).mockReset();
  });

  it("starts on the basic info step and does not call createProducerProduct when Next is clicked on an empty step", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" countries={countries} />);

    expect(screen.getByRole("heading", { level: 1, name: "Dodaj pierwszy projekt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dalej" }));

    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
    expect(createProducerProduct).not.toHaveBeenCalled();
  });

  it("creates the product and advances to the next step once the basic info step is complete", async () => {
    vi.mocked(createProducerProduct).mockResolvedValue({ ok: true, productId: "product-1" });
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" countries={countries} />);

    await fillBasicInfoStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Dane techniczne" })).toBeInTheDocument();
    expect(createProducerProduct).toHaveBeenCalledTimes(1);
    expect(updateProducerProduct).not.toHaveBeenCalled();
  });

  it("keeps entered values when navigating back to a previous step", async () => {
    vi.mocked(createProducerProduct).mockResolvedValue({ ok: true, productId: "product-1" });
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" countries={countries} />);

    await fillBasicInfoStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    await screen.findByRole("heading", { level: 2, name: "Dane techniczne" });

    await user.click(screen.getByRole("button", { name: "Wstecz" }));

    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("Modulor 28");
    expect(screen.getByLabelText(/metraż/i)).toHaveValue(120);
  });

  it("surfaces the save error and does not navigate away when creation fails", async () => {
    vi.mocked(createProducerProduct).mockResolvedValue({ ok: false, error: "Ten NIP już istnieje." });
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" countries={countries} />);

    await fillBasicInfoStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));

    expect(await screen.findByText("Ten NIP już istnieje.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
  });
});
