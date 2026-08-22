import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Project, ProducerInquiry } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { saveOffer } from "@/lib/producer-offers";
import { ProducerOfferForm } from "./ProducerOfferForm";

const inquiry: ProducerInquiry = {
  id: "inq-001",
  projectId: "prj-modulor-family-90",
  clientName: "Anna Kowalska",
  clientEmail: "anna.kowalska@example.com",
  clientPhone: "+48 601 234 567",
  deliveryCountry: "PL",
  receivedAt: "2026-07-28",
};

const project: Project = createMockProject({
  coverImageUrl: "/images/houses/golden-hour/modulor-family-90.webp",
  commercial: {
    ...createMockProject().commercial,
    housePriceMinEur: 118000,
  },
});

const LIST_HREF = "/pl/producent/zapytania";

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProducerOfferForm", () => {
  it("prefills cena domu from the project and locks the transport field to the country's rate", () => {
    render(<ProducerOfferForm inquiry={inquiry} project={project} countryName="Polska" listHref={LIST_HREF} />);

    expect(screen.getByLabelText(/Cena domu/)).toHaveValue(118000);
    const transport = screen.getByLabelText("Transport (€)");
    expect(transport).toHaveValue(3200);
    expect(transport).toBeDisabled();
  });

  it("updates the total as cena domu and montaż change", async () => {
    const user = userEvent.setup();
    render(<ProducerOfferForm inquiry={inquiry} project={project} countryName="Polska" listHref={LIST_HREF} />);

    const houseInput = screen.getByLabelText(/Cena domu/);
    await user.clear(houseInput);
    await user.type(houseInput, "125000");

    const installationInput = screen.getByLabelText(/Montaż/);
    await user.clear(installationInput);
    await user.type(installationInput, "9500");

    expect(screen.getByText("137 700 €")).toBeInTheDocument();
  });

  it("saves the offer and shows a confirmation summary on submit", async () => {
    const user = userEvent.setup();
    render(<ProducerOfferForm inquiry={inquiry} project={project} countryName="Polska" listHref={LIST_HREF} />);

    await user.click(screen.getByRole("button", { name: "Wyślij ofertę" }));

    expect(screen.getByText(/Oferta wysłana do klienta/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć do zapytań" })).toHaveAttribute("href", LIST_HREF);
    expect(screen.queryByRole("button", { name: "Wyślij ofertę" })).not.toBeInTheDocument();
  });

  it("shows the read only summary immediately when an offer was already saved", async () => {
    saveOffer("inq-001", {
      housePriceEur: 130000,
      installationPriceEur: 7000,
      submittedAt: "2026-08-16T09:31:00.000Z",
    });

    render(<ProducerOfferForm inquiry={inquiry} project={project} countryName="Polska" listHref={LIST_HREF} />);

    expect(await screen.findByText(/Oferta wysłana do klienta/)).toBeInTheDocument();
    expect(screen.getByText("130 000 €")).toBeInTheDocument();
    expect(screen.getByText("140 200 €")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wyślij ofertę" })).not.toBeInTheDocument();
  });
});
