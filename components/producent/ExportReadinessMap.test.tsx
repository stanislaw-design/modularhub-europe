import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country, ExportReadinessCountryStatus } from "@/lib/data/types";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ExportReadinessMap } from "./ExportReadinessMap";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

const entries: ExportReadinessCountryStatus[] = [
  { countryCode: "PL", status: "approved", reason: "Zgodne z warunkami technicznymi.", gaps: [] },
  {
    countryCode: "DE",
    status: "conditional",
    reason: "Brakuje kilku dokumentów.",
    gaps: ["Obliczenia statyczne.", "Deklaracja DoP."],
  },
  { countryCode: "NL", status: "blocked", reason: "Nie spełnia wymagań BENG.", gaps: [] },
];

describe("ExportReadinessMap", () => {
  it("shows the project name in the heading when one is given (AC-1)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName="Modulor 28" countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Gotowość eksportowa: „Modulor 28”"
    );
  });

  it("falls back to a generic heading, without erroring, when no project name is given (AC-1)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName={null} countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gotowość eksportowa");
  });

  it("renders exactly one h1 (AC-8)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName="Modulor 28" countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders exactly three country rows, one per entry, with resolved country names and status pills (AC-2)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName={null} countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.getByText("Polska")).toBeInTheDocument();
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
    expect(screen.getByText("Holandia")).toBeInTheDocument();
    expect(screen.getByText("Dopuszczone")).toBeInTheDocument();
    expect(screen.getByText("Warunkowo dopuszczone")).toBeInTheDocument();
    expect(screen.getByText("Niedopuszczone")).toBeInTheDocument();
  });

  it("shows the legal disclaimer exactly once, near the top (AC-6)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName={null} countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(
      screen.getAllByText(
        "To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana."
      )
    ).toHaveLength(1);
  });

  it("contains no links in the default collapsed view (AC-7; spec 0010 adds a 'Domknij luki' link once a conditional row is expanded)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName={null} countries={countries} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("falls back to the raw country code when a country is missing from the countries list", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName={null} countries={[]} entries={entries} catalogHref={null} />
      )
    );

    expect(screen.getByText("PL")).toBeInTheDocument();
    expect(screen.getByText("DE")).toBeInTheDocument();
    expect(screen.getByText("NL")).toBeInTheDocument();
  });

  it("shows a link to the product catalog only when catalogHref is given (spec 0016, AC-6)", async () => {
    render(
      await resolveAsyncTree(
        <ExportReadinessMap locale="pl" projectName="Modulor 28" countries={countries} entries={entries} catalogHref={null} />
      )
    );
    expect(screen.queryByRole("link", { name: "Zobacz swoje produkty" })).not.toBeInTheDocument();

    render(
      await resolveAsyncTree(
        <ExportReadinessMap
          locale="pl"
          projectName="Modulor 28"
          countries={countries}
          entries={entries}
          catalogHref="/pl/producer/products?nip=1234567890"
        />
      )
    );
    expect(screen.getByRole("link", { name: "Zobacz swoje produkty" })).toHaveAttribute(
      "href",
      "/pl/producer/products?nip=1234567890"
    );
  });
});
