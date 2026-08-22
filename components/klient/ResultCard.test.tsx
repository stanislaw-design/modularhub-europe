import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { ResultCard } from "./ResultCard";

const project: Project = createMockProject({ featured: true });

describe("ResultCard", () => {
  it("shows the comparable project, scope, technology and delivery facts (AC-7)", () => {
    render(<ResultCard project={project} countryName="Polska" />);
    expect(screen.getByText("Modulor Family 90")).toBeInTheDocument();
    expect(screen.getByText(/118\s?000.*142\s?000.*€/)).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems Sp\. z o\.o\..*Polska/)).toBeInTheDocument();
    expect(screen.getByText(/90 m² użytkowe.*4 pokoje.*1 kond/)).toBeInTheDocument();
    expect(screen.getByText(/Prefabrykowany szkielet drewniany.*Standard deweloperski/)).toBeInTheDocument();
    expect(screen.getByText("Dom + standardowy transport + montaż")).toBeInTheDocument();
    expect(screen.getByText(/12.*16 tyg. produkcji.*3.*5 dni montażu/)).toBeInTheDocument();
  });

  it("is not rendered as a link or other navigation element (AC-8)", () => {
    render(<ResultCard project={project} countryName="Polska" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the conditional badge only when eligibilityStatus is conditional (AC-7)", () => {
    render(<ResultCard project={project} countryName="Polska" eligibilityStatus="conditional" />);
    expect(screen.getByText("Wymaga dodatkowych dokumentów")).toBeInTheDocument();
  });

  it.each([undefined, "approved", "blocked"] as const)(
    "hides the conditional badge when eligibilityStatus is %s (AC-7)",
    (status) => {
      render(<ResultCard project={project} countryName="Polska" eligibilityStatus={status} />);
      expect(screen.queryByText("Wymaga dodatkowych dokumentów")).not.toBeInTheDocument();
    }
  );

  it("renders no selection checkbox when onToggleSelect is not provided (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders an accessibly named selection checkbox when onToggleSelect is provided (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" onToggleSelect={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: `Zaznacz ${project.name} do zapytania` })).toBeInTheDocument();
  });

  it("calls onToggleSelect when the checkbox is clicked, without navigating (AC-1)", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(<ResultCard project={project} countryName="Polska" onToggleSelect={onToggleSelect} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("reflects the selected prop as the checkbox's checked state (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" selected onToggleSelect={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("disables the checkbox and exposes a limit hint when selectionDisabled is true (AC-3)", () => {
    render(
      <ResultCard project={project} countryName="Polska" selectionDisabled onToggleSelect={vi.fn()} />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute("title", "Można zaznaczyć maksymalnie 3 projekty");
  });

  it("keeps the checkbox enabled with no limit hint when selectionDisabled is false (AC-3)", () => {
    render(
      <ResultCard
        project={project}
        countryName="Polska"
        selectionDisabled={false}
        onToggleSelect={vi.fn()}
      />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toHaveAttribute("title");
  });
});
