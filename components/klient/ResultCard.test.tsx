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
    expect(screen.getByText(/od 118\s?000\s?€/)).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems Sp\. z o\.o\..*Polska/)).toBeInTheDocument();
    expect(screen.getByText(/90 m² użytkowe.*4 pokoje.*1 kond/)).toBeInTheDocument();
    expect(screen.getByText(/Prefabrykowany szkielet drewniany.*Standard deweloperski/)).toBeInTheDocument();
    expect(screen.getByText(/12.*16 tyg. produkcji.*3.*5 dni montażu/)).toBeInTheDocument();
  });

  it("links to the project details page for a catalog project (spec 0020 AC-2)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/pl/project/${project.id}`);
  });

  it("shows Wycena indywidualna instead of a price range when priceOnRequest is true (spec 0020 AC-5)", () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(<ResultCard project={onRequestProject} countryName="Polska" locale="pl" />);

    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText(/118\s?000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/142\s?000/)).not.toBeInTheDocument();
  });

  it("shows Wycena indywidualna instead of the house price when priceOnRequest is true and countryCode is set (spec 0020 AC-5)", () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(<ResultCard project={onRequestProject} countryName="Polska" locale="pl" countryCode="DE" />);

    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText("Dom")).not.toBeInTheDocument();
  });

  it("shows only the house price, without transport or assembly, even when countryCode is set", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" countryCode="DE" />);

    expect(screen.getByText(/Cena/)).toBeInTheDocument();
    expect(screen.getByText(/od 118\s?000\s?€/)).toBeInTheDocument();
    expect(screen.queryByText("Razem")).not.toBeInTheDocument();
    expect(screen.queryByText("Montaż")).not.toBeInTheDocument();
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

  it("pairs the price with the default variant's name and in-price cost line item labels (spec 0044 AC-1, spec 0051 AC-6)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.getAllByText(/Standard deweloperski/).length).toBeGreaterThan(0);
    expect(screen.getByText("Fundament, Ściany i dach")).toBeInTheDocument();
  });

  it("shows a scope-to-be-confirmed fallback instead of hiding the scope line (spec 0044 AC-2)", () => {
    const noScopeProject = createMockProject({
      variants: [{ ...project.variants[0], costLineItems: [] }],
    });
    render(<ResultCard project={noScopeProject} countryName="Polska" locale="pl" />);
    expect(screen.getByText("Zakres do potwierdzenia")).toBeInTheDocument();
  });

  it("shows a floor-plan link only when a product_floor_plan document exists (spec 0044 AC-3)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" />);
    expect(screen.queryByText("Rzut dostępny")).not.toBeInTheDocument();

    const withPlan = createMockProject({ documents: [{ url: "/plan.png", purpose: "product_floor_plan" }] });
    render(<ResultCard project={withPlan} countryName="Polska" locale="pl" />);
    const link = screen.getByRole("link", { name: `Zobacz rzut projektu ${withPlan.name}` });
    expect(link).toHaveAttribute("href", `/pl/project/${withPlan.id}?zakladka=rzut`);
  });

  it("preserves the country param on the floor-plan link (spec 0044 AC-3)", () => {
    const withPlan = createMockProject({ documents: [{ url: "/plan.png", purpose: "product_floor_plan" }] });
    render(<ResultCard project={withPlan} countryName="Polska" locale="pl" countryCode="DE" />);
    expect(screen.getByRole("link", { name: `Zobacz rzut projektu ${withPlan.name}` })).toHaveAttribute(
      "href",
      `/pl/project/${withPlan.id}?country=DE&zakladka=rzut`
    );
  });

  it("renders no compare checkbox when onToggleCompare is not provided (spec 0044 AC-4)", () => {
    render(<ResultCard project={project} countryName="Polska" locale="pl" onToggleSelect={vi.fn()} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("renders an independent compare checkbox alongside the inquiry checkbox (spec 0044 AC-4)", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const onToggleCompare = vi.fn();
    render(
      <ResultCard
        project={project}
        countryName="Polska"
        locale="pl"
        onToggleSelect={onToggleSelect}
        onToggleCompare={onToggleCompare}
      />
    );

    const compareCheckbox = screen.getByRole("checkbox", { name: `Porównaj ${project.name} z innymi domami` });
    await user.click(compareCheckbox);

    expect(onToggleCompare).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });
});
