import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BulkOrdersShowcase } from "./BulkOrdersShowcase";

describe("BulkOrdersShowcase", () => {
  it("shows the section heading (AC-1)", async () => {
    render(await BulkOrdersShowcase({ locale: "pl" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Projekty inwestycyjne i produkcja seryjna" })
    ).toBeInTheDocument();
  });

  it("makes the whole investor tile a link to the locale-prefixed /verified-manufacturers page (AC-2)", async () => {
    render(await BulkOrdersShowcase({ locale: "en" }));

    expect(screen.getByRole("link", { name: /przeglądaj/i })).toHaveAttribute("href", "/en/verified-manufacturers");
  });

  it("makes the whole producer tile a link to the existing producer registration page, not a new screen (AC-3)", async () => {
    render(await BulkOrdersShowcase({ locale: "en" }));

    expect(screen.getByRole("link", { name: /dołącz jako producent b2b/i })).toHaveAttribute(
      "href",
      "/en/producer/registration"
    );
  });

  it("renders exactly two links, both keyboard reachable", async () => {
    render(await BulkOrdersShowcase({ locale: "pl" }));

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).not.toHaveAttribute("tabindex", "-1");
      expect(link).not.toHaveAttribute("inert");
    }
  });
});
