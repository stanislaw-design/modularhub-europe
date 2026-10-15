import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectProjectQuote } from "@/lib/project-quote-actions";
import { SelectQuoteButton } from "./SelectQuoteButton";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh }),
}));
vi.mock("@/lib/project-quote-actions", () => ({ selectProjectQuote: vi.fn() }));

const mockedSelectProjectQuote = vi.mocked(selectProjectQuote);

beforeEach(() => {
  mockedSelectProjectQuote.mockReset();
  refresh.mockReset();
});

// Spec 0070 AC-16: wybór oferty, zmiana wyboru i czytelne błędy w języku strony.
describe("SelectQuoteButton", () => {
  it("calls selectProjectQuote with the quote id and refreshes the page on success", async () => {
    const user = userEvent.setup();
    mockedSelectProjectQuote.mockResolvedValue({ ok: true });
    render(<SelectQuoteButton quoteId="quote-1" isSelected={false} hasOtherSelection={false} />);

    await user.click(screen.getByRole("button", { name: "Wybierz tę ofertę" }));

    await waitFor(() => expect(mockedSelectProjectQuote).toHaveBeenCalledWith("quote-1"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("labels the button as a change when another offer is already chosen", () => {
    render(<SelectQuoteButton quoteId="quote-2" isSelected={false} hasOtherSelection />);

    expect(screen.getByRole("button", { name: "Zmień wybór na tę ofertę" })).toBeEnabled();
  });

  it("shows a chosen label instead of a button for the chosen offer", () => {
    render(<SelectQuoteButton quoteId="quote-1" isSelected hasOtherSelection={false} />);

    expect(screen.getByText("Wybrana")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the translated message for the error code and keeps the button clickable", async () => {
    const user = userEvent.setup();
    mockedSelectProjectQuote.mockResolvedValue({ ok: false, error: "Strony są już połączone.", errorCode: "already_connected" });
    render(<SelectQuoteButton quoteId="quote-1" isSelected={false} hasOtherSelection={false} />);

    await user.click(screen.getByRole("button", { name: "Wybierz tę ofertę" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Strony są już połączone/));
    expect(screen.getByRole("button", { name: "Wybierz tę ofertę" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
