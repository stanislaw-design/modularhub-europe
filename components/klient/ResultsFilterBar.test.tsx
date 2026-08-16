import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
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

describe("ResultsFilterBar", () => {
  it("pre-fills fields from the current URL values (AC-11)", () => {
    render(<ResultsFilterBar locale="pl" countries={countries} countryCode="DE" sizeMin={50} sizeMax={100} />);
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
    expect(screen.getByText("50 m²")).toBeInTheDocument();
    expect(screen.getByText("100 m²")).toBeInTheDocument();
  });

  it("navigates to the results URL with the selected params when Szukaj is clicked (AC-11)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} countryCode="DE" sizeMin={50} sizeMax={100} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?country=DE&sizeMin=50&sizeMax=100");
  });

  it("navigates to the bare results URL when no filter is selected (AC-11)", async () => {
    const user = userEvent.setup();
    render(<ResultsFilterBar locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki");
  });
});
