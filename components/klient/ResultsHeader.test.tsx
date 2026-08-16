import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsHeader } from "./ResultsHeader";

describe("ResultsHeader", () => {
  it("uses singular form for exactly 1 result (AC-9)", () => {
    render(<ResultsHeader count={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 dom");
  });

  it.each([2, 3, 4])("uses the 2-4 plural form for %i results (AC-9)", (count) => {
    render(<ResultsHeader count={count} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} domy`);
  });

  it.each([5, 12, 21])(
    "uses the 5+ plural form for %i results, including the 11-14 exception (AC-9)",
    (count) => {
      render(<ResultsHeader count={count} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(`${count} domów`);
    }
  );

  it("names the country in the heading when countryCode is present (AC-9)", () => {
    render(<ResultsHeader count={12} countryCode="DE" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("dopuszczonych w Niemczech");
  });

  it("does not mention a country and shows a hint when countryCode is absent (AC-9)", () => {
    render(<ResultsHeader count={6} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveTextContent("dopuszczonych");
    expect(screen.getByText(/wybierz kraj/i)).toBeInTheDocument();
  });

  it("does not show the hint when countryCode is present", () => {
    render(<ResultsHeader count={6} countryCode="PL" />);
    expect(screen.queryByText(/wybierz kraj/i)).not.toBeInTheDocument();
  });
});
