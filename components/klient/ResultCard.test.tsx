import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { ResultCard } from "./ResultCard";

// ResultCard imports FavoriteButton, które importuje toggleFavorite z
// lib/favorite-actions, które importuje auth.ts (next-auth) — niewczytywalne
// w środowisku testowym Vitest. Żaden test poniżej nie przekazuje propa
// `favorite`, więc FavoriteButton nigdy się nie renderuje, ale sam graf
// importów musi być zamockowany, ten sam wzorzec co InquiryFlow.test.tsx dla
// lib/inquiry-actions.
vi.mock("@/lib/favorite-actions", () => ({
  toggleFavorite: vi.fn(),
}));

const project: Project = createMockProject({ featured: true });

describe("ResultCard", () => {
  it("shows the comparable project, scope, technology and delivery facts (AC-7)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.getByText("Modulor Family 90")).toBeInTheDocument();
    expect(screen.getByText(/118\s?000.*142\s?000.*€/)).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems Sp\. z o\.o\..*Polska/)).toBeInTheDocument();
    expect(screen.getByText(/90 m² użytkowe.*4 pokoje.*1 kond/)).toBeInTheDocument();
    expect(screen.getByText(/Prefabrykowany szkielet drewniany.*Standard deweloperski/)).toBeInTheDocument();
    expect(screen.getByText("Dom + standardowy transport + montaż")).toBeInTheDocument();
    expect(screen.getByText(/12.*16 tyg. produkcji.*3.*5 dni montażu/)).toBeInTheDocument();
  });

  it("links to the project details page for a catalog project (spec 0020 AC-2)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/pl/klient/projekt/${project.id}`);
  });

  it("is not rendered as a link when it is a local producer preview (spec 0020 AC-8)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" localPreview />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("is not rendered as a link for a local- prefixed id (spec 0020 AC-8)", () => {
    const localProject = createMockProject({ id: "local-nip-1" });
    render(<ResultCard project={localProject} countryName="Polska" locale="pl" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows Wycena indywidualna instead of a price range when priceOnRequest is true (spec 0020 AC-5)", () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(<ResultCard project={onRequestProject} countryName="Polska" locale="pl" />);

    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText(/118\s?000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/142\s?000/)).not.toBeInTheDocument();
  });

  it("shows Wycena indywidualna instead of the dom/transport/montaż breakdown when priceOnRequest is true and countryCode is set (spec 0020 AC-5)", () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(<ResultCard project={onRequestProject} countryName="Polska" locale="pl" countryCode="DE" />);

    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText("Dom")).not.toBeInTheDocument();
    expect(screen.queryByText("Razem")).not.toBeInTheDocument();
  });

  it("shows the conditional badge only when eligibilityStatus is conditional (AC-7)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" eligibilityStatus="conditional" />);
    expect(screen.getByText("Wymaga dodatkowych dokumentów")).toBeInTheDocument();
  });

  it.each([undefined, "approved", "blocked"] as const)(
    "hides the conditional badge when eligibilityStatus is %s (AC-7)",
    (status) => {
      render(<ResultCard project={project} countryName="Polska" locale="pl" eligibilityStatus={status} />);
      expect(screen.queryByText("Wymaga dodatkowych dokumentów")).not.toBeInTheDocument();
    }
  );

  it("renders no selection checkbox when onToggleSelect is not provided (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders an accessibly named selection checkbox when onToggleSelect is provided (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" onToggleSelect={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: `Zaznacz ${project.name} do zapytania` })).toBeInTheDocument();
  });

  it("calls onToggleSelect when the checkbox is clicked, alongside the card's own link (AC-1)", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(<ResultCard project={project} countryName="Polska" locale="pl" onToggleSelect={onToggleSelect} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it("reflects the selected prop as the checkbox's checked state (AC-1)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" selected onToggleSelect={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("disables the checkbox and exposes a limit hint when selectionDisabled is true (AC-3)", () => {
    render(
      <ResultCard project={project} countryName="Polska" locale="pl" selectionDisabled onToggleSelect={vi.fn()} />
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
        locale="pl"
        selectionDisabled={false}
        onToggleSelect={vi.fn()}
      />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toHaveAttribute("title");
  });
});
