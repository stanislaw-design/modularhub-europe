import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadProjectQuotePdf } from "@/lib/project-quote-actions";
import { ProjectQuotePdfUploadStep } from "./ProjectQuotePdfUploadStep";

vi.mock("@/lib/project-quote-actions", () => ({
  uploadProjectQuotePdf: vi.fn(),
}));

const mockedUploadProjectQuotePdf = vi.mocked(uploadProjectQuotePdf);

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
    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), file);

    await waitFor(() => {
      expect(mockedUploadProjectQuotePdf).toHaveBeenCalledWith("quote-1", file);
      expect(screen.getByText("nowa-oferta.pdf")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("replaces a previously shown filename when a second upload succeeds", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: true, documentId: "doc-2" });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" initialFilename="stara-oferta.pdf" />);

    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), pdfFile("nowa-wersja.pdf"));

    await waitFor(() => {
      expect(screen.getByText("nowa-wersja.pdf")).toBeInTheDocument();
    });
    expect(screen.queryByText("stara-oferta.pdf")).not.toBeInTheDocument();
  });

  // AC-4/AC-11: a failed upload (e.g. oversized or bad signature) shows the
  // server's readable error without pretending a file was attached.
  it("shows the server's error message and keeps no filename when the upload fails", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: false, error: "Plik PDF jest pusty albo większy niż 20 MB." });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), pdfFile("za-duzy.pdf"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Plik PDF jest pusty albo większy niż 20 MB.");
    });
    expect(screen.queryByText("za-duzy.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz plik" })).toBeInTheDocument();
  });

  it("falls back to the generic upload error when the server gives none", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValue({ ok: false });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), pdfFile());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się wgrać pliku. Spróbuj ponownie.");
    });
  });

  it("clears a previous error once a retry upload succeeds", async () => {
    const user = userEvent.setup();
    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: false, error: "Zawartość pliku nie ma prawidłowej sygnatury PDF." });
    render(<ProjectQuotePdfUploadStep quoteId="quote-1" />);

    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), pdfFile("zle.pdf"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    mockedUploadProjectQuotePdf.mockResolvedValueOnce({ ok: true, documentId: "doc-3" });
    await user.upload(screen.getByLabelText("PDF wyceny (opcjonalnie)"), pdfFile("poprawny.pdf"));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("poprawny.pdf")).toBeInTheDocument();
    });
  });
});
