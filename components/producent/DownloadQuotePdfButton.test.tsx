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

describe("DownloadQuotePdfButton (producent)", () => {
  // AC-7, AC-11: the producer's own download button on
  // /producer/panel/board-quotes behaves identically to the client's.
  it("requests a fresh URL for this quote and opens it in a new tab on success", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: true, url: "https://private.example/signed-url?sig=xyz" });
    render(<DownloadQuotePdfButton quoteId="quote-9" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(mockedGetProjectQuotePdfUrl).toHaveBeenCalledWith("quote-9");
      expect(window.open).toHaveBeenCalledWith("https://private.example/signed-url?sig=xyz", "_blank", "noopener,noreferrer");
    });
  });

  // AC-10: this is the same component another producer would see, so if
  // getProjectQuotePdfUrl ever denies access, the UI must show that denial
  // plainly rather than silently failing or leaking a different message.
  it("shows the not-found error in place when the caller is not authorized for this quote", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: false, error: "Nie znaleziono wyceny." });
    render(<DownloadQuotePdfButton quoteId="quote-9" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie znaleziono wyceny.");
    });
    expect(screen.getByRole("button", { name: "Pobierz PDF" })).toBeEnabled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("falls back to the generic error when the result is ok but carries no url", async () => {
    const user = userEvent.setup();
    mockedGetProjectQuotePdfUrl.mockResolvedValue({ ok: true });
    render(<DownloadQuotePdfButton quoteId="quote-9" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się przygotować linku do pliku. Spróbuj ponownie.");
    });
  });

  it("disables the button and shows the preparing label while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: { ok: boolean; url?: string }) => void;
    mockedGetProjectQuotePdfUrl.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    render(<DownloadQuotePdfButton quoteId="quote-9" />);

    await user.click(screen.getByRole("button", { name: "Pobierz PDF" }));

    expect(screen.getByRole("button", { name: "Przygotowywanie…" })).toBeDisabled();

    resolvePromise!({ ok: true, url: "https://private.example/signed-url" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pobierz PDF" })).toBeEnabled();
    });
  });
});
