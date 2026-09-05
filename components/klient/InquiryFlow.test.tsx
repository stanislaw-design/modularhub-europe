import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country, Project } from "@/lib/data/types";
import { submitInquiry } from "@/lib/inquiry-actions";
import { createMockProject } from "@/test/fixtures/project";
import { InquiryFlow } from "./InquiryFlow";

vi.mock("@/lib/inquiry-actions", () => ({
  submitInquiry: vi.fn(),
}));

const mockedSubmitInquiry = vi.mocked(submitInquiry);

function makeProject(id: string, name: string, producerName: string): Project {
  return createMockProject({ id, producerId: "prod-1", producerName, name, floorAreaM2: 80, priceMin: 100000, priceMax: 120000 });
}

const oneProject = [makeProject("id1", "Dom Jeden", "Producent Jeden")];
const twoProjects = [
  makeProject("id1", "Dom Jeden", "Producent Jeden"),
  makeProject("id2", "Dom Dwa", "Producent Dwa"),
];

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

const emptyContact = { name: "", email: "", phone: "" };

async function fillValidContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
  await user.type(screen.getByLabelText(/e-mail/i), "jan@example.com");
  await user.type(screen.getByLabelText(/telefon/i), "600123456");
  await user.click(screen.getByRole("button", { name: "Wybierz…" }));
  await user.click(screen.getByRole("option", { name: "Polska" }));
}

beforeEach(() => {
  mockedSubmitInquiry.mockReset();
});

describe("InquiryFlow", () => {
  it("renders exactly one H1 and the contact form fields, all required (AC-6, AC-9)", () => {
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByLabelText(/imię i nazwisko/i)).toBeRequired();
    expect(screen.getByLabelText(/e-mail/i)).toBeRequired();
    expect(screen.getByLabelText(/telefon/i)).toBeRequired();
  });

  it("prefills contact fields from the logged-in client's account", () => {
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={{ name: "Jan Kowalski", email: "jan@example.com", phone: "600123456" }}
        initialCountryCode="DE"
      />
    );

    expect(screen.getByLabelText(/imię i nazwisko/i)).toHaveValue("Jan Kowalski");
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("jan@example.com");
    expect(screen.getByLabelText(/telefon/i)).toHaveValue("600123456");
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
  });

  it("keeps the submit button disabled until every field, including delivery country, is filled (AC-6)", async () => {
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    const submit = screen.getByRole("button", { name: "Wyślij zapytanie" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
    await user.type(screen.getByLabelText(/telefon/i), "600123456");
    await user.type(screen.getByLabelText(/e-mail/i), "jan@example.com");
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    await user.click(screen.getByRole("option", { name: "Polska" }));
    expect(submit).toBeEnabled();
  });

  it("keeps the submit button disabled while the email is present but not validly formatted (AC-6)", async () => {
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode="PL"
      />
    );

    await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
    await user.type(screen.getByLabelText(/telefon/i), "600123456");
    await user.type(screen.getByLabelText(/e-mail/i), "not-an-email");

    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toBeDisabled();
  });

  it("submits the selected project ids, contact, and delivery country, then shows confirmation (AC-6)", async () => {
    mockedSubmitInquiry.mockResolvedValue({ ok: true, inquiryId: "inq-1" });
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={twoProjects}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zapytanie wysłane" })).toBeInTheDocument();
    });

    expect(mockedSubmitInquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        contact: { name: "Jan Kowalski", email: "jan@example.com", phone: "600123456" },
        deliveryCountryCode: "PL",
        projectIds: ["id1", "id2"],
        idempotencyKey: expect.any(String),
      })
    );
    expect(screen.getByText("Dom Jeden")).toBeInTheDocument();
    expect(screen.getByText("Dom Dwa")).toBeInTheDocument();
  });

  it("shows an inline error and keeps the filled form when the server action fails, without losing the idempotency key (AC-7)", async () => {
    mockedSubmitInquiry.mockResolvedValueOnce({ ok: false, error: "Nie udało się zapisać zapytania. Spróbuj ponownie." });
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/nie udało się zapisać zapytania/i);
    });
    expect(screen.getByLabelText(/imię i nazwisko/i)).toHaveValue("Jan Kowalski");

    mockedSubmitInquiry.mockResolvedValueOnce({ ok: true, inquiryId: "inq-1" });
    const retryButton = await screen.findByRole("button", { name: "Ponów wysyłanie" });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zapytanie wysłane" })).toBeInTheDocument();
    });

    const [firstCall, secondCall] = mockedSubmitInquiry.mock.calls;
    expect(firstCall[0].idempotencyKey).toBe(secondCall[0].idempotencyKey);
  });

  it("does not submit and stays on the form when the button is clicked while invalid (AC-6)", async () => {
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(mockedSubmitInquiry).not.toHaveBeenCalled();
    expect(screen.queryByText("Zapytanie wysłane")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/imię i nazwisko/i)).toBeInTheDocument();
  });

  it("shows a 'Sprawdź działkę' link to dzialkaHref alongside the results link after sending (spec 0006 AC-2)", async () => {
    mockedSubmitInquiry.mockResolvedValue({ ok: true, inquiryId: "inq-1" });
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki?country=DE&sizeMin=50"
        dzialkaHref="/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    const dzialkaLink = await screen.findByRole("link", { name: "Sprawdź działkę" });
    expect(dzialkaLink).toHaveAttribute("href", "/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50");
  });

  it("shows a single secondary 'Wróć do wyników' link to resultsHref after sending, with no way back to the form (AC-8)", async () => {
    mockedSubmitInquiry.mockResolvedValue({ ok: true, inquiryId: "inq-1" });
    const user = userEvent.setup();
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki?country=DE&sizeMin=50"
        dzialkaHref="/pl/klient/dzialka?projects=id1&country=DE&sizeMin=50"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    await fillValidContact(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    const backLinks = await screen.findAllByRole("link", { name: "Wróć do wyników" });
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0]).toHaveAttribute("href", "/pl/klient/wyniki?country=DE&sizeMin=50");
    expect(screen.queryByLabelText(/imię i nazwisko/i)).not.toBeInTheDocument();
  });

  it("gives every interactive element the visible focus-ring class (AC-9)", () => {
    render(
      <InquiryFlow
        projects={oneProject}
        resultsHref="/pl/klient/wyniki"
        dzialkaHref="/pl/klient/dzialka?projects=id1"
        countries={countries}
        initialContact={emptyContact}
        initialCountryCode={null}
      />
    );

    expect(screen.getByLabelText(/imię i nazwisko/i)).toHaveClass("focus-ring");
    expect(screen.getByLabelText(/e-mail/i)).toHaveClass("focus-ring");
    expect(screen.getByLabelText(/telefon/i)).toHaveClass("focus-ring");
    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toHaveClass("focus-ring");
  });
});
