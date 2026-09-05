import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import type { ResultsFilter } from "@/lib/results-filters";
import { ResultsFilterBar } from "./ResultsFilterBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockClear();
});

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

const baseFilter: ResultsFilter = { family: "dom" };

describe("ResultsFilterBar", () => {
  it("pre-fills fields from the current URL values (AC-11)", () => {
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, countryCode: "DE", sizeMin: 50, sizeMax: 100 }}
      />
    );
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
    expect(screen.getByText("50 m²")).toBeInTheDocument();
    expect(screen.getByText("100 m²")).toBeInTheDocument();
  });

  it("navigates to the results URL with the selected params when Szukaj is clicked (AC-11)", async () => {
    const user = userEvent.setup();
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, countryCode: "DE", sizeMin: 50, sizeMax: 100 }}
      />
    );

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?country=DE&sizeMin=50&sizeMax=100");
  });

  it("navigates to the bare results URL when no filter is selected (AC-11)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki");
  });

  it("preserves an active attribute filter (set by a chip, not this bar) when Szukaj is clicked (spec 0026 AC-10)", async () => {
    const user = userEvent.setup();
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, heatSource: "pompa-ciepla" }}
      />
    );

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?heatSource=pompa-ciepla");
  });

  it("includes a typed keyword in the URL when Szukaj is clicked (spec 0026 AC-9)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "Baltyk");
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?q=Baltyk");
  });

  it("drops a whitespace-only keyword instead of adding an empty q param (spec 0026 AC-6)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "   ");
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki");
  });

  it("includes the chosen sort option in the URL when Szukaj is clicked (spec 0026 AC-5)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.click(screen.getByRole("button", { name: "Sortowanie wyników" }));
    await user.click(screen.getByRole("option", { name: "Cena: malejąco" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?sort=price-desc");
  });

  it("pre-fills the sort segment from the current URL value (AC-11)", () => {
    render(<ResultsFilterBar locale="pl" countries={countries} filter={{ ...baseFilter, sort: "size-asc" }} />);
    expect(screen.getByText("Metraż: rosnąco")).toBeInTheDocument();
  });
});
