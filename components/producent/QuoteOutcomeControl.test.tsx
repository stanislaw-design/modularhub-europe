import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportQuoteOutcome } from "@/lib/project-quote-actions";
import { QuoteOutcomeControl } from "./QuoteOutcomeControl";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/project-quote-actions", () => ({ reportQuoteOutcome: vi.fn() }));
const mockedReport = vi.mocked(reportQuoteOutcome);

beforeEach(() => {
  mockedReport.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-18: zwycięski producent potwierdza wynik, tylko raz.
describe("QuoteOutcomeControl", () => {
  it("sends the chosen outcome and refreshes", async () => {
    const user = userEvent.setup();
    mockedReport.mockResolvedValue({ ok: true });
    render(<QuoteOutcomeControl quoteId="q-1" outcome={null} />);

    await user.click(screen.getByRole("button", { name: "Brak porozumienia" }));

    await waitFor(() => expect(mockedReport).toHaveBeenCalledWith("q-1", "no_agreement"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("shows only the saved outcome, with no buttons, once reported", () => {
    render(<QuoteOutcomeControl quoteId="q-1" outcome="signed" />);

    expect(screen.getByText("Wynik: Podpisano umowę")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the already reported message when the action refuses", async () => {
    const user = userEvent.setup();
    mockedReport.mockResolvedValue({ ok: false, errorCode: "already_reported" });
    render(<QuoteOutcomeControl quoteId="q-1" outcome={null} />);

    await user.click(screen.getByRole("button", { name: "Wycofano się" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("już zapisany"));
  });
});
