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
  it("renders the four fields, all marked required", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByLabelText(/nazwa projektu/i)).toBeRequired();
    expect(screen.getByLabelText(/metraż/i)).toBeRequired();
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
    expect(screen.getByText("Wybierz kraj produkcji.")).toBeInTheDocument();
    expect(screen.getByText("Wybierz co najmniej jeden kraj dostawy.")).toBeInTheDocument();
    expect(screen.getByText("Podaj opis projektu.")).toBeInTheDocument();
  });

  it("flags a floor area outside 20 to 500 as invalid even when the field is non-empty", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 501 }, true);

    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
  });

  it("does not show the floor area error once it holds a valid in-range value", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 120 }, true);

    expect(screen.queryByText(/podaj metraż/i)).not.toBeInTheDocument();
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

  // Spec 0053 AC-1: externalDimensions is a free text field, optional (no
  // required asterisk, no validation error even when the draft is empty).
  describe("externalDimensions (spec 0053 AC-1)", () => {
    it("renders the field as not required", () => {
      renderStep(createEmptyDraft(), false);

      expect(screen.getByLabelText("Wymiary zewnętrzne")).not.toBeRequired();
    });

    it("shows no validation error for a blank value even once showValidation is true", () => {
      renderStep(createEmptyDraft(), true);

      expect(screen.getByLabelText("Wymiary zewnętrzne")).toHaveValue("");
      expect(screen.getByLabelText("Wymiary zewnętrzne")).not.toHaveAttribute("aria-invalid", "true");
    });

    it("updates the form's externalDimensions as the field changes", async () => {
      const user = userEvent.setup();
      const getForm = renderStep(createEmptyDraft(), false);

      await user.type(screen.getByLabelText("Wymiary zewnętrzne"), "10m x 8m x 5m");

      expect(getForm().getValues("externalDimensions")).toBe("10m x 8m x 5m");
    });

    it("pre-fills the field with the value already on the draft (edit wizard)", () => {
      renderStep({ ...createEmptyDraft(), externalDimensions: "12m x 9m x 6m" }, false);

      expect(screen.getByLabelText("Wymiary zewnętrzne")).toHaveValue("12m x 9m x 6m");
    });
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

  describe("delivery countries (spec 0018 product_country_eligibility)", () => {
    it("renders one checkbox per given country, all unchecked on an empty draft", () => {
      renderStep(createEmptyDraft(), false);

      expect(screen.getByLabelText("Polska")).not.toBeChecked();
      expect(screen.getByLabelText("Niemcy")).not.toBeChecked();
      expect(screen.getByLabelText("Holandia")).not.toBeChecked();
    });

    it("does not show the delivery countries error once at least one is selected", () => {
      renderStep({ ...createEmptyDraft(), deliveryCountries: ["PL"] }, true);

      expect(screen.queryByText("Wybierz co najmniej jeden kraj dostawy.")).not.toBeInTheDocument();
    });

    it("adds a country to the form when its checkbox is checked, and removes it when unchecked", async () => {
      const user = userEvent.setup();
      const getForm = renderStep(createEmptyDraft(), false);

      await user.click(screen.getByLabelText("Polska"));
      expect(getForm().getValues("deliveryCountries")).toEqual(["PL"]);

      await user.click(screen.getByLabelText("Niemcy"));
      expect(getForm().getValues("deliveryCountries")).toEqual(["PL", "DE"]);

      await user.click(screen.getByLabelText("Polska"));
      expect(getForm().getValues("deliveryCountries")).toEqual(["DE"]);
    });

    it("pre-checks the countries already present on the draft (edit wizard)", () => {
      renderStep({ ...createEmptyDraft(), deliveryCountries: ["DE", "NL"] }, false);

      expect(screen.getByLabelText("Polska")).not.toBeChecked();
      expect(screen.getByLabelText("Niemcy")).toBeChecked();
      expect(screen.getByLabelText("Holandia")).toBeChecked();
    });
  });
});
