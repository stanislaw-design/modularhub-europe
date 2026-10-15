import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClientReceivedQuote } from "@/lib/db/queries";
import { QuoteComparisonTable } from "./QuoteComparisonTable";

vi.mock("@/lib/project-quote-actions", () => ({
  selectProjectQuote: vi.fn(),
  getProjectQuotePdfUrl: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));

function quote(overrides: Partial<ClientReceivedQuote> = {}): ClientReceivedQuote {
  return {
    id: "quote-1",
    producerId: "producer-1",
    producerName: "Dom Sp. z o.o.",
    status: "active",
    totalPriceCents: 90_000_000,
    unitPriceCents: null,
    proposedLeadTimeWeeks: null,
    notes: null,
    submittedAt: new Date("2026-10-10T10:00:00Z"),
    contactRevealedAt: null,
    hasPdf: false,
    priceTaxMode: "net",
    vatRatePercent: null,
    scopeIncluded: "Dom w stanie deweloperskim",
    scopeExcluded: null,
    logistics: {},
    paymentPlan: null,
    validUntil: "2099-12-31",
    warrantyNote: null,
    deliveryWindowFrom: null,
    deliveryWindowTo: null,
    advisorNote: null,
    certifications: [],
    ...overrides,
  };
}

function rowCells(label: string): HTMLElement[] {
  const rowHeader = screen.getByRole("rowheader", { name: label });
  const row = rowHeader.closest("tr") as HTMLElement;
  return within(row).getAllByRole("cell");
}

// Spec 0070 AC-15: tabela porównawcza z pól ofert, kolumny to producenci, brak wartości to
// "brak danych" albo "do wyceny", nigdy zero, i żadnych danych kontaktowych producenta.
describe("QuoteComparisonTable", () => {
  it("shows one column per producer with the price and its tax mode", () => {
    render(
      <QuoteComparisonTable selectedQuoteId={null} requestClosed={false}
        locale="pl"
        quotes={[
          quote(),
          quote({ id: "quote-2", producerName: "Drugi Producent", totalPriceCents: 80_000_000, priceTaxMode: "gross", vatRatePercent: 23 }),
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Dom Sp\. z o\.o\./ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Drugi Producent/ })).toBeInTheDocument();
    const [first, second] = rowCells("Cena łączna");
    expect(first).toHaveTextContent(/900\s?000/);
    expect(first).toHaveTextContent("cena netto");
    expect(second).toHaveTextContent(/800\s?000/);
    expect(second).toHaveTextContent("cena brutto, w tym VAT 23%");
  });

  it("shows 'brak danych' for missing fields and never a zero", () => {
    render(<QuoteComparisonTable selectedQuoteId={null} requestClosed={false} locale="pl" quotes={[quote()]} />);

    for (const label of ["Cena za sztukę", "Zakres poza ceną", "Plan płatności", "Gwarancja", "Termin produkcji", "Okno dostawy", "Transport na budowę", "Certyfikaty producenta", "Komentarz ModularHub"]) {
      const [cell] = rowCells(label);
      expect(cell, label).toHaveTextContent("brak danych");
      expect(cell, label).not.toHaveTextContent(/\b0\b/);
    }
  });

  it("renders logistics as an amount, a range or 'do wyceny'", () => {
    render(
      <QuoteComparisonTable selectedQuoteId={null} requestClosed={false}
        locale="pl"
        quotes={[
          quote({
            logistics: {
              transport: { mode: "amount", amountCents: 1_200_000, note: "z rozładunkiem" },
              assembly: { mode: "range", amountCents: 500_000, maxAmountCents: 800_000 },
              crane: { mode: "tbd" },
            },
          }),
        ]}
      />,
    );

    expect(rowCells("Transport na budowę")[0]).toHaveTextContent(/12\s?000/);
    expect(rowCells("Transport na budowę")[0]).toHaveTextContent("z rozładunkiem");
    expect(rowCells("Montaż")[0]).toHaveTextContent(/od 5\s?000.*do 8\s?000/);
    expect(rowCells("Dźwig")[0]).toHaveTextContent("do wyceny");
  });

  it("shows delivery window, lead time, warranty, advisor note and certificates when given", () => {
    render(
      <QuoteComparisonTable selectedQuoteId={null} requestClosed={false}
        locale="pl"
        quotes={[
          quote({
            proposedLeadTimeWeeks: 12,
            warrantyNote: "10 lat na konstrukcję",
            deliveryWindowFrom: "2027-03-01",
            deliveryWindowTo: "2027-04-30",
            advisorNote: "Najkrótszy termin",
            certifications: [
              { name: "ISO 9001", confirmed: true },
              { name: "CE", confirmed: false },
            ],
          }),
        ]}
      />,
    );

    expect(rowCells("Termin produkcji")[0]).toHaveTextContent("12 tyg.");
    expect(rowCells("Gwarancja")[0]).toHaveTextContent("10 lat na konstrukcję");
    expect(rowCells("Okno dostawy")[0]).toHaveTextContent(/od .*2027.* do .*2027/);
    expect(rowCells("Komentarz ModularHub")[0]).toHaveTextContent("Najkrótszy termin");
    expect(rowCells("Certyfikaty producenta")[0]).toHaveTextContent("ISO 9001 (potwierdzony przez ModularHub)");
    expect(rowCells("Certyfikaty producenta")[0]).toHaveTextContent("CE");
  });

  it("has a single producer column for one offer and no contact data fields", () => {
    render(<QuoteComparisonTable selectedQuoteId={null} requestClosed={false} locale="pl" quotes={[quote()]} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.queryByText(/e-?mail|telefon|www/i)).not.toBeInTheDocument();
  });

  it("lists the PDF attachments under the table only for offers that have one", () => {
    render(
      <QuoteComparisonTable selectedQuoteId={null} requestClosed={false}
        locale="pl"
        quotes={[quote({ hasPdf: true }), quote({ id: "quote-2", producerName: "Bez Pliku" })]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Załączniki" })).toBeInTheDocument();
    expect(screen.getByText("Oferta producenta Dom Sp. z o.o. (PDF)")).toBeInTheDocument();
    expect(screen.queryByText(/Bez Pliku \(PDF\)/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pobierz PDF" })).toHaveLength(1);
  });

  // Spec 0070 AC-16: klient wybiera aktywną ofertę i może zmienić wybór do połączenia stron.
  it("offers the choose button only for active offers", () => {
    render(<QuoteComparisonTable selectedQuoteId={null} requestClosed={false} locale="pl" quotes={[quote(), quote({ id: "quote-2", producerName: "Inny", status: "rejected" })]} />);

    expect(screen.getAllByRole("button", { name: "Wybierz tę ofertę" })).toHaveLength(1);
  });

  it("marks the chosen offer, offers a change on the others and explains the pending company check", () => {
    render(
      <QuoteComparisonTable
        selectedQuoteId="quote-1"
        requestClosed={false}
        locale="pl"
        quotes={[quote(), quote({ id: "quote-2", producerName: "Drugi" })]}
      />,
    );

    expect(screen.getByText("Wybrana")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Zmień wybór na tę ofertę" })).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(/Czekamy na potwierdzenie danych firmy/);
  });

  it("hides every choose button and confirms the connection once an offer is accepted", () => {
    render(
      <QuoteComparisonTable
        selectedQuoteId="quote-2"
        requestClosed={false}
        locale="pl"
        quotes={[quote(), quote({ id: "quote-2", producerName: "Wybrany", status: "accepted", contactRevealedAt: new Date() })]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Wybierz|Zmień wybór/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Strony zostały połączone/);
  });

  it("does not offer a choice on a closed request", () => {
    render(<QuoteComparisonTable selectedQuoteId={null} requestClosed locale="pl" quotes={[quote()]} />);

    expect(screen.queryByRole("button", { name: /Wybierz|Zmień wybór/ })).not.toBeInTheDocument();
  });
});
