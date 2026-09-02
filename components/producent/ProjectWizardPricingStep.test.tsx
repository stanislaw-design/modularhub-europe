import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardPricingStep } from "./ProjectWizardPricingStep";

describe("ProjectWizardPricingStep", () => {
  it("no longer renders a category selector, moved to the podstawowe step (spec 0022 AC-6)", () => {
    render(<ProjectWizardPricingStep draft={createEmptyDraft()} showValidation={false} onChange={vi.fn()} />);

    expect(screen.queryByText("Kategoria produktu")).not.toBeInTheDocument();
    expect(screen.queryByText("Kategoria")).not.toBeInTheDocument();
  });

  it("shows no inline errors on an empty draft while showValidation is false", () => {
    render(<ProjectWizardPricingStep draft={createEmptyDraft()} showValidation={false} onChange={vi.fn()} />);

    expect(screen.queryByText("Wybierz standard wykończenia.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Podaj cenę od i do, tak by cena od nie przekraczała ceny do.")
    ).not.toBeInTheDocument();
  });

  it("shows an inline error under every empty required field once showValidation is true", () => {
    render(<ProjectWizardPricingStep draft={createEmptyDraft()} showValidation onChange={vi.fn()} />);

    expect(
      screen.getByText("Podaj cenę od i do, tak by cena od nie przekraczała ceny do.")
    ).toBeInTheDocument();
    expect(screen.getByText("Wybierz standard wykończenia.")).toBeInTheDocument();
    expect(
      screen.getByText("Podaj termin produkcji od i do, tak by wartość od nie przekraczała wartości do.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Podaj czas montażu od i do, tak by wartość od nie przekraczała wartości do.")
    ).toBeInTheDocument();
    expect(screen.getByText("Podaj gwarancję konstrukcyjną w latach.")).toBeInTheDocument();
  });

  it("flags a reversed price range as invalid even when both fields are filled", () => {
    render(
      <ProjectWizardPricingStep
        draft={{ ...createEmptyDraft(), housePriceMinEur: 130000, housePriceMaxEur: 100000 }}
        showValidation
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText("Podaj cenę od i do, tak by cena od nie przekraczała ceny do.")
    ).toBeInTheDocument();
  });

  it("calls onChange with a numeric housePriceMinEur as digits are typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProjectWizardPricingStep draft={createEmptyDraft()} showValidation={false} onChange={onChange} />);

    await user.type(screen.getByLabelText("Cena domu, od (EUR)"), "1");

    expect(onChange).toHaveBeenCalledWith({ housePriceMinEur: 1 });
  });

  it("selects a completion standard and calls onChange with its value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProjectWizardPricingStep draft={createEmptyDraft()} showValidation={false} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    await user.click(screen.getByRole("option", { name: "Pod klucz" }));

    expect(onChange).toHaveBeenCalledWith({ completionStandard: "pod-klucz" });
  });
});
