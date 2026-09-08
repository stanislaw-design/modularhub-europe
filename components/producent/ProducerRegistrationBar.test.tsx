import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country } from "@/lib/data/types";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProducerRegistrationBar } from "./ProducerRegistrationBar";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

describe("ProducerRegistrationBar", () => {
  it("shows the NIP, the joined country names, and the technology label", async () => {
    render(
      await resolveAsyncTree(
        <ProducerRegistrationBar
          details={{ nip: "1234567890", countries: ["PL", "DE"], technology: "szkielet-drewniany" }}
          countries={countries}
        />
      )
    );

    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByText(/Polska, Niemcy/)).toBeInTheDocument();
    expect(screen.getByText(/Szkielet drewniany/)).toBeInTheDocument();
  });

  it("shows a single country's name for a single-country registration", async () => {
    render(
      await resolveAsyncTree(
        <ProducerRegistrationBar
          details={{ nip: "1234567890", countries: ["PL"], technology: "beton-modulowy" }}
          countries={countries}
        />
      )
    );

    expect(screen.getByText(/Polska/)).toBeInTheDocument();
    expect(screen.getByText(/Beton modułowy/)).toBeInTheDocument();
  });

  it("falls back to the raw country code when it is not in the given countries list", async () => {
    render(
      await resolveAsyncTree(
        <ProducerRegistrationBar
          details={{ nip: "1234567890", countries: ["NL"], technology: "szkielet-drewniany" }}
          countries={countries}
        />
      )
    );

    expect(screen.getByText(/NL/)).toBeInTheDocument();
  });

  it("shows the confirmation badge text", async () => {
    render(
      await resolveAsyncTree(
        <ProducerRegistrationBar
          details={{ nip: "1234567890", countries: ["PL"], technology: "szkielet-drewniany" }}
          countries={countries}
        />
      )
    );

    expect(screen.getByText("Zarejestrowano")).toBeInTheDocument();
  });
});
