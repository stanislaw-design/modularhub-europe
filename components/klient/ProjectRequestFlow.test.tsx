import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { submitProjectRequest } from "@/lib/project-request-actions";
import { ProjectRequestFlow } from "./ProjectRequestFlow";

vi.mock("@/lib/project-request-actions", () => ({
  submitProjectRequest: vi.fn(),
}));

vi.mock("@/lib/panel-login-link-actions", () => ({
  requestPanelLoginLink: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/inquiry-attachment-actions", () => ({
  uploadInquiryAttachment: vi.fn(),
}));

const mockedSubmitProjectRequest = vi.mocked(submitProjectRequest);

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

async function completeContactStep(user: ReturnType<typeof userEvent.setup>, name = "Jan Kowalski", email = "jan@example.com") {
  await user.type(screen.getByLabelText(/imię i nazwisko/i), name);
  await user.type(screen.getByLabelText(/e-mail/i), email);
}

// Country, project type and completion standard selects all share the
// "Wybierz…" placeholder, so index into them in DOM order; selecting the
// country first re-labels that button to "Polska", leaving project type
// at index 0 among the remaining "Wybierz…" buttons.
async function completeAboutStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);
  await user.click(screen.getByRole("option", { name: "Polska" }));
  await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[0]);
  await user.click(screen.getByRole("option", { name: "Resort" }));
  await user.click(screen.getByLabelText("Dom"));
}

async function completeDetailsStep(user: ReturnType<typeof userEvent.setup>, unitCount = "12") {
  await user.type(screen.getByLabelText(/liczba domów/i), unitCount);
}

async function goToDetailsStep(user: ReturnType<typeof userEvent.setup>) {
  await completeContactStep(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
  await completeAboutStep(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
}

async function completeWizard(user: ReturnType<typeof userEvent.setup>) {
  await goToDetailsStep(user);
  await completeDetailsStep(user);
}

beforeEach(() => {
  mockedSubmitProjectRequest.mockReset();
});

describe("ProjectRequestFlow", () => {
  // Spec 0070: zalogowany klient nie podaje danych kontaktowych drugi raz.
  describe("with the contact data of a signed in client", () => {
    const prefill = { name: "Jan Kowalski", email: "jan@example.com", phone: "+48 600 100 200" };

    it("skips the contact step and starts at the project step", () => {
      render(<ProjectRequestFlow locale="pl" countries={countries} prefill={prefill} />);

      expect(screen.queryByLabelText(/imię i nazwisko/i)).toBeNull();
      expect(screen.getByRole("heading", { level: 2, name: "O projekcie" })).toBeTruthy();
    });

    it("sends the prefilled contact data with the request", async () => {
      const user = userEvent.setup();
      mockedSubmitProjectRequest.mockResolvedValue({ ok: true, id: "r1" });
      render(<ProjectRequestFlow locale="pl" countries={countries} prefill={prefill} />);

      await completeAboutStep(user);
      await user.click(screen.getByRole("button", { name: "Dalej" }));
      await completeDetailsStep(user);
      await user.click(screen.getByRole("button", { name: /wyślij/i }));

      await waitFor(() => expect(mockedSubmitProjectRequest).toHaveBeenCalled());
      expect(mockedSubmitProjectRequest.mock.calls[0][0]).toMatchObject({
        contactName: "Jan Kowalski",
        contactEmail: "jan@example.com",
        contactPhone: "+48 600 100 200",
      });
    });

    it("lets the client go back and edit the contact data", async () => {
      const user = userEvent.setup();
      render(<ProjectRequestFlow locale="pl" countries={countries} prefill={prefill} />);

      await user.click(screen.getByRole("button", { name: "Wstecz" }));

      expect((screen.getByLabelText(/imię i nazwisko/i) as HTMLInputElement).value).toBe("Jan Kowalski");
    });
  });

  it("renders exactly one H1, and each step's own H2 heading as the wizard advances (AC-4)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Dane kontaktowe" })).toBeInTheDocument();

    await completeContactStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByRole("heading", { level: 2, name: "O projekcie" })).toBeInTheDocument();

    await completeAboutStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByRole("heading", { level: 2, name: "Szczegóły" })).toBeInTheDocument();
  });

  it("gates each step's Dalej/submit button behind that step's own required fields (AC-5)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    const step1Next = screen.getByRole("button", { name: "Dalej" });
    expect(step1Next).toBeDisabled();
    await completeContactStep(user);
    expect(step1Next).toBeEnabled();
    await user.click(step1Next);

    const step2Next = screen.getByRole("button", { name: "Dalej" });
    expect(step2Next).toBeDisabled();
    await completeAboutStep(user);
    expect(step2Next).toBeEnabled();
    await user.click(step2Next);

    const submit = screen.getByRole("button", { name: "Wyślij zapytanie" });
    expect(submit).toBeDisabled();
    await completeDetailsStep(user);
    expect(submit).toBeEnabled();
  });

  it("keeps the final step's submit button disabled while unitCount is below the minimum of 3 (AC-8)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await goToDetailsStep(user);
    await user.type(screen.getByLabelText(/liczba domów/i), "2");

    expect(screen.getByRole("button", { name: "Wyślij zapytanie" })).toBeDisabled();
  });

  it("does not require any field beyond country, project type, families, unit count, name and e-mail (AC-5)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    expect(screen.getByLabelText(/telefon/i)).not.toBeRequired();

    await completeContactStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByLabelText(/lokalizacja/i)).not.toBeRequired();

    await completeAboutStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.queryByLabelText(/maksymalna liczba/i)).not.toBeInTheDocument();
  });

  it("lets the user go back to a previous step without losing what they already entered", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeContactStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByRole("heading", { level: 2, name: "O projekcie" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wstecz" }));
    expect(screen.getByRole("heading", { level: 2, name: "Dane kontaktowe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/imię i nazwisko/i)).toHaveValue("Jan Kowalski");
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("jan@example.com");
  });

  it("calls submitProjectRequest directly with the filled fields and shows the confirmation card (AC-6)", async () => {
    mockedSubmitProjectRequest.mockResolvedValue({ ok: true, id: "req-1" });
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeWizard(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Zapytanie wysłane" })).toBeInTheDocument();
    });

    expect(mockedSubmitProjectRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: "Jan Kowalski",
        contactEmail: "jan@example.com",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
      })
    );
  });

  // Spec 0070 AC-29: po zapisie zapytania gość dostaje krok "Dodaj pliki" z tokenem.
  it("shows the files step after submitting when the action returns an upload token", async () => {
    mockedSubmitProjectRequest.mockResolvedValue({ ok: true, id: "req-1", uploadToken: "tok" });
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeWizard(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Pliki do zapytania" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "W plikach nie ma moich danych kontaktowych" })).toBeInTheDocument();
  });

  it("skips the files step when the action returns no upload token", async () => {
    mockedSubmitProjectRequest.mockResolvedValue({ ok: true, id: "req-1" });
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeWizard(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Zapytanie wysłane" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pliki do zapytania" })).not.toBeInTheDocument();
  });

  it("shows the data-sharing notice on the final step, right above the submit button (AC-7)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await goToDetailsStep(user);

    // spec 0062: the open board (pull) replaced the old matched-producer push,
    // so this notice now says contact stays masked until a quote is accepted.
    expect(screen.getByText(/dane kontaktowe są widoczne wyłącznie producentowi, którego wycenę zaakceptujesz/i)).toBeInTheDocument();
  });

  // AC-10 (spec 0062): both free-text fields warn that every volume-verified
  // producer on the board sees them.
  it("shows a visibility hint under locationDetail (step 2) and extrasNote (step 3)", async () => {
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeContactStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText(/ta informacja jest widoczna dla wszystkich zweryfikowanych wolumenowo producentów/i)).toBeInTheDocument();

    await completeAboutStep(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText(/ta notatka jest widoczna dla wszystkich zweryfikowanych wolumenowo producentów/i)).toBeInTheDocument();
  });

  it("shows the request-limit error inline and keeps the filled data when the server rejects it (AC-8)", async () => {
    mockedSubmitProjectRequest.mockResolvedValueOnce({
      ok: false,
      error: "Masz już 3 nierozstrzygnięte zgłoszenia na ten adres e mail. Poczekaj na odpowiedź albo zamknij jedno z nich, zanim wyślesz kolejne.",
    });
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeWizard(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/masz już 3 nierozstrzygnięte zgłoszenia/i);
    });
    expect(screen.getByLabelText(/liczba domów/i)).toHaveValue(12);
  });

  it("disables the submit button while the request is pending (AC-9)", async () => {
    let resolveSubmit: (value: { ok: boolean; id?: string }) => void = () => {};
    mockedSubmitProjectRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      })
    );
    const user = userEvent.setup();
    render(<ProjectRequestFlow locale="pl" countries={countries} />);

    await completeWizard(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(screen.getByRole("button", { name: "Wysyłanie…" })).toBeDisabled();
    resolveSubmit({ ok: true, id: "req-1" });
  });
});
