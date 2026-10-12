import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaunaFilterBar } from "./SaunaFilterBar";

const KORA = "2b6b6c2e-9e2a-4e3a-9a1a-2b7a6c5e4d3c";
const WDH = "3c7c7d3f-0f3b-4f4b-8b2b-3c8b7d6f5e4d";
const producers = [
  { id: KORA, name: "Kora", count: 5 },
  { id: WDH, name: "Wooden Dream House", count: 8 },
];

async function renderBar(filter = {}, options = producers) {
  render(await SaunaFilterBar({ locale: "pl", filter, producers: options }));
}

describe("SaunaFilterBar (spec 0068)", () => {
  it("renders real links for every seating threshold, none active by default (AC-7)", async () => {
    await renderBar();

    for (const count of [2, 4, 6, 8]) {
      const link = screen.getByRole("link", { name: `${count}+ miejsc` });
      expect(link).toHaveAttribute("href", `/pl/sauna?seatingMin=${count}`);
      expect(link).not.toHaveAttribute("aria-current");
    }
    expect(screen.queryByRole("link", { name: "Wyczyść filtry" })).not.toBeInTheDocument();
  });

  it("marks the active chip with aria-current and links it back to a cleared dimension (AC-7, AC-10)", async () => {
    await renderBar({ seatingMin: 4, producer: KORA });

    const active = screen.getByRole("link", { name: "4+ miejsc" });
    expect(active).toHaveAttribute("aria-current", "true");
    // Ponowne kliknięcie czyści ten wymiar, producent zostaje.
    expect(active).toHaveAttribute("href", `/pl/sauna?producer=${KORA}`);
    // Inny chip miejsc zachowuje producenta.
    expect(screen.getByRole("link", { name: "6+ miejsc" })).toHaveAttribute(
      "href",
      `/pl/sauna?seatingMin=6&producer=${KORA}`,
    );
  });

  it("builds price chips from the threshold scale with open ends (AC-8)", async () => {
    await renderBar();

    expect(screen.getByRole("link", { name: "do 5000 €" })).toHaveAttribute("href", "/pl/sauna?priceMax=5000");
    expect(screen.getByRole("link", { name: /^5000 do 10\s000 €$/ })).toHaveAttribute(
      "href",
      "/pl/sauna?priceMin=5000&priceMax=10000",
    );
    expect(screen.getByRole("link", { name: /^od 25\s000 €$/ })).toHaveAttribute("href", "/pl/sauna?priceMin=25000");
  });

  it("activates a price chip only when both bounds match, and clears both on a second click (AC-8)", async () => {
    await renderBar({ priceMin: 5000, priceMax: 10000 });

    const active = screen.getByRole("link", { name: /^5000 do 10\s000 €$/ });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(active).toHaveAttribute("href", "/pl/sauna");
    expect(screen.getByRole("link", { name: "do 5000 €" })).not.toHaveAttribute("aria-current");
  });

  it("renders one chip per producer and toggles it (AC-9)", async () => {
    await renderBar({ producer: WDH });

    expect(screen.getByRole("link", { name: "Kora" })).toHaveAttribute("href", `/pl/sauna?producer=${KORA}`);
    const active = screen.getByRole("link", { name: "Wooden Dream House" });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(active).toHaveAttribute("href", "/pl/sauna");
  });

  it("hides the producer group when no producer has a published sauna (AC-9)", async () => {
    await renderBar({}, []);

    expect(screen.queryByText("Producent")).not.toBeInTheDocument();
  });

  it("offers sorting and a clear link that drops every filter (AC-10)", async () => {
    await renderBar({ seatingMin: 2, sort: "price-desc" });

    expect(screen.getByRole("link", { name: "Cena malejąco" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Cena rosnąco" })).toHaveAttribute(
      "href",
      "/pl/sauna?seatingMin=2&sort=price-asc",
    );
    expect(screen.getByRole("link", { name: "Wyczyść filtry" })).toHaveAttribute("href", "/pl/sauna");
  });
});
