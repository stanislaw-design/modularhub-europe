import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WizardStep } from "@/lib/producer-project-draft";
import { ProjectWizardProgress } from "./ProjectWizardProgress";

const steps: WizardStep[] = [
  { id: "podstawowe", label: "Krok A" },
  { id: "techniczne", label: "Krok B" },
  { id: "pliki", label: "Krok C" },
];

describe("ProjectWizardProgress", () => {
  it("renders one entry per step, in order", () => {
    render(
      <ProjectWizardProgress steps={steps} currentIndex={0} maxReachedIndex={0} onStepClick={vi.fn()} />
    );

    expect(screen.getByText("Krok A")).toBeInTheDocument();
    expect(screen.getByText("Krok B")).toBeInTheDocument();
    expect(screen.getByText("Krok C")).toBeInTheDocument();
  });

  it("marks only the current step with aria-current='step'", () => {
    render(
      <ProjectWizardProgress steps={steps} currentIndex={1} maxReachedIndex={1} onStepClick={vi.fn()} />
    );

    const current = screen.getByText("Krok B").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Krok A").closest("li")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Krok C").closest("li")).not.toHaveAttribute("aria-current");
  });

  it("disables the current step's own button (nothing to jump to)", () => {
    render(
      <ProjectWizardProgress steps={steps} currentIndex={1} maxReachedIndex={1} onStepClick={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /Krok B/ })).toBeDisabled();
  });

  it("disables an upcoming step never reached, and clicking it does nothing", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(
      <ProjectWizardProgress steps={steps} currentIndex={0} maxReachedIndex={0} onStepClick={onStepClick} />
    );

    const upcoming = screen.getByRole("button", { name: /Krok C/ });
    expect(upcoming).toBeDisabled();

    await user.click(upcoming);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("enables an already completed step behind the current one, and clicking it calls onStepClick with its index", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(
      <ProjectWizardProgress steps={steps} currentIndex={1} maxReachedIndex={1} onStepClick={onStepClick} />
    );

    const completed = screen.getByRole("button", { name: /Krok A/ });
    expect(completed).toBeEnabled();

    await user.click(completed);
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it("keeps a step already reached ahead of the current one clickable after stepping back", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(
      <ProjectWizardProgress steps={steps} currentIndex={0} maxReachedIndex={2} onStepClick={onStepClick} />
    );

    const aheadButReached = screen.getByRole("button", { name: /Krok C/ });
    expect(aheadButReached).toBeEnabled();

    await user.click(aheadButReached);
    expect(onStepClick).toHaveBeenCalledWith(2);
  });
});
