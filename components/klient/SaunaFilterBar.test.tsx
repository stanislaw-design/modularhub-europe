import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaunaFilterBar } from "./SaunaFilterBar";

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

const KORA = "2b6b6c2e-9e2a-4e3a-9a1a-2b7a6c5e4d3c";
const WDH = "3c7c7d3f-0f3b-4f4b-8b2b-3c8b7d6f5e4d";
const producers = [
  { id: KORA, name: "Kora", count: 5 },
  { id: WDH, name: "Wooden Dream House", count: 8 },
];

async function renderBar(filter = {}, options = producers) {
  render(await SaunaFilterBar({ locale: "pl", filter, producers: options }));
}

async function pick(listLabel: string, optionName: string | RegExp) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: new RegExp(listLabel) }));
  await user.click(screen.getByRole("option", { name: optionName }));
}

describe("SaunaFilterBar (spec 0068)", () => {
  beforeEach(() => push.mockClear());

  it("renders one dropdown per dimension, showing 'Wszystkie' by default (AC-7)", async () => {
    await renderBar();

    for (const label of ["Liczba miejsc", "Cena od", "Producent"]) {
      expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveTextContent("Wszystkie");
    }
    expect(screen.getByRole("button", { name: /Sortuj/ })).toHaveTextContent("Domyślnie");
    expect(screen.queryByRole("link", { name: "Wyczyść filtry" })).not.toBeInTheDocument();
  });

  it("shows the active value and keeps the rest of the filter when another is picked (AC-7)", async () => {
    await renderBar({ seatingMin: 4, producer: KORA });

    expect(screen.getByRole("button", { name: /Liczba miejsc/ })).toHaveTextContent("4+ miejsc");
    expect(screen.getByRole("button", { name: /Producent/ })).toHaveTextContent("Kora");

    await pick("Liczba miejsc", "6+ miejsc");
    expect(push).toHaveBeenCalledWith(`/pl/sauna?seatingMin=6&producer=${KORA}`, { scroll: false });
  });

  it("clears only its own dimension with 'Wszystkie' (AC-10)", async () => {
    await renderBar({ seatingMin: 4, producer: KORA });

    await pick("Liczba miejsc", "Wszystkie");
    expect(push).toHaveBeenCalledWith(`/pl/sauna?producer=${KORA}`, { scroll: false });
  });

  it("builds price options from the threshold scale with open ends (AC-8)", async () => {
    await renderBar();

    await pick("Cena od", "do 5000 €");
    expect(push).toHaveBeenLastCalledWith("/pl/sauna?priceMax=5000", { scroll: false });

    await pick("Cena od", /^5000 do 10\s000 €$/);
    expect(push).toHaveBeenLastCalledWith("/pl/sauna?priceMin=5000&priceMax=10000", { scroll: false });

    await pick("Cena od", /^od 25\s000 €$/);
    expect(push).toHaveBeenLastCalledWith("/pl/sauna?priceMin=25000", { scroll: false });
  });

  it("marks a price range active only when both bounds match (AC-8)", async () => {
    await renderBar({ priceMin: 5000, priceMax: 10000 });

    expect(screen.getByRole("button", { name: /Cena od/ })).toHaveTextContent(/5000 do 10\s000 €/);
  });

  it("lists every producer and navigates on pick (AC-9)", async () => {
    await renderBar({ producer: WDH });

    expect(screen.getByRole("button", { name: /Producent/ })).toHaveTextContent("Wooden Dream House");
    await pick("Producent", "Kora");
    expect(push).toHaveBeenCalledWith(`/pl/sauna?producer=${KORA}`, { scroll: false });
  });

  it("hides the producer dropdown when no producer has a published sauna (AC-9)", async () => {
    await renderBar({}, []);

    expect(screen.queryByText("Producent")).not.toBeInTheDocument();
  });

  it("offers sorting and a clear link that drops every filter (AC-10)", async () => {
    await renderBar({ seatingMin: 2, sort: "price-desc" });

    expect(screen.getByRole("button", { name: /Sortuj/ })).toHaveTextContent("Cena malejąco");
    await pick("Sortuj", "Cena rosnąco");
    expect(push).toHaveBeenCalledWith("/pl/sauna?seatingMin=2&sort=price-asc", { scroll: false });
    expect(screen.getByRole("link", { name: "Wyczyść filtry" })).toHaveAttribute("href", "/pl/sauna");
  });
});
