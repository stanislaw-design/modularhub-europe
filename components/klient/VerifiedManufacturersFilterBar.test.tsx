import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import type { VerifiedManufacturersFilter } from "@/lib/verified-manufacturers-filters";
import { VerifiedManufacturersFilterBar } from "./VerifiedManufacturersFilterBar";

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

const baseFilter: VerifiedManufacturersFilter = {};

describe("VerifiedManufacturersFilterBar", () => {
  it("pre-fills fields from the current URL values (AC-19)", () => {
    render(
      <VerifiedManufacturersFilterBar
        locale="pl"
        countries={countries}
        filter={{ countryCode: "DE", sizeMin: 50, sizeMax: 100 }}
      />
    );
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
    expect(screen.getByText("50 m²")).toBeInTheDocument();
    expect(screen.getByText("100 m²")).toBeInTheDocument();
  });

  it("navigates with the selected country/size params when Szukaj is clicked (AC-19, AC-20, AC-21)", async () => {
    const user = userEvent.setup();
    render(
      <VerifiedManufacturersFilterBar
        locale="pl"
        countries={countries}
        filter={{ countryCode: "DE", sizeMin: 50, sizeMax: 100 }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(push).toHaveBeenCalledWith("/pl/verified-manufacturers?country=DE&sizeMin=50&sizeMax=100");
  });

  it("navigates to the bare href when no filter is selected", async () => {
    const user = userEvent.setup();
    render(<VerifiedManufacturersFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(push).toHaveBeenCalledWith("/pl/verified-manufacturers");
  });

  it("includes a typed keyword in the URL when Szukaj is clicked (AC-19, AC-22)", async () => {
    const user = userEvent.setup();
    render(<VerifiedManufacturersFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "Budman");
    await user.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(push).toHaveBeenCalledWith("/pl/verified-manufacturers?q=Budman");
  });

  it("drops a whitespace-only keyword instead of adding an empty q param", async () => {
    const user = userEvent.setup();
    render(<VerifiedManufacturersFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "   ");
    await user.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(push).toHaveBeenCalledWith("/pl/verified-manufacturers");
  });

  it("navigates when Enter is pressed in the keyword field", async () => {
    const user = userEvent.setup();
    render(<VerifiedManufacturersFilterBar locale="pl" countries={countries} filter={baseFilter} />);

    await user.type(screen.getByLabelText("Słowo kluczowe"), "Budman{Enter}");

    expect(push).toHaveBeenCalledWith("/pl/verified-manufacturers?q=Budman");
  });
});
