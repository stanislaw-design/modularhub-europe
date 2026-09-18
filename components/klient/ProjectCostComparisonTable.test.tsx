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
    priceMax: 168000,
    currency: "EUR",
    scopeSummary: "Bryła zamknięta, bez instalacji.",
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
    priceMax: 220000,
    currency: "EUR",
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
  it("shows a price/scope column per variant (spec 0042 AC-2)", () => {
    render(<ProjectCostComparisonTable variants={variants} />);
    expect(screen.getByText("138 000–168 000 €")).toBeInTheDocument();
    expect(screen.getByText("207 000–220 000 €")).toBeInTheDocument();
    expect(screen.getByText("Bryła zamknięta, bez instalacji.")).toBeInTheDocument();
  });

  it("shows 'od X €' instead of a redundant X–X € range when priceMin equals priceMax", () => {
    const fixedPriceVariants: ProjectVariant[] = [
      { ...variants[0], priceMin: 83730, priceMax: 83730 },
      { ...variants[1], priceMin: 148138, priceMax: 148138 },
    ];
    render(<ProjectCostComparisonTable variants={fixedPriceVariants} />);
    expect(screen.getByText("od 83 730 €")).toBeInTheDocument();
    expect(screen.getByText("od 148 138 €")).toBeInTheDocument();
    expect(screen.queryByText(/83 730–83 730/)).not.toBeInTheDocument();
  });

  it("matches line items across variants by exact label, showing 'not included' where a variant has none", () => {
    render(<ProjectCostComparisonTable variants={variants} />);
    expect(table().getAllByText("W cenie")).toHaveLength(2);
    expect(table().getByText("Po stronie klienta")).toBeInTheDocument();
    expect(table().getByText("Obowiązkowa dopłata")).toBeInTheDocument();
    expect(table().getAllByText("Nie dotyczy")).toHaveLength(2);
  });

  it("hides rows identical across every variant when 'show only differences' is checked", async () => {
    const user = userEvent.setup();
    render(<ProjectCostComparisonTable variants={variants} />);

    // "Transport" is w-cenie in both variants, "Fundament"/"Wykończenie wnętrz" differ.
    expect(table().getByText("Transport")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Pokaż tylko różnice" }));

    expect(table().queryByText("Transport")).not.toBeInTheDocument();
    expect(table().getByText("Fundament")).toBeInTheDocument();
    expect(table().getByText("Wykończenie wnętrz")).toBeInTheDocument();
  });

  it("ignores the placeholder 'pod klucz' column (empty costLineItems) when deciding what counts as a difference", async () => {
    const user = userEvent.setup();
    const variantsWithPlaceholder: ProjectVariant[] = [
      ...variants,
      {
        id: "placeholder-deweloperski",
        completionStandard: "deweloperski",
        currency: "EUR",
        isDefault: false,
        costLineItems: [],
        timelineStages: [],
        isPlaceholder: true,
      },
    ];
    render(<ProjectCostComparisonTable variants={variantsWithPlaceholder} />);

    await user.click(screen.getByRole("checkbox", { name: "Pokaż tylko różnice" }));

    // "Transport" is identical between the two real variants; the placeholder's
    // always-null cell must not make it look like a difference (regression: it
    // used to make every row "different" and the checkbox effectively a no-op).
    expect(table().queryByText("Transport")).not.toBeInTheDocument();
    expect(table().getByText("Fundament")).toBeInTheDocument();
    expect(table().getByText("Wykończenie wnętrz")).toBeInTheDocument();
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
    render(<ProjectCostComparisonTable variants={manyLabelVariants} />);

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
    render(<ProjectCostComparisonTable variants={variants} />);
    expect(screen.queryByText(/Pokaż więcej/)).not.toBeInTheDocument();
  });
});
