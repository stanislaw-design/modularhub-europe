import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ProjectVariant } from "@/lib/data/types";
import { ProjectCostComparisonTable } from "./ProjectCostComparisonTable";

const variants: ProjectVariant[] = [
  {
    id: "v1",
    completionStandard: "surowy-zamkniety",
    priceMin: 138000,
    currency: "EUR",
    priceOnRequest: false,
    isDefault: false,
    costLineItems: [
      { id: "c1", label: "Fundament", status: "po-stronie-klienta" },
      { id: "c2", label: "Transport", status: "w-cenie" },
    ],
    timelineStages: [],
  },
  {
    id: "v2",
    completionStandard: "pod-klucz",
    priceMin: 207000,
    currency: "EUR",
    priceOnRequest: false,
    isDefault: true,
    costLineItems: [
      { id: "c3", label: "Transport", status: "w-cenie" },
      { id: "c4", label: "Wykończenie wnętrz", status: "obowiazkowa-doplata" },
    ],
    timelineStages: [],
  },
];

// Row/status text now renders twice (mobile cards below lg + the desktop
// table from lg up, see ProjectCostComparisonTable's `lg:hidden`/`hidden
// lg:block` split) — scoped to the desktop `<table>` so these assertions
// keep checking the same grouping/filtering logic without tripping over the
// mobile duplicate.
function table() {
  return within(screen.getByRole("table"));
}

describe("ProjectCostComparisonTable", () => {
  it("shows a single 'od X €' price per variant, never a range (spec 0042 AC-2, spec 0051 AC-1)", () => {
    render(<ProjectCostComparisonTable variants={variants} heading="Cena i zakres" />);
    expect(screen.getByText("od 138 000 €")).toBeInTheDocument();
    expect(screen.getByText("od 207 000 €")).toBeInTheDocument();
  });

  it("matches line items across variants by exact label, showing 'not included' where a variant has none", () => {
    render(<ProjectCostComparisonTable variants={variants} heading="Cena i zakres" />);
    expect(table().getAllByText("W cenie")).toHaveLength(2);
    expect(table().getByText("Po stronie klienta")).toBeInTheDocument();
    expect(table().getByText("Obowiązkowa dopłata")).toBeInTheDocument();
    expect(table().getAllByText("Nie dotyczy")).toHaveLength(2);
  });

  it("hides the 'show only differences' checkbox with a single variant (nothing to compare)", () => {
    render(<ProjectCostComparisonTable variants={[variants[0]]} heading="Cena i zakres" />);
    expect(screen.queryByRole("checkbox", { name: "Pokaż tylko różnice" })).not.toBeInTheDocument();
  });

  it("hides rows identical across every variant when 'show only differences' is checked", async () => {
    const user = userEvent.setup();
    render(<ProjectCostComparisonTable variants={variants} heading="Cena i zakres" />);

    // "Transport" is w-cenie in both variants, "Fundament"/"Wykończenie wnętrz" differ.
    expect(table().getByText("Transport")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Pokaż tylko różnice" }));

    expect(table().queryByText("Transport")).not.toBeInTheDocument();
    expect(table().getByText("Fundament")).toBeInTheDocument();
    expect(table().getByText("Wykończenie wnętrz")).toBeInTheDocument();
  });

  it("renders exactly one column per real variant, three real variants means three columns (spec 0054 AC-1, AC-2)", async () => {
    const user = userEvent.setup();
    const threeVariants: ProjectVariant[] = [
      ...variants,
      {
        id: "v3",
        completionStandard: "deweloperski",
        priceMin: 165000,
        currency: "EUR",
        priceOnRequest: false,
        isDefault: false,
        costLineItems: [{ id: "c5", label: "Transport", status: "w-cenie" }],
        timelineStages: [],
      },
    ];
    render(<ProjectCostComparisonTable variants={threeVariants} heading="Cena i zakres" />);

    expect(table().getAllByRole("columnheader")).toHaveLength(4); // 1 label column + 3 variant columns

    // "Transport" is w-cenie for all three real variants and must still hide
    // under "show only differences", never fake-different because of a
    // synthetic column (the placeholder concept no longer exists).
    await user.click(screen.getByRole("checkbox", { name: "Pokaż tylko różnice" }));
    expect(table().queryByText("Transport")).not.toBeInTheDocument();
  });

  it("previews only the first 10 rows and reveals the rest through the expand toggle", async () => {
    const user = userEvent.setup();
    const manyLabelVariants: ProjectVariant[] = [
      {
        ...variants[0],
        costLineItems: Array.from({ length: 12 }, (_, index) => ({
          id: `a${index}`,
          label: `Pozycja ${index + 1}`,
          status: "w-cenie" as const,
        })),
      },
      { ...variants[1], costLineItems: [] },
    ];
    render(<ProjectCostComparisonTable variants={manyLabelVariants} heading="Cena i zakres" />);

    expect(table().getByText("Pozycja 1")).toBeInTheDocument();
    expect(table().getByText("Pozycja 10")).toBeInTheDocument();
    expect(table().queryByText("Pozycja 11")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Pokaż więcej \(2\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(table().getByText("Pozycja 11")).toBeInTheDocument();
    expect(table().getByText("Pozycja 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pokaż mniej/ })).toBe(toggle);
  });

  it("shows no expand control when there are 10 or fewer rows", () => {
    render(<ProjectCostComparisonTable variants={variants} heading="Cena i zakres" />);
    expect(screen.queryByText(/Pokaż więcej/)).not.toBeInTheDocument();
  });
});
