import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { submitBulkProductInquiry } from "@/lib/project-request-actions";
import { BulkProductInquiryModal } from "./BulkProductInquiryModal";

vi.mock("@/lib/project-request-actions", () => ({
  submitBulkProductInquiry: vi.fn(),
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

const mockedSubmitBulkProductInquiry = vi.mocked(submitBulkProductInquiry);

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Zapytaj o większą ilość" }));
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>, unitCount = "20") {
  await user.type(screen.getByLabelText(/imię i nazwisko/i), "Jan Kowalski");
  await user.type(screen.getByLabelText(/e-mail/i), "jan@example.com");
  await user.type(screen.getByLabelText(/liczba domów/i), unitCount);
  await user.click(screen.getByRole("button", { name: "Wybierz…" }));
  await user.click(screen.getByRole("option", { name: "Polska" }));
}

async function openAndFillForm(user: ReturnType<typeof userEvent.setup>, unitCount = "20") {
  await openModal(user);
  await fillRequiredFields(user, unitCount);
}

beforeEach(() => {
  mockedSubmitBulkProductInquiry.mockReset();
});

describe("BulkProductInquiryModal", () => {
  // Spec 0070 AC-39: kod email_limit pokazuje tłumaczony komunikat z linkiem do panelu.
  it("shows the translated limit message with a link to the panel when the email limit is hit", async () => {
    mockedSubmitBulkProductInquiry.mockResolvedValue({ ok: false, error: "Masz już 3", errorCode: "email_limit" });
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    await openAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByText(/Masz już 3 z 3 aktywnych zapytań o duże zamówienie/)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Przejdź do listy zapytań" })).toBeInTheDocument();
  });

  it("opens the dialog with a real heading when the trigger is clicked, gates submit behind required fields (AC-15)", async () => {
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await openModal(user);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Wyślij zapytanie" });
    expect(submit).toBeDisabled();

    await fillRequiredFields(user);
    expect(submit).toBeEnabled();
  });

  // Spec 0070 AC-29: po zapisie zapytania o produkt gość dostaje krok "Dodaj pliki" z tokenem.
  it("shows the files step after sending when the action returns an upload token", async () => {
    mockedSubmitBulkProductInquiry.mockResolvedValue({ ok: true, id: "inq-1", uploadToken: "tok" });
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    await openAndFillForm(user, "25");
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Pliki do zapytania" })).toBeInTheDocument();
  });

  it("calls submitBulkProductInquiry with the product id and filled fields, shows confirmation without leaving the page (AC-15, AC-16)", async () => {
    mockedSubmitBulkProductInquiry.mockResolvedValue({ ok: true, id: "inq-1" });
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    await openAndFillForm(user, "25");
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Zapytanie wysłane" })).toBeInTheDocument();
    });

    expect(mockedSubmitBulkProductInquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-1",
        contactName: "Jan Kowalski",
        contactEmail: "jan@example.com",
        unitCount: 25,
        deliveryCountryCode: "PL",
      }),
    );
  });

  it("shows the existing request-limit error inline instead of leaving the modal (AC-16)", async () => {
    mockedSubmitBulkProductInquiry.mockResolvedValueOnce({
      ok: false,
      error: "Masz już 3 nierozstrzygnięte zgłoszenia na ten adres e mail. Poczekaj na odpowiedź albo zamknij jedno z nich, zanim wyślesz kolejne.",
    });
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    await openAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/masz już 3 nierozstrzygnięte zgłoszenia/i);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables the submit button while the request is pending (AC-16)", async () => {
    let resolveSubmit: (value: { ok: boolean; id?: string }) => void = () => {};
    mockedSubmitBulkProductInquiry.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<BulkProductInquiryModal productId="product-1" countries={countries} />);

    await openAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(screen.getByRole("button", { name: "Wysyłanie…" })).toBeDisabled();
    resolveSubmit({ ok: true, id: "inq-1" });
  });
});
