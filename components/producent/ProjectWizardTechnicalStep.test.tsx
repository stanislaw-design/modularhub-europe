import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";

describe("ProjectWizardTechnicalStep: family dom", () => {
  it("renders the five free-text dom fields as text inputs, none from the other families", () => {
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

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
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    for (const label of ["Źródło ciepła", "Wentylacja", "Klasa energetyczna"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(3);
  });

  // Select order follows TECHNICAL_FIELDS_BY_FAMILY.dom: heatTransferCoefficients,
  // ventilation, heatSource (indices 0, 1, 2 among the three select buttons).
  it("calls onChange with the chosen heatSource option value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={onChange} />);

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[2]);
    await user.click(screen.getByRole("option", { name: "Gazowe" }));

    expect(onChange).toHaveBeenCalledWith({ technicalSpecs: { heatSource: "gazowe" } });
  });

  it("does not offer 'nieznana' as a heatTransferCoefficients (energy class) option (spec 0026 Feature design)", async () => {
    const user = userEvent.setup();
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);

    expect(screen.queryByRole("option", { name: /nieznana/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Klasa A+" })).toBeInTheDocument();
  });

  it("merges a new field into technicalSpecs without dropping the other fields already entered", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const draft = {
      ...createEmptyDraft(),
      family: "dom" as const,
      technicalSpecs: { insulation: "U = 0.15" },
    };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={onChange} />);

    await user.type(screen.getByLabelText(/Układ ścian/), "S");

    expect(onChange).toHaveBeenCalledWith({
      technicalSpecs: { insulation: "U = 0.15", wallBuildUp: "S" },
    });
  });

  it("shows an inline error under an empty required field once showValidation is true", () => {
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation onChange={vi.fn()} />);

    expect(screen.getByText("Podaj układ ścian.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: family spa-modulowe", () => {
  it("renders numeric fields as number inputs and heatingType as a select, not dom's fields", () => {
    const draft = { ...createEmptyDraft(), family: "spa-modulowe" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/Liczba miejsc/)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText(/Objętość wody/)).toHaveAttribute("type", "number");
    expect(screen.getByText("Typ ogrzewania")).toBeInTheDocument();
    expect(screen.queryByText("Układ ścian")).not.toBeInTheDocument();
  });

  it("calls onChange with the chosen heatingType option value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const draft = { ...createEmptyDraft(), family: "spa-modulowe" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    await user.click(screen.getByRole("option", { name: "Pompa ciepła" }));

    expect(onChange).toHaveBeenCalledWith({ technicalSpecs: { heatingType: "heat-pump" } });
  });

  it("flags an unset select as invalid once showValidation is true", () => {
    const draft = { ...createEmptyDraft(), family: "spa-modulowe" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation onChange={vi.fn()} />);

    expect(screen.getByText("Wybierz typ ogrzewania.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: family kontenery-modulowe (spec 0039)", () => {
  it("renders no fields when containerSubcategory is not yet chosen", () => {
    const draft = { ...createEmptyDraft(), family: "kontenery-modulowe" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders the nine gastronomiczne fields, not mieszkalne's or spa's fields (AC-4, AC-5)", () => {
    const draft = {
      ...createEmptyDraft(),
      family: "kontenery-modulowe" as const,
      containerSubcategory: "gastronomiczne" as const,
    };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    for (const label of ["Wymiary", "Materiał konstrukcji", "Wyposażenie kuchenne", "Wyciąg"]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }
    expect(screen.queryByText("Liczba miejsc do spania")).not.toBeInTheDocument();
    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
  });

  it("renders mieszkalne's bathroomIncluded as a checkbox, not a text/number input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const draft = {
      ...createEmptyDraft(),
      family: "kontenery-modulowe" as const,
      containerSubcategory: "mieszkalne" as const,
    };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "Łazienka" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledWith({ technicalSpecs: { bathroomIncluded: true } });
  });

  it("flags an unset boolean field as invalid once showValidation is true", () => {
    const draft = {
      ...createEmptyDraft(),
      family: "kontenery-modulowe" as const,
      containerSubcategory: "mieszkalne" as const,
    };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation onChange={vi.fn()} />);

    expect(screen.getByText("Wybierz łazienka.")).toBeInTheDocument();
  });
});

describe("ProjectWizardTechnicalStep: no family chosen yet", () => {
  it("renders the heading only, no fields, when family is null", () => {
    const draft = createEmptyDraft();
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 2, name: "Dane techniczne" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
