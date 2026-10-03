import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectQuotePdfUrl } from "@/lib/project-quote-actions";
import { DownloadQuotePdfButton } from "./DownloadQuotePdfButton";

vi.mock("@/lib/project-quote-actions", () => ({
  getProjectQuotePdfUrl: vi.fn(),
}));

const mockedGetProjectQuotePdfUrl = vi.mocked(getProjectQuotePdfUrl);

beforeEach(() => {
  mockedGetProjectQuotePdfUrl.mockReset();
  // vi.spyOn on window.open reuses the same mock across tests once spied
  // (it is never restored), so its call history must be cleared here too --
  // otherwise a later test sees calls left over from an earlier one.
  vi.spyOn(window, "open").mockImplementation(() => null).mockClear();
});

describe("DownloadQuotePdfButton (klient)", () => {
  // AC-7: a fresh signed URL is generated on every click, never cached, and
  // opened in a new tab rather than navigating the current page away.
  it("requests a fresh URL for this quote and opens it in a new tab on success", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: true, url: "https://private.example/signed-url?sig=abc" });
    render(<DownloadQuotePdfButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(mockedGetProjectQuotePdfUrl).toHaveBeenCalledWith("quote-1");
      expect(window.open).toHaveBeenCalledWith("https://private.example/signed-url?sig=abc", "_blank", "noopener,noreferrer");
    });
  });

  it("shows the server's error message in place and keeps the button clickable on ok:false", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: false, error: "Nie znaleziono wyceny." });
    render(<DownloadQuotePdfButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wyceny.");
    });
    expect(screen.getByRole("button", { name: "Pobierz PDF" })).toBeEnabled();
    expect(window.open).not.toHaveBeenCalled();
  });

  // Edge case: ok:true but no url (shouldn't happen per the action's contract,
  // but the component must still fail safely rather than call window.open(undefined).
  it("falls back to the generic error when the result is ok but carries no url", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: true });
    render(<DownloadQuotePdfButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się przygotować linku do pliku. Spróbuj ponownie.");
    });
    expect(window.open).not.toHaveBeenCalled();
  });

  it("disables the button and shows the preparing label while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: { ok: boolean; url?: string }) => void;
    mockedGetProjectQuotePdfUrl.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    render(<DownloadQuotePdfButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    expect(screen.getByRole("button", { name: "Przygotowywanie…" })).toBeDisabled();

    resolvePromise!({ ok: true, url: "https://private.example/signed-url" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pobierz PDF" })).toBeEnabled();
    });
  });

  it("clears a previous error once a retry succeeds", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValueOnce({ ok: false, error: "Nie znaleziono wyceny." });
    render(<DownloadQuotePdfButton quoteId="quote-1" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    mockedGetProjectQuotePdfUrl.mockResolvedValueOnce({ ok: true, url: "https://private.example/signed-url" });
    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(window.open).toHaveBeenCalledWith("https://private.example/signed-url", "_blank", "noopener,noreferrer");
    });
  });
});
