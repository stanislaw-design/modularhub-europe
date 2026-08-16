import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import { BindingOfferView } from "./BindingOfferView";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj-modulor-family-90",
    producerId: "prod-modulor",
    producerName: "Modulor Systems Sp. z o.o.",
    name: "Modulor Family 90",
    countryOfProduction: "PL",
    floorAreaM2: 90,
    bedrooms: 3,
    priceMin: 118000,
    priceMax: 142000,
    currency: "EUR",
    coverImageUrl: "https://picsum.photos/seed/modulor-family-90/960/640",
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
    ...overrides,
  };
}

describe("BindingOfferView", () => {
  it("shows the project summary, the address, and one final price with no carrier list", () => {
    render(<BindingOfferView locale="pl" project={makeProject()} address="Ul. Polna 5, Kraków" />);

    expect(screen.getByRole("heading", { level: 1, name: /Modulor Family 90/ })).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems.*90 m².*3 sypialnie/)).toBeInTheDocument();
    expect(screen.getByText("Ul. Polna 5, Kraków")).toBeInTheDocument();

    // Single final price (project.priceMax), not the priceMin–priceMax range shown elsewhere.
    expect(screen.getByText("142 000 €")).toBeInTheDocument();
    expect(screen.queryByText(/118 000/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("singularizes the bedroom count for a one-bedroom project", () => {
    render(<BindingOfferView locale="pl" project={makeProject({ bedrooms: 1 })} address="Ul. Polna 5" />);
    expect(screen.getByText(/1 sypialnia/)).toBeInTheDocument();
  });

  it("shows the mock disclaimer before acceptance", () => {
    render(<BindingOfferView locale="pl" project={makeProject()} address="Ul. Polna 5" />);
    expect(screen.getByText(/To demonstracyjna oferta na danych przykładowych/)).toBeInTheDocument();
  });

  it("accepting the offer replaces the button with a confirmation, announced via aria-live", async () => {
    const user = userEvent.setup();
    render(<BindingOfferView locale="pl" project={makeProject()} address="Ul. Polna 5" />);

    const acceptButton = screen.getByRole("button", { name: "Zaakceptuj ofertę" });
    await user.click(acceptButton);

    expect(screen.queryByRole("button", { name: "Zaakceptuj ofertę" })).not.toBeInTheDocument();
    expect(screen.getByText(/Zaakceptowano/)).toBeInTheDocument();
    expect(screen.getByText(/Zaakceptowano/).closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("links back to the plot dossier panel for this project", () => {
    render(<BindingOfferView locale="pl" project={makeProject()} address="Ul. Polna 5" />);

    const backLink = screen.getByRole("link", { name: "Wróć do panelu działki" });
    expect(backLink).toHaveAttribute("href", "/pl/klient/dzialka?projects=prj-modulor-family-90");
  });

  it("accepting the offer shows a 'Śledź realizację' link to the realizacja page for this project (AC-8)", async () => {
    const user = userEvent.setup();
    render(<BindingOfferView locale="pl" project={makeProject()} address="Ul. Polna 5" />);

    await user.click(screen.getByRole("button", { name: "Zaakceptuj ofertę" }));

    const trackLink = screen.getByRole("link", { name: "Śledź realizację" });
    expect(trackLink).toHaveAttribute("href", "/pl/klient/realizacja?project=prj-modulor-family-90");
  });
});
