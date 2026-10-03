import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptProjectQuote } from "@/lib/project-quote-actions";
import { AcceptQuoteButton } from "./AcceptQuoteButton";

vi.mock("@/lib/project-quote-actions", () => ({
  acceptProjectQuote: vi.fn(),
}));

const mockedAcceptProjectQuote = vi.mocked(acceptProjectQuote);

beforeEach(() => {
  mockedAcceptProjectQuote.mockReset();
});

describe("AcceptQuoteButton", () => {
  it("calls acceptProjectQuote with the quoteId and shows a success state on ok:true", async () => {
    const user = userEvent.setup();
    mockedAcceptProjectQuote.mockResolvedValue({ ok: true });
    render(<AcceptQuoteButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Akceptuj" }));

    await waitFor(() => {
      expect(mockedAcceptProjectQuote).toHaveBeenCalledWith("quote-1");
      expect(screen.getByText("Zaakceptowano")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Akceptuj" })).not.toBeInTheDocument();
  });

  // AC-6: the button stays clickable and shows acceptProjectQuote's own
  // error message in place -- never a silent no-op or a fake success.
  it("shows the server's B2B-verification error in place and keeps the button clickable", async () => {
    const user = userEvent.setup();
    mockedAcceptProjectQuote.mockResolvedValue({ ok: false, error: "Twoja weryfikacja B2B nie jest jeszcze zatwierdzona przez administratora." });
    render(<AcceptQuoteButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Akceptuj" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/weryfikacja B2B/);
    });
    expect(screen.getByRole("button", { name: "Akceptuj" })).toBeEnabled();
  });
});
