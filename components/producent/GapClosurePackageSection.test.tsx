import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { isCountryResolved } from "@/lib/gap-closure";
import { GapClosurePackageSection } from "./GapClosurePackageSection";

const MAP_HREF = "/pl/producent/gotowosc-eksportowa";

beforeEach(() => {
  window.localStorage.clear();
});

describe("GapClosurePackageSection", () => {
  it("shows the plot analysis price and a 'Zapłać' button in the idle phase (AC-6)", () => {
    render(<GapClosurePackageSection countryCode="DE" mapHref={MAP_HREF} />);

    expect(screen.getByText("149 €")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeInTheDocument();
  });

  it(
    "moves idle → paying (aria-live) → result, shows Dopuszczone and marks the country resolved (AC-6, AC-7)",
    async () => {
      const user = userEvent.setup();
      render(<GapClosurePackageSection countryCode="DE" mapHref={MAP_HREF} />);

      await user.click(screen.getByRole("button", { name: "Zapłać" }));

      expect(screen.getByText("Przetwarzanie płatności…")).toBeInTheDocument();

      await screen.findByText("Dopuszczone", {}, { timeout: 3000 });
      expect(screen.getByRole("link", { name: /Wróć do mapy/ })).toHaveAttribute("href", MAP_HREF);
      expect(isCountryResolved("DE")).toBe(true);
    },
    5000
  );

  it("does not mark the country resolved before payment completes", async () => {
    const user = userEvent.setup();
    render(<GapClosurePackageSection countryCode="DE" mapHref={MAP_HREF} />);

    await user.click(screen.getByRole("button", { name: "Zapłać" }));

    expect(isCountryResolved("DE")).toBe(false);
  });
});
