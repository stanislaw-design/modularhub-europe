import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitProjectQuote } from "@/lib/project-quote-actions";
import { QuoteForm } from "./QuoteForm";

vi.mock("@/lib/project-quote-actions", () => ({
  submitProjectQuote: vi.fn(),
}));

const mockedSubmitProjectQuote = vi.mocked(submitProjectQuote);

beforeEach(() => {
  mockedSubmitProjectQuote.mockReset();
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
