import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { ProjectCompareTable, type CompareTableColumn } from "./ProjectCompareTable";

function makeColumn(id: string, overrides: Parameters<typeof createMockProject>[0] = {}): CompareTableColumn {
  const project = createMockProject({ id, name: `Dom ${id}`, ...overrides });
  const selectedVariant = project.variants.find((v) => v.isDefault) ?? project.variants[0];
  return { id, project, selectedVariant, variantLinks: [] };
}

describe("ProjectCompareTable", () => {
  it("renders a column per product with its price, scope and floor-plan state (spec 0044 AC-6, AC-7)", () => {
    render(
      <ProjectCompareTable
        locale="pl"
        columns={[makeColumn("a"), makeColumn("b")]}
        hasUnavailable={false}
        resultsHref="/pl/results"
      />
    );

    expect(screen.getAllByText("od 118 000 €")).toHaveLength(2);
    expect(screen.getAllByText("Dom w standardzie deweloperskim, gotowy do wykończenia.")).toHaveLength(2);
    expect(screen.getAllByText("Brak rzutu")).toHaveLength(2);
  });

  it("shows an unavailable column with a hint instead of project data (spec 0044 AC-10)", () => {
    render(
      <ProjectCompareTable
        locale="pl"
        columns={[makeColumn("a"), { id: "b", project: null, selectedVariant: undefined, variantLinks: [] }]}
        hasUnavailable
        resultsHref="/pl/results"
      />
    );

    expect(screen.getByText("Niedostępny")).toBeInTheDocument();
    expect(
      screen.getByText("Ten dom został usunięty lub nie jest już publicznie dostępny.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Nie podano").length).toBeGreaterThan(0);
  });

  it("shows priceOnRequest for a column whose selected variant has no priceMin", () => {
    render(
      <ProjectCompareTable
        locale="pl"
        columns={[
          makeColumn("a", { variants: [{ ...createMockProject().variants[0], priceMin: undefined }] }),
          makeColumn("b"),
        ]}
        hasUnavailable={false}
        resultsHref="/pl/results"
      />
    );

    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
  });

  it("renders the variant picker with the selected standard marked current (spec 0044 AC-6)", () => {
    render(
      <ProjectCompareTable
        locale="pl"
        columns={[
          {
            ...makeColumn("a"),
            variantLinks: [
              { standard: "deweloperski", href: "/pl/compare?products=a,b&v_a=deweloperski", isSelected: true },
              { standard: "pod-klucz", href: "/pl/compare?products=a,b&v_a=pod-klucz", isSelected: false },
            ],
          },
          makeColumn("b"),
        ]}
        hasUnavailable={false}
        resultsHref="/pl/results"
      />
    );

    const current = screen.getByRole("link", { name: "Standard deweloperski" });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Pod klucz" })).toHaveAttribute(
      "href",
      "/pl/compare?products=a,b&v_a=pod-klucz"
    );
  });

  it("hides only rows where every available column agrees, keeping rows with any difference or missing data (spec 0044 AC-9)", async () => {
    const user = userEvent.setup();
    render(
      <ProjectCompareTable
        locale="pl"
        columns={[makeColumn("a", { bedrooms: 3 }), makeColumn("b", { bedrooms: 5 })]}
        hasUnavailable={false}
        resultsHref="/pl/results"
      />
    );

    // Storeys are equal (1) on both mock projects by default: hidden once "only differences" is on.
    expect(screen.getByText("Kondygnacje")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Pokaż tylko różnice" }));

    expect(screen.queryByText("Kondygnacje")).not.toBeInTheDocument();
    expect(screen.getByText("Sypialnie")).toBeInTheDocument();
  });
});
