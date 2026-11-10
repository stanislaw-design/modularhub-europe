import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const submitMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/commercial-display-inquiry-actions", () => ({ submitCommercialDisplayInquiry: submitMock }));

import { CommercialDisplayInquiryForm } from "./CommercialDisplayInquiryForm";

const countries = [
  { code: "PL" as const, name: "Polska" },
  { code: "DE" as const, name: "Niemcy" },
];

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Imię i nazwisko/), "Anna Nowak");
  await user.type(screen.getByLabelText(/^E-mail/), "anna@example.com");
  await user.click(screen.getByText("Wybierz kraj"));
  await user.click(await screen.findByRole("option", { name: "Polska" }));
  await user.click(screen.getByText("Wybierz zastosowanie"));
  await user.click(await screen.findByRole("option", { name: "Hotel lub resort" }));
  await user.click(screen.getByRole("checkbox", { name: "Ściana LED" }));
  await user.type(screen.getByLabelText(/Opis projektu/), "Potrzebujemy ekranu przy basenie hotelu.");
}

describe("CommercialDisplayInquiryForm", () => {
  beforeEach(() => {
    submitMock.mockReset();
  });

  it("shows validation errors and does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Popraw zaznaczone pola i wyślij ponownie.");
    expect(screen.getByText("Wybierz co najmniej jedną opcję.")).toBeInTheDocument();
    expect(screen.getByText("Opisz projekt w co najmniej 10 znakach.")).toBeInTheDocument();
  });

  it("flags an invalid email address", async () => {
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    await user.type(screen.getByLabelText(/^E-mail/), "to-nie-jest-mail");
    await user.tab();

    expect(screen.getByText("Podaj prawidłowy adres e-mail.")).toBeInTheDocument();
  });

  it("rejects a screen count outside 1 to 500", async () => {
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    await fillRequired(user);
    await user.type(screen.getByLabelText(/Liczba ekranów/), "900");
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByText("Podaj liczbę od 1 do 500.")).toBeInTheDocument();
  });

  it("submits the filled form with the page locale and shows the confirmation", async () => {
    submitMock.mockResolvedValue({ ok: true, id: "abc" });
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="de" countries={countries} />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Anna Nowak",
        email: "anna@example.com",
        countryCode: "PL",
        useCase: "hotel",
        interests: ["led-wall"],
        locale: "de",
        website: "",
        screenCount: undefined,
      }),
    );
    expect(await screen.findByText("Dziękujemy, zapytanie zostało wysłane")).toBeInTheDocument();
    expect(screen.getByText(/anna@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wyślij zapytanie" })).not.toBeInTheDocument();
  });

  it("shows the rate limit message and keeps the form so nothing typed is lost", async () => {
    submitMock.mockResolvedValue({ ok: false, error: "rate_limit" });
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(await screen.findByText(/wysłano już kilka zapytań/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Imię i nazwisko/)).toHaveValue("Anna Nowak");
  });

  it("shows a generic error when saving fails", async () => {
    submitMock.mockResolvedValue({ ok: false, error: "failed" });
    const user = userEvent.setup();
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(await screen.findByText("Nie udało się wysłać zapytania. Spróbuj ponownie za chwilę.")).toBeInTheDocument();
  });

  it("keeps the bot trap field out of the accessibility tree and out of the tab order", () => {
    render(<CommercialDisplayInquiryForm locale="pl" countries={countries} />);

    const trap = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(trap).not.toBeNull();
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("links to the privacy policy in the page language", () => {
    render(<CommercialDisplayInquiryForm locale="nl" countries={countries} />);

    expect(screen.getByRole("link", { name: "polityce prywatności" })).toHaveAttribute("href", "/nl/privacy");
  });
});
