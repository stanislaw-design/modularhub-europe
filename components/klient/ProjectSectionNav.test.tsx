import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSectionNav } from "./ProjectSectionNav";

describe("ProjectSectionNav", () => {
  it("renders an anchor link per enabled item, pointing at its section id", () => {
    render(
      <ProjectSectionNav
        items={[
          { id: "uklad", label: "Układ domu" },
          { id: "cena", label: "Cena i zakres" },
        ]}
        ariaLabel="Nawigacja po sekcjach strony"
        scrollLeftLabel="Przewiń w lewo"
        scrollRightLabel="Przewiń w prawo"
      />,
    );

    const link = screen.getByRole("link", { name: "Układ domu" });
    expect(link).toHaveAttribute("href", "#uklad");
    expect(screen.getByRole("link", { name: "Cena i zakres" })).toHaveAttribute("href", "#cena");
  });

  it("renders an item without a matching section as a disabled, non-navigable tab", () => {
    render(
      <ProjectSectionNav
        items={[
          { id: "uklad", label: "Układ domu" },
          { id: "podobne", label: "Podobne domy", disabled: true },
        ]}
        ariaLabel="Nawigacja po sekcjach strony"
        scrollLeftLabel="Przewiń w lewo"
        scrollRightLabel="Przewiń w prawo"
      />,
    );

    expect(screen.queryByRole("link", { name: "Podobne domy" })).not.toBeInTheDocument();
    const disabledItem = screen.getByText("Podobne domy");
    expect(disabledItem).toHaveAttribute("aria-disabled", "true");
    expect(disabledItem.tagName).not.toBe("A");
  });

  it("renders scroll arrow buttons out of the tab order when there is nothing to scroll", () => {
    render(
      <ProjectSectionNav
        items={[{ id: "uklad", label: "Układ domu" }]}
        ariaLabel="Nawigacja po sekcjach strony"
        scrollLeftLabel="Przewiń w lewo"
        scrollRightLabel="Przewiń w prawo"
      />,
    );

    // jsdom reports zero scrollWidth/clientWidth, so neither direction has
    // anything to scroll to yet — both arrows stay present (stable layout)
    // but are visually hidden and removed from the tab order.
    expect(screen.getByRole("button", { name: "Przewiń w lewo" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("button", { name: "Przewiń w prawo" })).toHaveAttribute("tabIndex", "-1");
  });
});
