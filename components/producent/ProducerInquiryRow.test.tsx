import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Project, ProducerInquiry } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { saveOffer } from "@/lib/producer-offers";
import { ProducerInquiryRow } from "./ProducerInquiryRow";

const inquiry: ProducerInquiry = {
  id: "inq-001",
  projectId: "prj-modulor-family-90",
  clientName: "Anna Kowalska",
  clientEmail: "anna.kowalska@example.com",
  clientPhone: "+48 601 234 567",
  deliveryCountry: "PL",
  receivedAt: "2026-07-28",
};

const project: Project = createMockProject({ coverImageUrl: "/images/houses/golden-hour/modulor-family-90.webp" });

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProducerInquiryRow", () => {
  it("shows the project, client, and fixed request message", () => {
    render(<ProducerInquiryRow locale="pl" inquiry={inquiry} project={project} countryName="Polska" />);

    expect(screen.getByRole("heading", { level: 2, name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByText(/Anna Kowalska/)).toBeInTheDocument();
    expect(screen.getByText(/Polska/)).toBeInTheDocument();
    expect(
      screen.getByText("Klient prosi o przygotowanie oferty na ten projekt, uwzględniającej dom, transport i montaż.")
    ).toBeInTheDocument();
  });

  it("shows a 'Nowe zapytanie' badge and a 'Przygotuj ofertę' link with no saved offer", () => {
    render(<ProducerInquiryRow locale="pl" inquiry={inquiry} project={project} countryName="Polska" />);

    expect(screen.getByText("Nowe zapytanie")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Przygotuj ofertę" });
    expect(link).toHaveAttribute("href", "/pl/producent/zapytania/oferta?zapytanie=inq-001");
  });

  it("shows an 'Oferta złożona' badge and a 'Zobacz ofertę' link once an offer is saved", async () => {
    saveOffer("inq-001", { housePriceEur: 125000, installationPriceEur: 9500, submittedAt: "2026-08-16T09:31:00.000Z" });

    render(<ProducerInquiryRow locale="pl" inquiry={inquiry} project={project} countryName="Polska" />);

    expect(await screen.findByText("Oferta złożona")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zobacz ofertę" })).toHaveAttribute(
      "href",
      "/pl/producent/zapytania/oferta?zapytanie=inq-001"
    );
  });

  it("does not report an offer for a different inquiry as submitted", () => {
    saveOffer("inq-999", { housePriceEur: 1, installationPriceEur: 1, submittedAt: "2026-08-16T09:31:00.000Z" });

    render(<ProducerInquiryRow locale="pl" inquiry={inquiry} project={project} countryName="Polska" />);

    expect(screen.getByText("Nowe zapytanie")).toBeInTheDocument();
  });
});
