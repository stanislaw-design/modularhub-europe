import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsHeader } from "./ResultsHeader";

describe("ResultsHeader", () => {
  it("uses singular form for exactly 1 result (AC-9)", () => {
    render(<ResultsHeader count={1} family="dom" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 dom");
  });

  it.each([2, 3, 4])("uses the 2-4 plural form for %i results (AC-9)", (count) => {
    render(<ResultsHeader count={count} family="dom" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} domy`);
  });

  it.each([5, 12, 21])(
    "uses the 5+ plural form for %i results, including the 11-14 exception (AC-9)",
    (count) => {
      render(<ResultsHeader count={count} family="dom" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} domów`);
    }
  );

  it("names the country in the heading when countryCode is present (AC-9)", () => {
    render(<ResultsHeader count={12} family="dom" countryCode="DE" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("dopuszczonych w Niemczech");
  });

  it("does not mention a country and shows a hint when countryCode is absent (AC-9)", () => {
    render(<ResultsHeader count={6} family="dom" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveTextContent("dopuszczonych");
    expect(screen.getByText(/wybierz kraj/i)).toBeInTheDocument();
  });

  it("does not show the hint when countryCode is present", () => {
    render(<ResultsHeader count={6} family="dom" countryCode="PL" />);
    expect(screen.queryByText(/wybierz kraj/i)).not.toBeInTheDocument();
  });

  // Regression: the heading and hint used to say "dom"/"domy" regardless of the
  // active family switch (spec 0023 AC-4, found by /check verify on 2026-09-04).
  describe("family switch (spec 0023 AC-4)", () => {
    it("uses the spa-modulowe noun (invariant across counts) in the heading", () => {
      render(<ResultsHeader count={1} family="spa-modulowe" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 spa modułowe");
    });

    it("uses the spa-modulowe noun in the hint, not 'domy'", () => {
      render(<ResultsHeader count={1} family="spa-modulowe" />);
      expect(screen.getByText(/wybierz kraj/i)).toHaveTextContent("spa modułowe");
      expect(screen.getByText(/wybierz kraj/i)).not.toHaveTextContent("domy");
    });

    it("uses the pergola noun forms by count in the heading", () => {
      render(<ResultsHeader count={1} family="pergola" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 pergola");
    });

    it.each([2, 3, 4])("uses the pergola 2-4 plural form for %i results", (count) => {
      render(<ResultsHeader count={count} family="pergola" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} pergole`);
    });

    it.each([5, 12])("uses the pergola 5+ plural form for %i results", (count) => {
      render(<ResultsHeader count={count} family="pergola" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} pergoli`);
    });

    it("uses the pergola noun in the hint, not 'domy'", () => {
      render(<ResultsHeader count={1} family="pergola" />);
      expect(screen.getByText(/wybierz kraj/i)).toHaveTextContent("pergole");
      expect(screen.getByText(/wybierz kraj/i)).not.toHaveTextContent("domy");
    });

    // spec 0035 AC-8: the wiecej-niz-dom group sentinel needs its own
    // ProductFamilyNoun entry, or this throws a missing-message error at runtime.
    it("uses the wiecej-niz-dom noun for the combined group value", () => {
      render(<ResultsHeader count={2} family="wiecej-niz-dom" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2 produkty");
    });
  });
});
