import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import { InquiryFlow } from "./InquiryFlow";

function makeProject(id: string, name: string, producerName: string): Project {
  return {
    id,
    producerId: "prod-1",
    producerName,
    name,
    countryOfProduction: "PL",
    floorAreaM2: 80,
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

const oneProject = [makeProject("id1", "Dom Jeden", "Producent Jeden")];
const twoProjects = [
  makeProject("id1", "Dom Jeden", "Producent Jeden"),
  makeProject("id2", "Dom Dwa", "Producent Dwa"),
];

async function fillValidContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
  await user.type(screen.getByLabelText(/e-mail/i), "jan@example.com");
  await user.type(screen.getByLabelText(/telefon/i), "600123456");
}

describe("InquiryFlow", () => {
  it("renders exactly one H1 and the contact form fields, all required (AC-6, AC-9)", () => {
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByLabelText(/imię i nazwisko/i)).toBeRequired();
    expect(screen.getByLabelText(/e-mail/i)).toBeRequired();
    expect(screen.getByLabelText(/telefon/i)).toBeRequired();
  });

  it("keeps the submit button disabled until every field is filled (AC-6)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    const submit = screen.getByRole("button", { name: "Wyślij zapytanie" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/telefon/i), "600123456");
    expect(submit).toBeDisabled();
  });

  it("keeps the submit button disabled while the email is present but not validly formatted (AC-6)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
    await user.type(screen.getByLabelText(/telefon/i), "600123456");
    await user.type(screen.getByLabelText(/e-mail/i), "not-an-email");

    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toBeDisabled();
  });

  it("shows an inline email format error only after the email field is blurred (AC-6)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    const email = screen.getByLabelText(/e-mail/i);
    await user.type(email, "not-an-email");
    expect(screen.queryByText(/podaj prawidłowy adres e-mail/i)).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText(/podaj prawidłowy adres e-mail/i)).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-describedby", "inquiry-email-error");
  });

  it("enables the submit button once name, a valid email, and phone are all filled (AC-6)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    await fillValidContact(user);

    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toBeEnabled();
  });

  it("shows the confirmation state immediately on submit, with one templated block per selected project (AC-7)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={twoProjects} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(screen.getByRole("heading", { level: 1, name: "Zapytanie wysłane" })).toBeInTheDocument();
    expect(screen.getByText("Dom Jeden")).toBeInTheDocument();
    expect(screen.getByText("Dom Dwa")).toBeInTheDocument();
    expect(screen.getByText("Producent Jeden")).toBeInTheDocument();
    expect(screen.getByText("Producent Dwa")).toBeInTheDocument();
    expect(screen.getAllByText(/wysłano/i).length).toBeGreaterThanOrEqual(2);
    // Fixed platform template message, identical for every project (AC-7)
    const messages = screen.getAllByText(
      /Klient prosi o przygotowanie oferty na ten projekt, uwzględniającej dom, transport i montaż\./
    );
    expect(messages).toHaveLength(2);
  });

  it("does not submit and stays on the form when the button is clicked while invalid (AC-6)", async () => {
    const user = userEvent.setup();
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(screen.queryByText("Zapytanie wysłane")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/imię i nazwisko/i)).toBeInTheDocument();
  });

  it("shows a 'Sprawdź działkę' link to dzialkaHref alongside the results link after sending (spec 0006 AC-2)", async () => {
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki?country=DE&sizeMin=50"
        dzialkaHref="/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50"
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    const dzialkaLink = screen.getByRole("link", { name: "Sprawdź działkę" });
    expect(dzialkaLink).toHaveAttribute("href", "/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50");
  });

  it("shows a single secondary 'Wróć do wyników' link to resultsHref after sending, with no way back to the form (AC-8)", async () => {
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki?country=DE&sizeMin=50"
        dzialkaHref="/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50"
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    const backLinks = screen.getAllByRole("link", { name: "Wróć do wyników" });
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0]).toHaveAttribute("href", "/pl/klient/wyniki?country=DE&sizeMin=50");
    expect(screen.queryByLabelText(/imię i nazwisko/i)).not.toBeInTheDocument();
  });

  it("gives every interactive element the visible focus-ring class (AC-9)", () => {
    render(<InquiryFlow projects={oneProject} resultsHref="/pl/klient/wyniki" dzialkaHref="/pl/klient/dzialka?projects=id1" />);

    expect(screen.getByLabelText(/imię i nazwisko/i)).toHaveClass("focus-ring");
    expect(screen.getByLabelText(/e-mail/i)).toHaveClass("focus-ring");
    expect(screen.getByLabelText(/telefon/i)).toHaveClass("focus-ring");
    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toHaveClass("focus-ring");
  });
});
