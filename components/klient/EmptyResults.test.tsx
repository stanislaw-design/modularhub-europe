import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyResults } from "./EmptyResults";

describe("EmptyResults", () => {
  it("shows an empty-state message and a clear-filters action instead of an empty grid (AC-10)", () => {
    render(<EmptyResults locale="pl" />);
    expect(screen.getByRole("heading")).toHaveTextContent(/brak domów/i);
    const action = screen.getByRole("link", { name: /wyczyść filtry/i });
    expect(action).toBeInTheDocument();
    expect(action).toHaveAttribute("href", "/pl/klient/wyniki");
  });
});
