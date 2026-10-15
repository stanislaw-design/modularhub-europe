import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAdvisorNote, unpublishQuote } from "@/lib/large-order-admin-actions";
import { QuotePublicationControls } from "./QuotePublicationControls";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/large-order-admin-actions", () => ({ setAdvisorNote: vi.fn(), unpublishQuote: vi.fn() }));
const mockedNote = vi.mocked(setAdvisorNote);
const mockedUnpublish = vi.mocked(unpublishQuote);

beforeEach(() => {
  mockedNote.mockReset();
  mockedUnpublish.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-14: komentarz tylko przed publikacją, cofnięcie tylko po niej.
describe("QuotePublicationControls", () => {
  it("lets the admin write a comment on an unpublished quote and refreshes", async () => {
    const user = userEvent.setup();
    mockedNote.mockResolvedValue({ ok: true });
    render(<QuotePublicationControls quoteId="q-1" advisorNote={null} isPublished={false} isSelected={false} />);

    expect(screen.queryByRole("button", { name: "Cofnij publikację" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dodaj komentarz ModularHub" }));
    await user.type(screen.getByRole("textbox"), "Dobra cena");
    await user.click(screen.getByRole("button", { name: "Zapisz komentarz" }));

    await waitFor(() => expect(mockedNote).toHaveBeenCalledWith("q-1", "Dobra cena"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("offers to withdraw a published quote, and hides that for the quote the client chose", async () => {
    const user = userEvent.setup();
    mockedUnpublish.mockResolvedValue({ ok: true });
    const { rerender } = render(<QuotePublicationControls quoteId="q-1" advisorNote="x" isPublished isSelected={false} />);

    expect(screen.queryByRole("button", { name: /komentarz/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cofnij publikację" }));
    await waitFor(() => expect(mockedUnpublish).toHaveBeenCalledWith("q-1"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());

    rerender(<QuotePublicationControls quoteId="q-1" advisorNote="x" isPublished isSelected />);
    expect(screen.queryByRole("button", { name: "Cofnij publikację" })).not.toBeInTheDocument();
  });

  it("shows the server error when withdrawing fails", async () => {
    const user = userEvent.setup();
    mockedUnpublish.mockResolvedValue({ ok: false, error: "Klient ją wybrał." });
    render(<QuotePublicationControls quoteId="q-1" advisorNote={null} isPublished isSelected={false} />);

    await user.click(screen.getByRole("button", { name: "Cofnij publikację" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Klient ją wybrał.");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
