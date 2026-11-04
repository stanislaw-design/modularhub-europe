import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile, computeDelta } from "./StatTile";

describe("computeDelta", () => {
  it("rounds the change against the previous period", () => {
    expect(computeDelta(118, 100)).toEqual({ direction: "up", percent: 18 });
    expect(computeDelta(80, 100)).toEqual({ direction: "down", percent: -20 });
    expect(computeDelta(100, 100)).toEqual({ direction: "flat", percent: 0 });
  });

  it("does not invent a percentage when the previous period was zero", () => {
    expect(computeDelta(5, 0)).toEqual({ direction: "none", percent: null });
  });
});

describe("StatTile", () => {
  const base = { label: "Unikalni odwiedzający", value: "120", comparedTo: "poprzednie 30 dni", hint: "Ile różnych osób weszło na portal." };

  it("shows a green signed delta with the period it refers to", () => {
    render(<StatTile {...base} delta={computeDelta(118, 100)} />);

    expect(screen.getByText("Unikalni odwiedzający")).toBeInTheDocument();
    expect(screen.getByText(/\+18%/).parentElement).toHaveClass("text-emerald-700");
    expect(screen.getByText("vs poprzednie 30 dni")).toBeInTheDocument();
    expect(screen.getByText("Ile różnych osób weszło na portal.")).toBeInTheDocument();
  });

  it("shows a red negative delta", () => {
    render(<StatTile {...base} delta={computeDelta(80, 100)} />);

    expect(screen.getByText(/-20%/).parentElement).toHaveClass("text-red-700");
  });

  it("says there is nothing to compare instead of a percentage", () => {
    render(<StatTile {...base} delta={computeDelta(5, 0)} />);

    expect(screen.getByText("brak danych do porównania")).toBeInTheDocument();
    expect(screen.queryByText(/vs poprzednie/)).toBeNull();
  });
});
