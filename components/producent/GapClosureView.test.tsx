import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { GapClosureView } from "./GapClosureView";

const MAP_HREF = "/pl/producent/gotowosc-eksportowa";

beforeEach(() => {
  window.localStorage.clear();
});

describe("GapClosureView", () => {
  it("shows the country name, one h1, the disclaimer, and both sections when unresolved (AC-2)", () => {
    render(
      <GapClosureView countryCode="DE" countryName="Niemcy" projectName={null} mapHref={MAP_HREF} />
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Niemcy");
    expect(
      screen.getByText(/To nie jest opinia prawna/)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wgraj dokumenty samodzielnie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kup pakiet domknięcia luk" })).toBeInTheDocument();
  });

  it("includes the project name in the heading when given (AC-2)", () => {
    render(
      <GapClosureView countryCode="DE" countryName="Niemcy" projectName="Modulor 28" mapHref={MAP_HREF} />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Modulor 28");
  });

  it("shows a short info message with a link back instead of the two sections when already resolved (AC-9)", () => {
    window.localStorage.setItem("producent:domykanie-luk:rozwiazane", JSON.stringify(["DE"]));

    render(
      <GapClosureView countryCode="DE" countryName="Niemcy" projectName={null} mapHref={MAP_HREF} />
    );

    expect(screen.queryByRole("heading", { name: "Wgraj dokumenty samodzielnie" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Kup pakiet domknięcia luk" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wróć do mapy/ })).toHaveAttribute("href", MAP_HREF);
  });
});
