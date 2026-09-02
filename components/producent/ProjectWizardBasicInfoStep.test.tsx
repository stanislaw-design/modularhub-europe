import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardBasicInfoStep } from "./ProjectWizardBasicInfoStep";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

describe("ProjectWizardBasicInfoStep", () => {
  it("renders the five fields, all marked required", () => {
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/nazwa projektu/i)).toBeRequired();
    expect(screen.getByLabelText(/metraż/i)).toBeRequired();
    expect(screen.getByLabelText(/liczba sypialni/i)).toBeRequired();
    expect(screen.getByLabelText(/opis/i)).toBeRequired();
    // Rodzina i Kraj produkcji są oba selecty z placeholderem "Wybierz…" (spec 0022 AC-6).
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(2);
  });

  it("shows no inline errors on an empty draft while showValidation is false", () => {
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Podaj nazwę projektu.")).not.toBeInTheDocument();
    expect(screen.queryByText("Wybierz kraj produkcji.")).not.toBeInTheDocument();
  });

  it("shows an inline error under every empty required field once showValidation is true", () => {
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Podaj nazwę projektu.")).toBeInTheDocument();
    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
    expect(screen.getByText(/podaj liczbę sypialni od 0 do 10/i)).toBeInTheDocument();
    expect(screen.getByText("Wybierz kraj produkcji.")).toBeInTheDocument();
    expect(screen.getByText("Podaj opis projektu.")).toBeInTheDocument();
  });

  it("flags a floor area outside 20 to 500 as invalid even when the field is non-empty", () => {
    render(
      <ProjectWizardBasicInfoStep
        draft={{ ...createEmptyDraft(), floorAreaM2: 501 }}
        countries={countries}
        showValidation
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
  });

  it("does not show the floor area or bedrooms error once they hold a valid in-range value", () => {
    render(
      <ProjectWizardBasicInfoStep
        draft={{ ...createEmptyDraft(), floorAreaM2: 120, bedrooms: 3 }}
        countries={countries}
        showValidation
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText(/podaj metraż/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/podaj liczbę sypialni/i)).not.toBeInTheDocument();
  });

  it("calls onChange with the typed name as the field changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation={false}
        onChange={onChange}
      />
    );

    await user.type(screen.getByLabelText(/nazwa projektu/i), "M");

    expect(onChange).toHaveBeenCalledWith({ name: "M" });
  });

  it("calls onChange with a numeric floorAreaM2 as digits are typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation={false}
        onChange={onChange}
      />
    );

    await user.type(screen.getByLabelText(/metraż/i), "8");

    expect(onChange).toHaveBeenCalledWith({ floorAreaM2: 8 });
  });

  it("lists every given country as a selectable option and calls onChange with its code", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProjectWizardBasicInfoStep
        draft={createEmptyDraft()}
        countries={countries}
        showValidation={false}
        onChange={onChange}
      />
    );

    // Rodzina (pierwszy select w DOM) i Kraj produkcji (drugi) mają oba placeholder
    // "Wybierz…" na pustym draft (spec 0022 AC-6) — Kraj jest drugi w kolejności.
    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[1]);
    expect(screen.getByRole("option", { name: "Polska" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Niemcy" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Holandia" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Niemcy" }));

    expect(onChange).toHaveBeenCalledWith({ countryOfProduction: "DE" });
  });
});
