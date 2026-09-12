import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyResults } from "./EmptyResults";

describe("EmptyResults", () => {
  it("shows an empty-state message and a clear-filters action instead of an empty grid (AC-10)", () => {
    render(<EmptyResults locale="pl" family="dom" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/brak domów/i);
    const action = screen.getByRole("link", { name: /wyczyść filtry/i });
    expect(action).toBeInTheDocument();
    expect(action).toHaveAttribute("href", "/pl/results");
  });

  // spec 0026 AC-11: the empty state must not say "domów" for the other two families.
  it("uses the spa-modulowe noun, not 'domów', and keeps family in the clear-filters link", () => {
    render(<EmptyResults locale="pl" family="spa-modulowe" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/brak spa modułowych/i);
    expect(screen.getByRole("link", { name: /wyczyść filtry/i })).toHaveAttribute(
      "href",
      "/pl/results?family=spa-modulowe"
    );
  });

  it("uses the pergola noun, not 'domów'", () => {
    render(<EmptyResults locale="pl" family="pergola" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/brak pergoli/i);
    expect(screen.getByRole("link", { name: /wyczyść filtry/i })).toHaveAttribute(
      "href",
      "/pl/results?family=pergola"
    );
  });

  // spec 0035 AC-8: the wiecej-niz-dom group sentinel needs its own
  // ProductFamilyNoun entry, or this throws a missing-message error at runtime.
  it("uses the wiecej-niz-dom noun and keeps the group in the clear-filters link", () => {
    render(<EmptyResults locale="pl" family="wiecej-niz-dom" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/brak produktów/i);
    expect(screen.getByRole("link", { name: /wyczyść filtry/i })).toHaveAttribute(
      "href",
      "/pl/results?family=wiecej-niz-dom"
    );
  });
});
