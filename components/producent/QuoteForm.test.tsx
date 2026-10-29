import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitProjectQuote, uploadProjectQuotePdf } from "@/lib/project-quote-actions";
import { QuoteForm } from "./QuoteForm";

vi.mock("@/lib/project-quote-actions", () => ({
  submitProjectQuote: vi.fn(),
  uploadProjectQuotePdf: vi.fn(),
}));

const mockedSubmitProjectQuote = vi.mocked(submitProjectQuote);
const mockedUploadProjectQuotePdf = vi.mocked(uploadProjectQuotePdf);

function quotePdfFile(name = "oferta.pdf") {
  return new File(["%PDF-1.7\n%%EOF"], name, { type: "application/pdf" });
}

// Pola obowiązkowe formatu oferty (spec 0070 AC-11): cena łączna, zakres w cenie, ważność.
async function fillRequired(user: ReturnType<typeof userEvent.setup>, totalPrice: string) {
  await user.type(screen.getByLabelText(/Cena całkowita/), totalPrice);
  await user.type(screen.getByLabelText(/Co jest w cenie/), "Dom w stanie deweloperskim");
  fireEvent.change(screen.getByLabelText(/Oferta ważna do/), { target: { value: "2030-01-31" } });
}

beforeEach(() => {
  mockedSubmitProjectQuote.mockReset();
  mockedUploadProjectQuotePdf.mockReset();
});

describe("QuoteForm for a product inquiry (spec 0070 AC-21)", () => {
  it("submits bulkProductInquiryId and no projectRequestId", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm bulkProductInquiryId="inq-1" isRevision={false} />);

    await fillRequired(user, "900000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => expect(mockedSubmitProjectQuote).toHaveBeenCalledTimes(1));
    const payload = mockedSubmitProjectQuote.mock.calls[0]![0];
    expect(payload.bulkProductInquiryId).toBe("inq-1");
    expect(payload.projectRequestId).toBeUndefined();
  });
});

describe("QuoteForm", () => {
  it("disables submit until total price, scope and validity date are filled in", async () => {
    const user = userEvent.setup();
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    const submit = screen.getByRole("button", { name: "Wyślij wycenę" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/Co jest w cenie/), "Dom w stanie deweloperskim");
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Oferta ważna do/), { target: { value: "2030-01-31" } });
    expect(submit).toBeEnabled();
  });

  it("submits the required fields with net as the default price mode and logistics left to be quoted later", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "1250000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(mockedSubmitProjectQuote).toHaveBeenCalledWith({
        projectRequestId: "req-1",
        priceTaxMode: "net",
        vatRatePercent: undefined,
        totalPriceEur: 1250000,
        unitPriceEur: undefined,
        scopeIncluded: "Dom w stanie deweloperskim",
        scopeExcluded: undefined,
        logistics: {
          transport: { mode: "tbd", amountEur: undefined, maxAmountEur: undefined, note: undefined },
          assembly: { mode: "tbd", amountEur: undefined, maxAmountEur: undefined, note: undefined },
          crane: { mode: "tbd", amountEur: undefined, maxAmountEur: undefined, note: undefined },
        },
        paymentPlan: undefined,
        validUntil: "2030-01-31",
        warrantyNote: undefined,
        proposedLeadTimeWeeks: undefined,
        deliveryWindowFrom: undefined,
        deliveryWindowTo: undefined,
        notes: undefined,
      });
    });
  });

  it("includes the optional fields, gross price mode and logistics modes once filled in", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "1250000");
    await user.click(screen.getByLabelText("Brutto"));
    await user.type(screen.getByLabelText(/Stawka VAT/), "23");
    await user.type(screen.getByLabelText(/Cena za sztukę/), "100000");
    await user.type(screen.getByLabelText(/Co jest poza ceną/), "Fundament");
    await user.click(screen.getByLabelText("Transport: Kwota"));
    await user.type(screen.getByLabelText("Kwota (€)"), "15000");
    await user.click(screen.getByLabelText("Montaż: Widełki"));
    await user.type(screen.getByLabelText("Od (€)"), "20000");
    await user.type(screen.getByLabelText("Do (€)"), "30000");
    await user.type(screen.getByLabelText(/czas realizacji/), "16");
    await user.type(screen.getByLabelText(/Plan płatności/), "30/60/10");
    await user.type(screen.getByLabelText(/Gwarancja/), "10 lat");
    fireEvent.change(screen.getByLabelText(/Okno dostawy od/), { target: { value: "2030-03-01" } });
    fireEvent.change(screen.getByLabelText(/Okno dostawy do/), { target: { value: "2030-04-01" } });
    await user.type(screen.getByLabelText(/Notatka/), "Możemy zacząć od marca.");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(mockedSubmitProjectQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          projectRequestId: "req-1",
          priceTaxMode: "gross",
          vatRatePercent: 23,
          totalPriceEur: 1250000,
          unitPriceEur: 100000,
          scopeExcluded: "Fundament",
          logistics: {
            transport: { mode: "amount", amountEur: 15000, maxAmountEur: undefined, note: undefined },
            assembly: { mode: "range", amountEur: 20000, maxAmountEur: 30000, note: undefined },
            crane: { mode: "tbd", amountEur: undefined, maxAmountEur: undefined, note: undefined },
          },
          paymentPlan: "30/60/10",
          warrantyNote: "10 lat",
          proposedLeadTimeWeeks: 16,
          deliveryWindowFrom: "2030-03-01",
          deliveryWindowTo: "2030-04-01",
          notes: "Możemy zacząć od marca.",
        }),
      );
    });
  }, 30_000);

  it("shows the revision intro and label when isRevision is true", () => {
    render(<QuoteForm projectRequestId="req-1" isRevision />);

    expect(screen.getByText(/Poprawiasz wcześniej złożoną wycenę/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wyślij poprawioną wycenę" })).toBeInTheDocument();
  });

  it("shows a success message once submitProjectQuote resolves ok:true", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Wyślij wycenę" })).not.toBeInTheDocument();
  });

  // spec 0063 AC-1, AC-11: the optional PDF upload step only renders once a
  // quoteId comes back from submitProjectQuote -- never for an older mocked
  // result shaped without one (ok:true alone), since the step has nothing to
  // upload against without it.
  it("shows the optional PDF upload step once submission returns a quoteId", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true, quoteId: "quote-1" });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("PDF wyceny")).toBeInTheDocument();
  });

  // The engineer wants the PDF picked in the same step as the price, not a
  // second click after success: QuoteForm captures the file locally and
  // uploads it itself right after submitProjectQuote returns a quoteId.
  it("uploads the selected PDF automatically, in the same submit, once the quote is created", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true, quoteId: "quote-1" });
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: true, documentId: "doc-1" });
    const file = quotePdfFile();
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.upload(screen.getByLabelText("PDF wyceny"), file);
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(mockedUploadProjectQuotePdf).toHaveBeenCalledWith("quote-1", file);
    });
    expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    expect(screen.getByText("oferta.pdf")).toBeInTheDocument();
  });

  it("does not call uploadProjectQuotePdf when no file was picked", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true, quoteId: "quote-1" });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(mockedUploadProjectQuotePdf).not.toHaveBeenCalled();
  });

  // The quote itself must stay saved even if the automatic PDF upload fails
  // (e.g. file too large): the engineer gets a retry step, never a rollback
  // of the already-accepted quote.
  it("keeps the quote success and offers a retry step when the automatic PDF upload fails", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true, quoteId: "quote-1" });
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: false, error: "Plik PDF jest pusty albo większy niż 20 MB." });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.upload(screen.getByLabelText("PDF wyceny"), quotePdfFile());
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/większy niż 20 MB/);
    expect(screen.getByLabelText("PDF wyceny")).toBeInTheDocument();
  });

  it("does not render the PDF upload step when submission succeeds without a quoteId", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("PDF wyceny")).not.toBeInTheDocument();
  });

  it("shows the server error and keeps the form when submitProjectQuote resolves ok:false", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: false, error: "To zapytanie nie jest już otwarte na wyceny." });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await fillRequired(user, "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/nie jest już otwarte/);
    });
    expect(await screen.findByRole("button", { name: "Wyślij wycenę" })).toBeInTheDocument();
  });
});

describe("QuoteForm variants (spec 0077 AC-11, AC-44)", () => {
  it("does not show the variant field for client requests", () => {
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);
    expect(screen.queryByLabelText(/Nazwa wariantu/)).not.toBeInTheDocument();
  });

  it("requires a variant name for a platform project and sends it trimmed", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} requireVariant />);

    await fillRequired(user, "900000");
    const submit = screen.getByRole("button", { name: "Wyślij wycenę" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/Nazwa wariantu/), "  Pod klucz ");
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(mockedSubmitProjectQuote).toHaveBeenCalledTimes(1));
    expect(mockedSubmitProjectQuote.mock.calls[0]![0].variantLabel).toBe("Pod klucz");
  });

  it("prefills the form from an existing variant", () => {
    render(
      <QuoteForm
        projectRequestId="req-1"
        isRevision
        requireVariant
        initialValues={{
          variantLabel: "Stan surowy",
          priceTaxMode: "gross",
          vatRatePercent: "23",
          totalPriceEur: "700000",
          unitPriceEur: "",
          scopeIncluded: "Konstrukcja",
          scopeExcluded: "",
          logistics: {
            transport: { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" },
            assembly: { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" },
            crane: { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" },
          },
          paymentPlan: "",
          validUntil: "2030-01-31",
          warrantyNote: "",
          proposedLeadTimeWeeks: "",
          deliveryWindowFrom: "",
          deliveryWindowTo: "",
          notes: "",
        }}
      />,
    );
    expect(screen.getByLabelText(/Nazwa wariantu/)).toHaveValue("Stan surowy");
    expect(screen.getByLabelText(/Cena całkowita/)).toHaveValue(700000);
    expect(screen.getByRole("button", { name: /Wyślij/ })).toBeEnabled();
  });
});
