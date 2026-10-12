import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { SaunaCompareTable, type SaunaCompareColumn } from "./SaunaCompareTable";

const baseSpecs = {
  claddingMaterial: "Świerk",
  interiorWoodType: "Olcha",
  benchMaterial: "Abachi",
  insulationType: "Wełna",
  glazingType: "Szkło",
  seatingCapacity: 6,
  hasChangingArea: true,
  changingAreaDescription: "Przy wejściu",
  electricalRequirement: "400 V",
};

function sauna(id: string, overrides: Parameters<typeof createMockProject>[0] = {}) {
  return createMockProject({
    id,
    name: `Sauna ${id}`,
    slug: `slug-${id}`,
    family: "spa-modulowe",
    spaSubcategory: "sauna",
    producerName: "Kora",
    priceMin: 12345,
    priceOnRequest: false,
    saunaTechnicalSpecs: baseSpecs,
    ...overrides,
  });
}

function renderTable(columns: SaunaCompareColumn[], hasUnavailable = false) {
  return render(<SaunaCompareTable locale="pl" columns={columns} hasUnavailable={hasUnavailable} listHref="/pl/sauna" />);
}

function rowByLabel(label: string) {
  return screen.getByRole("rowheader", { name: label }).closest("tr") as HTMLElement;
}

describe("SaunaCompareTable (spec 0068 AC-13)", () => {
  it("renders the eleven rows in spec order with one h1", () => {
    renderTable([
      { id: "a", project: sauna("a") },
      { id: "b", project: sauna("b") },
    ]);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const labels = screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(labels).toEqual([
      "Model",
      "Producent",
      "Cena od",
      "Liczba miejsc",
      "Drewno wnętrza",
      "Okładzina",
      "Materiał ławek",
      "Izolacja",
      "Przeszklenie",
      "Przebieralnia",
      "Wymagania elektryczne",
    ]);
  });

  it("links the model to /sauna/[slug] and shows spec values per column", () => {
    renderTable([
      { id: "a", project: sauna("a") },
      { id: "b", project: sauna("b", { saunaTechnicalSpecs: { ...baseSpecs, seatingCapacity: 2 } }) },
    ]);

    expect(screen.getByRole("link", { name: "Sauna a" })).toHaveAttribute("href", "/pl/sauna/slug-a");
    const seating = within(rowByLabel("Liczba miejsc")).getAllByRole("cell");
    expect(seating.map((cell) => cell.textContent)).toEqual(["6", "2"]);
    expect(within(rowByLabel("Przebieralnia")).getAllByRole("cell")[0]).toHaveTextContent("Tak, Przy wejściu");
  });

  it("shows the individual quote text instead of a price when priceOnRequest", () => {
    renderTable([
      { id: "a", project: sauna("a") },
      { id: "b", project: sauna("b", { priceOnRequest: true }) },
    ]);

    const cells = within(rowByLabel("Cena od")).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("12 345 €");
    expect(cells[1]).toHaveTextContent("Wycena indywidualna");
  });

  it("shows 'Brak danych' for missing specs, never an empty cell", () => {
    renderTable([
      { id: "a", project: sauna("a", { saunaTechnicalSpecs: undefined }) },
      { id: "b", project: sauna("b", { saunaTechnicalSpecs: { ...baseSpecs, seatingCapacity: null } }) },
    ]);

    expect(within(rowByLabel("Liczba miejsc")).getAllByRole("cell")[0]).toHaveTextContent("Brak danych");
    expect(within(rowByLabel("Liczba miejsc")).getAllByRole("cell")[1]).toHaveTextContent("Brak danych");
    expect(within(rowByLabel("Przebieralnia")).getAllByRole("cell")[0]).toHaveTextContent("Brak danych");
  });

  it("renders an unavailable column with a dash in every row and a notice with the back link (AC-14)", () => {
    renderTable(
      [
        { id: "a", project: sauna("a") },
        { id: "gone", project: null },
      ],
      true,
    );

    expect(screen.getByText("Ta sauna jest niedostępna")).toBeInTheDocument();
    expect(screen.getByText("Część wybranych saun nie jest już dostępna.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć do listy saun" })).toHaveAttribute("href", "/pl/sauna");
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(within(row).getAllByRole("cell")[1]).toHaveTextContent("—");
    }
  });

  it("shows no notice when every column is available", () => {
    renderTable([
      { id: "a", project: sauna("a") },
      { id: "b", project: sauna("b") },
    ]);

    expect(screen.queryByText("Część wybranych saun nie jest już dostępna.")).not.toBeInTheDocument();
  });
});
