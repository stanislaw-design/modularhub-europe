import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestOnBehalf } from "@/lib/project-request-actions";
import { CreateRequestOnBehalfForm } from "./CreateRequestOnBehalfForm";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));
vi.mock("@/lib/project-request-actions", () => ({ createRequestOnBehalf: vi.fn() }));
vi.mock("@/lib/inquiry-attachment-actions", () => ({ uploadInquiryAttachment: vi.fn() }));
const mockedCreate = vi.mocked(createRequestOnBehalf);

const countries = [{ code: "DE", name: "Niemcy" }];
const products = [{ id: "11111111-1111-4111-8111-111111111111", name: "Dom A", producerName: "Producent X" }];

function renderForm() {
  return render(<CreateRequestOnBehalfForm locale="pl" countries={countries} products={products} />);
}

function select(name: string): HTMLSelectElement {
  return document.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
}

beforeEach(() => {
  mockedCreate.mockReset();
  pushMock.mockReset();
});

// Spec 0070 AC-20: formularz doradcy.
describe("CreateRequestOnBehalfForm", () => {
  it("does not call the action when the client language is not chosen (no default, AC-20)", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Wybierz język klienta.");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("sends a free request with the chosen language, consent and families, then opens the detail", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: true, id: "req-9", kind: "request" });
    renderForm();

    await user.type(screen.getByLabelText("Imię i nazwisko"), "Jan Klient");
    await user.type(screen.getByLabelText("Adres e mail"), "jan@example.test");
    await user.type(screen.getByLabelText(/Zgoda klienta/), "Zgoda ustna");
    fireEvent.change(select("clientLocale"), { target: { value: "de" } });
    fireEvent.change(select("countryCode"), { target: { value: "DE" } });
    fireEvent.change(select("projectType"), { target: { value: "resort" } });
    await user.type(screen.getByLabelText("Liczba domów (od 3)"), "6");
    await user.click(screen.getByRole("checkbox", { name: "Dom" }));
    await user.click(screen.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0]).toMatchObject({
      kind: "request",
      contactName: "Jan Klient",
      contactEmail: "jan@example.test",
      locale: "de",
      staffConsentNote: "Zgoda ustna",
      countryCode: "DE",
      projectType: "resort",
      families: ["dom"],
      unitCount: 6,
    });
    // Najpierw krok "Pliki" (AC-34), szczegóły dopiero po przycisku.
    expect(await screen.findByRole("heading", { name: "Pliki do zapytania" })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Przejdź do szczegółów zapytania" }));
    expect(pushMock).toHaveBeenCalledWith("/pl/internal/large-orders/req-9?kind=request");
  });

  it("switches to a product inquiry: shows the product list, hides project fields and sends kind product", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: true, id: "inq-1", kind: "product" });
    renderForm();

    await user.click(screen.getByRole("radio", { name: "Zapytanie o konkretny produkt" }));
    expect(select("projectType")).toBeNull();
    fireEvent.change(select("productId"), { target: { value: products[0].id } });
    fireEvent.change(select("clientLocale"), { target: { value: "nl" } });
    fireEvent.change(select("countryCode"), { target: { value: "DE" } });
    await user.type(screen.getByLabelText("Liczba domów (od 3)"), "4");
    await user.click(screen.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0]).toMatchObject({
      kind: "product",
      productId: products[0].id,
      deliveryCountryCode: "DE",
      locale: "nl",
      unitCount: 4,
    });
    await user.click(await screen.findByRole("button", { name: "Przejdź do szczegółów zapytania" }));
    expect(pushMock).toHaveBeenCalledWith("/pl/internal/large-orders/inq-1?kind=product");
  });

  it("shows the action error and stays on the form (e.g. the three request limit)", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: false, error: "Masz już 3 nierozstrzygnięte zgłoszenia", errorCode: "email_limit" });
    renderForm();

    fireEvent.change(select("clientLocale"), { target: { value: "pl" } });
    await user.click(screen.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Masz już 3 nierozstrzygnięte zgłoszenia");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
