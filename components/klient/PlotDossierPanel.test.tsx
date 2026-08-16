import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import { PlotDossierPanel } from "./PlotDossierPanel";

function makeProject(id: string, name: string, producerName: string, floorAreaM2: number): Project {
  return {
    id,
    producerId: "prod-1",
    producerName,
    name,
    countryOfProduction: "PL",
    floorAreaM2,
    bedrooms: 3,
    priceMin: 100000,
    priceMax: 120000,
    currency: "EUR",
    coverImageUrl: "https://picsum.photos/seed/x/960/640",
    description: "",
    wallBuildUp: "",
    insulation: "",
    heatTransferCoefficients: "",
    windowClass: "",
    ventilation: "",
    heatSource: "",
    fireResistance: "",
    windResistance: "",
    featured: false,
  };
}

// prj-modulor-family-90 (approved) and prj-karpaty-alpine-104 (blocked) both have
// fixture rows in lib/data/fixtures/plot-analysis.ts.
const projectA = makeProject("prj-modulor-family-90", "Modulor Family 90", "Modulor Systems", 90);
const projectB = makeProject("prj-karpaty-alpine-104", "Karpaty Alpine 104", "Karpaty Haus", 104);

describe("PlotDossierPanel", () => {
  it("renders exactly one H1 and one collapsed row per selected project (AC-2)", () => {
    render(<PlotDossierPanel locale="pl" projects={[projectA, projectB]} resultsHref="/pl/klient/wyniki" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Panel działki");

    const rowA = screen.getByRole("button", { name: /Modulor Family 90/ });
    const rowB = screen.getByRole("button", { name: /Karpaty Alpine 104/ });
    expect(rowA).toHaveAttribute("aria-expanded", "false");
    expect(rowB).toHaveAttribute("aria-expanded", "false");
  });

  it("shares one address field across every row, required before any row's Zapłać is enabled (AC-2, AC-3)", async () => {
    const user = userEvent.setup();
    render(<PlotDossierPanel locale="pl" projects={[projectA]} resultsHref="/pl/klient/wyniki" />);

    await user.click(screen.getByRole("button", { name: /Modulor Family 90/ }));
    await user.type(screen.getByLabelText(/metraż działki/i), "250");
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();

    await user.type(screen.getByLabelText(/adres działki/i), "Ul. Polna 5");
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeEnabled();
  });

  it(
    "keeps one row's payment and result independent from another row in the same panel (AC-8)",
    async () => {
      const user = userEvent.setup();
      render(<PlotDossierPanel locale="pl" projects={[projectA, projectB]} resultsHref="/pl/klient/wyniki" />);

      await user.type(screen.getByLabelText(/adres działki/i), "Ul. Testowa 10");
      await user.click(screen.getByRole("button", { name: /Modulor Family 90/ }));
      await user.click(screen.getByRole("button", { name: /Karpaty Alpine 104/ }));

      const areaInputs = screen.getAllByLabelText(/metraż działki/i);
      const payButtons = screen.getAllByRole("button", { name: "Zapłać" });
      expect(areaInputs).toHaveLength(2);
      expect(payButtons).toHaveLength(2);

      // Fill and pay only row A (Modulor Family 90).
      await user.type(areaInputs[0], "300");
      expect(payButtons[1]).toBeDisabled();
      await user.click(payButtons[0]);

      expect(screen.getByText("Przetwarzanie płatności…")).toBeInTheDocument();
      // Row B is untouched: its own area input is still empty and its Zapłać still disabled.
      expect(screen.getByLabelText(/metraż działki/i)).toHaveValue(null);
      expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();

      await screen.findByText("Dopuszczone", {}, { timeout: 3000 });
      // Row B remains idle even after row A resolves to a result.
      expect(screen.getByLabelText(/metraż działki/i)).toHaveValue(null);
      expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();
    },
    5000
  );

  it("renders a secondary 'Wróć do wyników' link to resultsHref", () => {
    render(
      <PlotDossierPanel
        locale="pl"
        projects={[projectA]}
        resultsHref="/pl/klient/wyniki?country=DE&sizeMin=50"
      />
    );

    const link = screen.getByRole("link", { name: "Wróć do wyników" });
    expect(link).toHaveAttribute("href", "/pl/klient/wyniki?country=DE&sizeMin=50");
  });
});
