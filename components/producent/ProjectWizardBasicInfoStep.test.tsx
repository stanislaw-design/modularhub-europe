import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

function renderStep(defaultValues: ProjectDraft, showValidation: boolean, familyLocked = false) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={defaultValues} onFormReady={(f) => (form = f)}>
      <ProjectWizardBasicInfoStep countries={countries} showValidation={showValidation} familyLocked={familyLocked} />
    </WizardFormHarness>,
  );
  return () => form;
}

describe("ProjectWizardBasicInfoStep", () => {
  it("renders the five fields, all marked required", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByLabelText(/nazwa projektu/i)).toBeRequired();
    expect(screen.getByLabelText(/metraż/i)).toBeRequired();
    expect(screen.getByLabelText(/liczba sypialni/i)).toBeRequired();
    expect(screen.getByLabelText("Opis *")).toBeRequired();
    // Rodzina i Kraj produkcji są oba selecty z placeholderem "Wybierz…" (spec 0022 AC-6).
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(2);
  });

  it("shows no inline errors on an empty draft while showValidation is false", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.queryByText("Podaj nazwę projektu.")).not.toBeInTheDocument();
    expect(screen.queryByText("Wybierz kraj produkcji.")).not.toBeInTheDocument();
  });

  it("shows an inline error under every empty required field once showValidation is true", () => {
    renderStep(createEmptyDraft(), true);

    expect(screen.getByText("Podaj nazwę projektu.")).toBeInTheDocument();
    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
    expect(screen.getByText(/podaj liczbę sypialni od 0 do 10/i)).toBeInTheDocument();
    expect(screen.getByText("Wybierz kraj produkcji.")).toBeInTheDocument();
    expect(screen.getByText("Podaj opis projektu.")).toBeInTheDocument();
  });

  it("flags a floor area outside 20 to 500 as invalid even when the field is non-empty", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 501 }, true);

    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
  });

  it("does not show the floor area or bedrooms error once they hold a valid in-range value", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 120, bedrooms: 3 }, true);

    expect(screen.queryByText(/podaj metraż/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/podaj liczbę sypialni/i)).not.toBeInTheDocument();
  });

  it("updates the form's name value as the field changes", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText(/nazwa projektu/i), "M");

    expect(getForm().getValues("name")).toBe("M");
  });

  it("updates the form's floorAreaM2 with a number as digits are typed", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText(/metraż/i), "8");

    expect(getForm().getValues("floorAreaM2")).toBe(8);
  });

  it("lists every given country as a selectable option and updates the form with its code", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    // Rodzina (pierwszy select w DOM) i Kraj produkcji (drugi) mają oba placeholder
    // "Wybierz…" na pustym draft (spec 0022 AC-6) — Kraj jest drugi w kolejności.
    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[1]);
    expect(screen.getByRole("option", { name: "Polska" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Niemcy" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Holandia" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Niemcy" }));

    expect(getForm().getValues("countryOfProduction")).toBe("DE");
  });
});
