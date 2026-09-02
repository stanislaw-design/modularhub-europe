import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardTechnicalStep } from "./ProjectWizardTechnicalStep";

describe("ProjectWizardTechnicalStep: family dom", () => {
  it("renders all eight dom fields as text inputs, none from the other families", () => {
    const draft = { ...createEmptyDraft(), family: "dom" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    for (const label of [
      "Układ ścian",
      "Izolacja",
      "Współczynniki przenikania ciepła",
      "Klasa okien",
      "Wentylacja",
      "Źródło ciepła",
      "Odporność ogniowa",
      "Odporność wiatrowa",
    ]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }
    expect(screen.queryByText("Typ dachu")).not.toBeInTheDocument();
    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
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

describe("ProjectWizardTechnicalStep: family pergola", () => {
  it("renders roofType as a select with the three pergola roof options, not spa's fields", async () => {
    const user = userEvent.setup();
    const draft = { ...createEmptyDraft(), family: "pergola" as const };
    render(<ProjectWizardTechnicalStep draft={draft} showValidation={false} onChange={vi.fn()} />);

    expect(screen.queryByText("Liczba miejsc")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    expect(screen.getByRole("option", { name: "Bioklimatyczny (regulowane lamele)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Stały" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rozsuwany" })).toBeInTheDocument();
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
