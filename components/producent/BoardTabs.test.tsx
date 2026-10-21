import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoardTabs } from "./BoardTabs";

// Spec 0074 AC-9: dwa zwykłe linki, aktywny z aria-current, liczba tylko gdy większa od zera.
describe("BoardTabs", () => {
  const tabs = [
    { key: "board", label: "Dostępne ogłoszenia", href: "/pl/producer/panel/board", active: true, count: 3 },
    { key: "quotes", label: "Moje wyceny", href: "/pl/producer/panel/board-quotes", active: false, count: 0 },
  ];

  it("renders both tabs as links to their routes and marks the active one", () => {
    render(<BoardTabs ariaLabel="Tablica ogłoszeń" tabs={tabs} />);

    expect(screen.getByRole("link", { name: /Dostępne ogłoszenia/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Moje wyceny/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Moje wyceny/ }).getAttribute("href")).toBe("/pl/producer/panel/board-quotes");
  });

  it("shows a count only when it is above zero", () => {
    render(<BoardTabs ariaLabel="Tablica ogłoszeń" tabs={tabs} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
