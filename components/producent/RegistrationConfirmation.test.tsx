import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country } from "@/lib/data/types";
import type { RegistrationDetails } from "@/lib/producer-registration";
import { RegistrationConfirmation } from "./RegistrationConfirmation";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

const details: RegistrationDetails = {
  nip: "1234567890",
  countries: ["PL", "DE"],
  technology: "szkielet-drewniany",
};

describe("RegistrationConfirmation", () => {
  it("renders exactly one H1 and the submitted NIP, country names, and technology label", () => {
    render(<RegistrationConfirmation locale="pl" details={details} countries={countries} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByText("Polska, Niemcy")).toBeInTheDocument();
    expect(screen.getByText("Szkielet drewniany")).toBeInTheDocument();
  });

  it("falls back to the raw country code when a country is not found in the given list", () => {
    render(
      <RegistrationConfirmation
        locale="pl"
        details={{ ...details, countries: ["PL", "NL"] }}
        countries={[{ code: "PL", name: "Polska" }]}
      />
    );

    expect(screen.getByText("Polska, NL")).toBeInTheDocument();
  });

  it("falls back to the raw technology value when it is not one of the known technologies", () => {
    render(
      <RegistrationConfirmation
        locale="pl"
        details={{ ...details, technology: "nieznana-technologia" as RegistrationDetails["technology"] }}
        countries={countries}
      />
    );

    expect(screen.getByText("nieznana-technologia")).toBeInTheDocument();
  });

  it("links back to the registration form under the given locale", () => {
    render(<RegistrationConfirmation locale="de" details={details} countries={countries} />);

    expect(screen.getByRole("link", { name: "Wróć do rejestracji" })).toHaveAttribute(
      "href",
      "/de/producent"
    );
  });
});
