import { render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  mockedSubmitProjectQuote.mockReset();
  mockedUploadProjectQuotePdf.mockReset();
});

describe("QuoteForm", () => {
  it("disables submit until a total price is entered", async () => {
    const user = userEvent.setup();
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    const submit = screen.getByRole("button", { name: "Wyślij wycenę" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    expect(submit).toBeEnabled();
  });

  it("submits only the fields the producer filled in, omitting optional ones", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await user.type(screen.getByLabelText(/Cena całkowita/), "1250000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(mockedSubmitProjectQuote).toHaveBeenCalledWith({
        projectRequestId: "req-1",
        totalPriceEur: 1250000,
        unitPriceEur: undefined,
        proposedLeadTimeWeeks: undefined,
        notes: undefined,
      });
    });
  });

  it("includes the optional fields once filled in", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await user.type(screen.getByLabelText(/Cena całkowita/), "1250000");
    await user.type(screen.getByLabelText(/Cena za sztukę/), "100000");
    await user.type(screen.getByLabelText(/czas realizacji/), "16");
    await user.type(screen.getByLabelText(/Notatka/), "Możemy zacząć od marca.");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(mockedSubmitProjectQuote).toHaveBeenCalledWith({
        projectRequestId: "req-1",
        totalPriceEur: 1250000,
        unitPriceEur: 100000,
        proposedLeadTimeWeeks: 16,
        notes: "Możemy zacząć od marca.",
      });
    });
  });

  it("shows the revision intro and label when isRevision is true", () => {
    render(<QuoteForm projectRequestId="req-1" isRevision />);

    expect(screen.getByText(/Poprawiasz wcześniej złożoną wycenę/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wyślij poprawioną wycenę" })).toBeInTheDocument();
  });

  it("shows a success message once submitProjectQuote resolves ok:true", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
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

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("PDF wyceny (opcjonalnie)")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), file);
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

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
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

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), quotePdfFile());
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/większy niż 20 MB/);
    expect(screen.getByLabelText("PDF wyceny (opcjonalnie)")).toBeInTheDocument();
  });

  it("does not render the PDF upload step when submission succeeds without a quoteId", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: true });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByText("Wycena wysłana.")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("PDF wyceny (opcjonalnie)")).not.toBeInTheDocument();
  });

  it("shows the server error and keeps the form when submitProjectQuote resolves ok:false", async () => {
    const user = userEvent.setup();
    mockedSubmitProjectQuote.mockResolvedValue({ ok: false, error: "To zapytanie nie jest już otwarte na wyceny." });
    render(<QuoteForm projectRequestId="req-1" isRevision={false} />);

    await user.type(screen.getByLabelText(/Cena całkowita/), "500000");
    await user.click(screen.getByRole("button", { name: "Wyślij wycenę" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/nie jest już otwarte/);
    });
    expect(screen.getByRole("button", { name: "Wyślij wycenę" })).toBeInTheDocument();
  });
});
