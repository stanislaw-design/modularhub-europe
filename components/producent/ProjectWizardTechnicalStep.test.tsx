import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import type { ProjectDraft } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

function renderStep(defaultValues: ProjectDraft, showValidation: boolean) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={defaultValues} onFormReady={(f) => (form = f)}>
      <ProjectWizardTechnicalStep showValidation={showValidation} />
    </WizardFormHarness>,
  );
  return () => form;
}

describe("ProjectWizardTechnicalStep: family dom", () => {
  it("renders the five free-text dom fields as text inputs, none from the other families", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    for (const label of ["Układ ścian", "Izolacja", "Klasa okien", "Odporność ogniowa", "Odporność wiatrowa"]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }
    expect(screen.queryByText("Typ dachu")).not.toBeInTheDocument();
    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
  });

  // heatSource/ventilation/heatTransferCoefficients switched from free text to a
  // closed list (spec 0026 AC-2, Feature design): same select pattern as spa's
  // heatingType and pergola's roofType below, checked the same way (getByText on
  // the label; Select's trigger button isn't programmatically associated via
  // getByLabelText, same as the other two families' select fields).
  it("renders heatSource/ventilation/heatTransferCoefficients as selects, not text inputs", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    for (const label of ["Źródło ciepła", "Wentylacja", "Klasa energetyczna"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(3);
  });

  // Select order follows TECHNICAL_FIELDS_BY_FAMILY.dom: heatTransferCoefficients,
  // ventilation, heatSource (indices 0, 1, 2 among the three select buttons).
  it("updates the form's heatSource with the chosen option value", async () => {
    const user = userEvent.setup();
    const getForm = renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[2]);
    await user.click(screen.getByRole("option", { name: "Gazowe" }));

    expect(getForm().getValues("technicalSpecs")).toEqual({ heatSource: "gazowe" });
  });

  it("does not offer 'nieznana' as a heatTransferCoefficients (energy class) option (spec 0026 Feature design)", async () => {
    const user = userEvent.setup();
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);

    expect(screen.queryByRole("option", { name: /nieznana/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Klasa A+" })).toBeInTheDocument();
  });

  it("merges a new field into technicalSpecs without dropping the other fields already entered", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(
      { ...createEmptyDraft(), family: "dom" as const, technicalSpecs: { insulation: "U = 0.15" } },
      false,
    );

    await user.type(screen.getByLabelText(/Układ ścian/), "S");

    expect(getForm().getValues("technicalSpecs")).toEqual({ insulation: "U = 0.15", wallBuildUp: "S" });
  });

  it("shows an inline error under an empty required field once showValidation is true", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, true);

    expect(screen.getByText("Podaj układ ścian.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: family spa-modulowe", () => {
  it("renders numeric fields as number inputs and heatingType as a select, not dom's fields", () => {
    renderStep({ ...createEmptyDraft(), family: "spa-modulowe" as const }, false);

    expect(screen.getByLabelText(/Liczba miejsc/)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText(/Objętość wody/)).toHaveAttribute("type", "number");
    expect(screen.getByText("Typ ogrzewania")).toBeInTheDocument();
    expect(screen.queryByText("Układ ścian")).not.toBeInTheDocument();
  });

  it("updates the form's heatingType with the chosen option value", async () => {
    const user = userEvent.setup();
    const getForm = renderStep({ ...createEmptyDraft(), family: "spa-modulowe" as const }, false);

    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    await user.click(screen.getByRole("option", { name: "Pompa ciepła" }));

    expect(getForm().getValues("technicalSpecs")).toEqual({ heatingType: "heat-pump" });
  });

  it("flags an unset select as invalid once showValidation is true", () => {
    renderStep({ ...createEmptyDraft(), family: "spa-modulowe" as const }, true);

    expect(screen.getByText("Wybierz typ ogrzewania.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: family kontenery-modulowe (spec 0039)", () => {
  // Gwarancja konstrukcyjna i sekcja logistyki (spec 0045 zadanie 9) są
  // niezależne od family/containerSubcategory — pozostają widoczne nawet bez
  // wybranej podkategorii, stąd asercja przez konkretną etykietę pola
  // technicznego zamiast ogólnego braku pól typu "textbox".
  it("renders no family-specific fields when containerSubcategory is not yet chosen", () => {
    renderStep({ ...createEmptyDraft(), family: "kontenery-modulowe" as const }, false);

    expect(screen.queryByLabelText(/Wymiary$/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Gwarancja konstrukcyjna/)).toBeInTheDocument();
  });

  it("renders the nine gastronomiczne fields, not mieszkalne's or spa's fields (AC-4, AC-5)", () => {
    renderStep(
      { ...createEmptyDraft(), family: "kontenery-modulowe" as const, containerSubcategory: "gastronomiczne" as const },
      false,
    );

    for (const label of [/^Wymiary(?!\s*transportowe)/, /Materiał konstrukcji/, /Wyposażenie kuchenne/, /Wyciąg/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Liczba miejsc do spania")).not.toBeInTheDocument();
    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
  });

  it("renders mieszkalne's bathroomIncluded as a checkbox, not a text/number input", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(
      { ...createEmptyDraft(), family: "kontenery-modulowe" as const, containerSubcategory: "mieszkalne" as const },
      false,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Łazienka" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(getForm().getValues("technicalSpecs")).toEqual({ bathroomIncluded: true });
  });

  it("flags an unset boolean field as invalid once showValidation is true", () => {
    renderStep(
      { ...createEmptyDraft(), family: "kontenery-modulowe" as const, containerSubcategory: "mieszkalne" as const },
      true,
    );

    expect(screen.getByText("Wybierz łazienka.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: no family chosen yet", () => {
  // Gwarancja konstrukcyjna i logistyka (spec 0045 zadanie 9) są pola produktu,
  // nie family-zależne, więc pozostają widoczne nawet zanim family jest wybrane
  // — tylko lista pól technicznych z getTechnicalFieldsFor jest wtedy pusta.
  it("renders the heading, warranty, and logistics section, but no family-specific field, when family is null", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByRole("heading", { level: 2, name: "Dane techniczne" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Gwarancja konstrukcyjna/)).toBeInTheDocument();
    expect(screen.getByText("Logistyka i zgodność")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Układ ścian/)).not.toBeInTheDocument();
  });
});
