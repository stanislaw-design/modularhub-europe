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
  // wallBuildUp/insulation/windowClass/fireResistance/windResistance usunięte
  // z kreatora (spec 0049 AC-1): dom nie ma już żadnego wolnotekstowego pola
  // technicznego, tylko trzy selecty sprawdzone w testach niżej.
  it("renders none of the five retired free-text dom fields", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    for (const label of ["Układ ścian", "Izolacja", "Klasa okien", "Odporność ogniowa", "Odporność wiatrowa"]) {
      expect(screen.queryByLabelText(new RegExp(label))).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Typ dachu")).not.toBeInTheDocument();
    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
  });

  // heatSource/ventilation/heatTransferCoefficients/constructionTechnology
  // switched from free text to a closed list (spec 0026 AC-2, spec 0050
  // AC-20): same select pattern as spa's heatingType and pergola's roofType
  // below, checked the same way (getByText on the label; Select's trigger
  // button isn't programmatically associated via getByLabelText, same as the
  // other two families' select fields). heatTransferCoefficients defaults to
  // "Nie podano" (spec 0050 AC-20), so only the other three show "Wybierz…".
  it("renders heatSource/ventilation/heatTransferCoefficients/constructionTechnology as selects, not text inputs", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    for (const label of ["Źródło ciepła", "Wentylacja", "Klasa energetyczna", "Technologia konstrukcji"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Nie podano" })).toBeInTheDocument();
  });

  // Select order follows TECHNICAL_FIELDS_BY_FAMILY.dom: constructionTechnology,
  // heatTransferCoefficients (auto-defaulted, excluded from "Wybierz…"),
  // ventilation, heatSource — heatSource lands at index 2 among the three
  // still-unset "Wybierz…" buttons (constructionTechnology, ventilation, heatSource).
  it("updates the form's heatSource with the chosen option value", async () => {
    const user = userEvent.setup();
    const getForm = renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[2]);
    await user.click(screen.getByRole("option", { name: "Gazowe" }));

    expect(getForm().getValues("technicalSpecs")).toEqual({ heatSource: "gazowe", heatTransferCoefficients: "nieznana" });
  });

  it("offers 'nieznana' as a heatTransferCoefficients (energy class) option, relabeled 'Nie podano' (spec 0050 AC-20)", async () => {
    const user = userEvent.setup();
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    await user.click(screen.getByRole("button", { name: "Nie podano" }));

    expect(screen.getByRole("option", { name: "Nie podano" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Klasa A+" })).toBeInTheDocument();
  });

  it("does not block step completion by leaving heatTransferCoefficients on its default (spec 0050 AC-20, optional field)", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, true);

    expect(screen.queryByText("Wybierz klasa energetyczna.")).not.toBeInTheDocument();
  });

  it("shows an inline error under constructionTechnology, the still-required select, once showValidation is true", () => {
    renderStep({ ...createEmptyDraft(), family: "dom" as const }, true);

    expect(screen.getByText("Wybierz technologia konstrukcji.")).toBeInTheDocument();
  });

  it("shows a companion text field only once heatSource is set to 'inne'", async () => {
    const user = userEvent.setup();
    const getForm = renderStep({ ...createEmptyDraft(), family: "dom" as const }, false);

    expect(screen.queryByLabelText("Podaj źródło ciepła")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[2]);
    await user.click(screen.getByRole("option", { name: "Inne" }));
    await user.type(screen.getByLabelText("Podaj źródło ciepła"), "Kominek z płaszczem wodnym");

    expect(getForm().getValues("technicalSpecs.heatSourceOther")).toBe("Kominek z płaszczem wodnym");
  });

  it("merges a new field into technicalSpecs without dropping the other fields already entered", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(
      { ...createEmptyDraft(), family: "dom" as const, technicalSpecs: { ventilation: "rekuperacja" } },
      false,
    );

    // ventilation ma już wartość, heatTransferCoefficients dostaje domyślną
    // "nieznana" po zamontowaniu, więc wśród przycisków wciąż pokazujących
    // "Wybierz…" zostają tylko constructionTechnology (0) i heatSource (1).
    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[1]);
    await user.click(screen.getByRole("option", { name: "Gazowe" }));

    expect(getForm().getValues("technicalSpecs")).toEqual({
      ventilation: "rekuperacja",
      heatSource: "gazowe",
      heatTransferCoefficients: "nieznana",
    });
  });
});

// Spec 0053 AC-2: free text, optional, independent of family/containerSubcategory
// — same status as structuralWarrantyYears above, visible regardless of family.
describe("ProjectWizardTechnicalStep: foundationOptions (spec 0053 AC-2)", () => {
  it("renders the field as not required, next to the structural warranty", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByLabelText("Wymagania fundamentowe")).not.toBeRequired();
  });

  it("shows no validation error for a blank value even once showValidation is true", () => {
    renderStep(createEmptyDraft(), true);

    expect(screen.getByLabelText("Wymagania fundamentowe")).toHaveValue("");
    expect(screen.getByLabelText("Wymagania fundamentowe")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("updates the form's foundationOptions as the field changes", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText("Wymagania fundamentowe"), "Płyta fundamentowa");

    expect(getForm().getValues("foundationOptions")).toBe("Płyta fundamentowa");
  });

  it("pre-fills the field with the value already on the draft (edit wizard)", () => {
    renderStep({ ...createEmptyDraft(), foundationOptions: "Ławy fundamentowe" }, false);

    expect(screen.getByLabelText("Wymagania fundamentowe")).toHaveValue("Ławy fundamentowe");
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
  // Gwarancja konstrukcyjna (spec 0045 zadanie 9) jest polem produktu, nie
  // family-zależnym, więc pozostaje widoczna nawet zanim family jest wybrane
  // — tylko lista pól technicznych z getTechnicalFieldsFor jest wtedy pusta.
  // Sekcja logistyki (gwarancja montażu, zgłoszenie uproszczone) usunięta z
  // kreatora w całości (spec 0050 AC-21).
  it("renders the heading and warranty, but no family-specific field or removed logistics section, when family is null", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByRole("heading", { level: 2, name: "Dane techniczne" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Gwarancja konstrukcyjna/)).toBeInTheDocument();
    expect(screen.queryByText("Logistyka i zgodność")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Gwarancja montażu/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Układ ścian/)).not.toBeInTheDocument();
  });
});

// Spec 0050 AC-23, AC-24: raz na produkt, niezależnie od family/standardu —
// renderowana nawet przed wyborem family, jak gwarancja konstrukcyjna wyżej.
describe("ProjectWizardTechnicalStep: client requirements section (spec 0050 AC-23)", () => {
  it("renders the seven catalog checkboxes, all unchecked on an empty draft", () => {
    renderStep(createEmptyDraft(), false);

    for (const label of [
      "Fundament",
      "Przygotowanie działki",
      "Dojazd dla transportu",
      "Miejsce dla dźwigu",
      "Przyłącza",
      "Formalności",
      "Prace niewchodzące w zakres producenta",
    ]) {
      expect(screen.getByRole("checkbox", { name: label })).not.toBeChecked();
    }
  });

  it("checking a catalog item adds it to the form's clientRequirements, unchecking removes it", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.click(screen.getByRole("checkbox", { name: "Fundament" }));

    expect(getForm().getValues("clientRequirements")).toEqual([
      { id: expect.any(String), key: "fundament", label: "Fundament", custom: false },
    ]);
    expect(screen.getByRole("checkbox", { name: "Fundament" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Fundament" }));

    expect(getForm().getValues("clientRequirements")).toEqual([]);
  });

  it("pre-checks a catalog item already present in the draft (edit mode)", () => {
    renderStep(
      {
        ...createEmptyDraft(),
        clientRequirements: [{ id: "existing-1", key: "przylacza", label: "Przyłącza", custom: false }],
      },
      false,
    );

    expect(screen.getByRole("checkbox", { name: "Przyłącza" })).toBeChecked();
  });

  it("adds a custom item via the text field and button, then clears the input", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText("Własna pozycja"), "Wyburzenie starej szopy");
    await user.click(screen.getByRole("button", { name: "Dodaj pozycję" }));

    expect(getForm().getValues("clientRequirements")).toEqual([
      { id: expect.any(String), key: null, label: "Wyburzenie starej szopy", custom: true },
    ]);
    expect(screen.getByLabelText("Własna pozycja")).toHaveValue("");
    expect(screen.getByText("Wyburzenie starej szopy")).toBeInTheDocument();
  });

  it("disables the add-custom-item button while the text field is empty", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByRole("button", { name: "Dodaj pozycję" })).toBeDisabled();
  });

  it("removes a custom item via its trash button, leaving catalog items untouched", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(
      {
        ...createEmptyDraft(),
        clientRequirements: [
          { id: "catalog-1", key: "fundament", label: "Fundament", custom: false },
          { id: "custom-1", key: null, label: "Usunięcie starych fundamentów", custom: true },
        ],
      },
      false,
    );

    await user.click(screen.getByRole("button", { name: "Usuń pozycję Usunięcie starych fundamentów" }));

    expect(getForm().getValues("clientRequirements")).toEqual([
      { id: "catalog-1", key: "fundament", label: "Fundament", custom: false },
    ]);
    expect(screen.getByRole("checkbox", { name: "Fundament" })).toBeChecked();
  });
});
