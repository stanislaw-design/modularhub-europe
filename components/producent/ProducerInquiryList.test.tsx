import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country, Project, ProducerInquiry } from "@/lib/data/types";
import { ProducerInquiryList } from "./ProducerInquiryList";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

const project: Project = {
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
  coverImageUrl: "/images/houses/golden-hour/modulor-family-90.webp",
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

function makeInquiry(overrides: Partial<ProducerInquiry> = {}): ProducerInquiry {
  return {
    id: "inq-001",
    projectId: "prj-modulor-family-90",
    clientName: "Anna Kowalska",
    clientEmail: "anna.kowalska@example.com",
    clientPhone: "+48 601 234 567",
    deliveryCountry: "PL",
    receivedAt: "2026-07-28",
    ...overrides,
  };
}

describe("ProducerInquiryList", () => {
  it("shows an empty state message when there are no inquiries", () => {
    render(<ProducerInquiryList locale="pl" inquiries={[]} projects={[]} countries={countries} />);

    expect(screen.getByText(/Brak zapytań/)).toBeInTheDocument();
  });

  it("renders one row per inquiry with a matching project", () => {
    render(
      <ProducerInquiryList
        locale="pl"
        inquiries={[makeInquiry()]}
        projects={[project]}
        countries={countries}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Modulor Family 90" })).toBeInTheDocument();
  });

  it("skips an inquiry whose project cannot be found, without throwing", () => {
    render(
      <ProducerInquiryList
        locale="pl"
        inquiries={[makeInquiry({ projectId: "does-not-exist" })]}
        projects={[project]}
        countries={countries}
      />
    );

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("falls back to the raw country code when the country isn't in the fixture", () => {
    render(
      <ProducerInquiryList
        locale="pl"
        inquiries={[makeInquiry({ deliveryCountry: "NL" })]}
        projects={[project]}
        countries={countries}
      />
    );

    expect(screen.getByText(/NL/)).toBeInTheDocument();
  });
});
