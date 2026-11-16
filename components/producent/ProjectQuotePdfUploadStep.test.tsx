import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectQuotePdfUploadStep } from "./ProjectQuotePdfUploadStep";
import { uploadQuotePdf } from "./upload-quote-pdf";

// Spec 0085: krok używa wspólnego pomocnika (prośba, PUT do R2, potwierdzenie), który tu jest granicą.
vi.mock("./upload-quote-pdf", () => ({ uploadQuotePdf: vi.fn() }));

const mockedUploadProjectQuotePdf = vi.mocked(uploadQuotePdf);

function pdfFile(name = "wycena.pdf") {
  return new File(["%PDF-1.7 fake content"], name, { type: "application/pdf" });
}

beforeEach(() => {
  mockedUploadProjectQuotePdf.mockReset();
});

describe("ProjectQuotePdfUploadStep", () => {
  it("shows the choose-file state with no filename when there is no initial file", () => {
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    expect(screen.getByRole("button", { name: "Wybierz plik" })).toBeInTheDocument();
    expect(screen.queryByText(/\.pdf$/)).not.toBeInTheDocument();
  });

  // AC-11: initialFilename lets QuoteForm pre-fill this step right after an
  // upload that already succeeded in the same submit, without a redundant fetch.
  it("shows the given initial filename and the replace-file label", () => {
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" initialFilename="juz-wgrany.pdf" />);

    expect(screen.getByText("juz-wgrany.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zastąp plik" })).toBeInTheDocument();
  });

  // AC-3: uploading a file here replaces whatever the quote already had.
  it("uploads the selected file for this quoteId and shows the new filename on success", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: true, documentId: "doc-1" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    const file = pdfFile("nowa-oferta.pdf");
    await user.upload(screen.getByLabelText("PDF wyceny"), file);

    await waitFor(() => {
      expect(mockedUploadProjectQuotePdf).toHaveBeenCalledWith("quote-1", file, expect.any(Function));
      expect(screen.getByText("nowa-oferta.pdf")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("replaces a previously shown filename when a second upload succeeds", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: true, documentId: "doc-2" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" initialFilename="stara-oferta.pdf" />);

    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile("nowa-wersja.pdf"));

    await waitFor(() => {
      expect(screen.getByText("nowa-wersja.pdf")).toBeInTheDocument();
    });
    expect(screen.queryByText("stara-oferta.pdf")).not.toBeInTheDocument();
  });

  // AC-4/AC-11: a failed upload (e.g. oversized or bad signature) shows the
  // server's readable error without pretending a file was attached.
  it("shows the server's error message and keeps no filename when the upload fails", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: false, errorCode: "too_large" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile("za-duzy.pdf"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Plik jest większy niż 20 MB.");
    });
    expect(screen.queryByText("za-duzy.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz plik" })).toBeInTheDocument();
  });

  it("shows the generic error for an unexpected failure, and a retry button that sends the same file again", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: false, errorCode: "generic" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się zapisać pliku. Spróbuj ponownie.");
    });

    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: true, documentId: "doc-r" });
    await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await waitFor(() => expect(mockedUploadProjectQuotePdf).toHaveBeenCalledTimes(2));
    expect(mockedUploadProjectQuotePdf.mock.calls[1][1]).toBe(mockedUploadProjectQuotePdf.mock.calls[0][1]);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("tells the producer when the file could not be sent to storage", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: false, errorCode: "upload_failed" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się wysłać pliku.");
    });
  });

  it("clears a previous error once a retry upload succeeds", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: false, errorCode: "file_rejected" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile("zle.pdf"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: true, documentId: "doc-3" });
    await user.upload(screen.getByLabelText("PDF wyceny"), pdfFile("poprawny.pdf"));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("poprawny.pdf")).toBeInTheDocument();
    });
  });
});
