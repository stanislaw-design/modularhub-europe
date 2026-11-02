import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsHeader } from "./ResultsHeader";

describe("ResultsHeader", () => {
  it("shows the family title and the model count in the heading, like the sauna page", () => {
    render(<ResultsHeader locale="pl" count={231} family="dom" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Domy:");
    expect(heading).toHaveTextContent("231 modeli");
  });

  it("renders a breadcrumb: home link, separator and the current family", () => {
    render(<ResultsHeader locale="pl" count={5} family="dom" />);
    const nav = screen.getByRole("navigation", { name: "Ścieżka nawigacji" });
    expect(within(nav).getByRole("link", { name: "Strona główna" })).toHaveAttribute("href", "/pl");
    expect(within(nav).getByText("Domy")).toHaveAttribute("aria-current", "page");
  });

  it("states the country below the heading, not in it, when countryCode is present (spec 0004)", () => {
    render(<ResultsHeader locale="pl" count={12} family="dom" countryCode="DE" />);
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("Niemczech");
    expect(screen.getByText("Dopuszczone prawnie w Niemczech")).toBeInTheDocument();
  });

  it("shows the hint when countryCode is absent and no country line", () => {
    render(<ResultsHeader locale="pl" count={6} family="dom" />);
    expect(screen.getByText(/wybierz kraj/i)).toBeInTheDocument();
    expect(screen.queryByText(/^dopuszczone prawnie/i)).not.toBeInTheDocument();
  });

  it("does not show the hint when countryCode is present", () => {
    render(<ResultsHeader locale="pl" count={6} family="dom" countryCode="PL" />);
    expect(screen.queryByText(/wybierz kraj/i)).not.toBeInTheDocument();
  });

  // Regression: the heading and hint used to say "dom"/"domy" regardless of the
  // active family switch (spec 0023 AC-4, found by /check verify on 2026-09-04).
  describe("family switch (spec 0023 AC-4)", () => {
    it.each([
      ["spa-modulowe", "Sauny"],
      ["kontenery-modulowe", "Kontenery"],
      ["outdoor-tv", "Outdoor TV"],
      ["wiecej-niz-dom", "Więcej niż dom"],
    ] as const)("uses the %s tab label as the title", (family, title) => {
      render(<ResultsHeader locale="pl" count={2} family={family} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    });

    it("uses the spa-modulowe noun in the hint, not 'domy'", () => {
      render(<ResultsHeader locale="pl" count={1} family="spa-modulowe" />);
      expect(screen.getByText(/wybierz kraj/i)).toHaveTextContent("spa modułowe");
      expect(screen.getByText(/wybierz kraj/i)).not.toHaveTextContent("domy");
    });

    it("uses the kontenery-modulowe noun in the hint, not 'domy'", () => {
      render(<ResultsHeader locale="pl" count={1} family="kontenery-modulowe" />);
      expect(screen.getByText(/wybierz kraj/i)).toHaveTextContent("kontenery modułowe");
      expect(screen.getByText(/wybierz kraj/i)).not.toHaveTextContent("domy");
    });

    it("shows the outdoor TV hint instead of the country hint", () => {
      render(<ResultsHeader locale="pl" count={2} family="outdoor-tv" />);
      expect(screen.getByText(/sposobu montażu/i)).toBeInTheDocument();
    });
  });
});
