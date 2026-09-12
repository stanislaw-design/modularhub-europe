import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import type { ResultsFilter } from "@/lib/results-filters";
import { ResultsFilterBar } from "./ResultsFilterBar";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
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

// The desktop/tablet inline row (visible on the first frame, no dialog
// needed) and the "Filtruj" bottom sheet render the same fields twice —
// jsdom doesn't apply the `hidden`/`sm:flex` breakpoint classes that keep
// only one on screen at a time, so most tests here exercise the inline row
// (present whenever the dialog is closed, the default) and only the
// dedicated sheet test below opens the dialog, scoping its queries with
// `within` since both copies exist in the DOM at once once it's open.
describe("ResultsFilterBar", () => {
  it("pre-fills fields from the current URL values (AC-11)", () => {
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, countryCode: "DE", sizeMin: 50, sizeMax: 100 }}
        mobileFilters={null}
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
        mobileFilters={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?country=DE&sizeMin=50&sizeMax=100");
  });

  it("navigates to the bare results URL when no filter is selected (AC-11)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} mobileFilters={null} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results");
  });

  it("preserves an active attribute filter (set by a chip, not this bar) when Szukaj is clicked (spec 0026 AC-10)", async () => {
    const user = userEvent.setup();
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, heatSource: "pompa-ciepla" }}
        mobileFilters={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?heatSource=pompa-ciepla");
  });

  it("includes a typed keyword in the URL when Szukaj is clicked (spec 0026 AC-9)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} mobileFilters={null} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "Baltyk");
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?q=Baltyk");
  });

  it("drops a whitespace-only keyword instead of adding an empty q param (spec 0026 AC-6)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} mobileFilters={null} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "   ");
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results");
  });

  it("includes the chosen sort option in the URL when Szukaj is clicked (spec 0026 AC-5)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} filter={baseFilter} mobileFilters={null} />);

    await user.click(screen.getByRole("button", { name: "Sortowanie wyników" }));
    await user.click(screen.getByRole("option", { name: "Cena: malejąco" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?sort=price-desc");
  });

  it("pre-fills the sort segment from the current URL value (AC-11)", () => {
    render(
      <ResultsFilterBar locale="pl" countries={countries} filter={{ ...baseFilter, sort: "size-asc" }} mobileFilters={null} />
    );
    expect(screen.getByText("Metraż: rosnąco")).toBeInTheDocument();
  });

  it("shows a badge with the count of staged filters on the Filtruj trigger pill", () => {
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, countryCode: "DE", sizeMin: 50 }}
        mobileFilters={null}
      />
    );
    expect(screen.getByRole("button", { name: /filtruj/i })).toHaveTextContent("2");
  });

  it("navigates when Pokaż wyniki is clicked in the Filtruj bottom sheet, same fields as the inline row (AC-11)", async () => {
    const user = userEvent.setup();
    render(
      <ResultsFilterBar
        locale="pl"
        countries={countries}
        filter={{ ...baseFilter, countryCode: "DE" }}
        mobileFilters={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /filtruj/i }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Niemcy")).toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: /pokaż wyniki/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?country=DE");
  });
});
