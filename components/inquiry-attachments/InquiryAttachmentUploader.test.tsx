import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pl from "@/messages/pl.json";
import { confirmInquiryAttachment, requestInquiryAttachmentUpload } from "@/lib/inquiry-attachment-actions";
import { putFileToSignedUrl } from "@/lib/storage/direct-upload-client";
import { buildInquiryAttachmentLabels } from "./labels";
import { InquiryAttachmentUploader } from "./InquiryAttachmentUploader";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/inquiry-attachment-actions", () => ({
  requestInquiryAttachmentUpload: vi.fn(),
  confirmInquiryAttachment: vi.fn(),
}));
vi.mock("@/lib/storage/direct-upload-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/direct-upload-client")>()),
  putFileToSignedUrl: vi.fn(),
}));

// Spec 0085: trzy kroki na plik (prośba, PUT prosto do R2, potwierdzenie). `mockedUpload` to
// potwierdzenie, bo to ono daje wynik widoczny dla użytkownika.
const mockedRequest = vi.mocked(requestInquiryAttachmentUpload);
const mockedPut = vi.mocked(putFileToSignedUrl);
const mockedUpload = vi.mocked(confirmInquiryAttachment);
const labels = buildInquiryAttachmentLabels((key) => (pl.InquiryAttachments as Record<string, unknown>)[key]);

function pdf(name: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function renderUploader(props: Partial<React.ComponentProps<typeof InquiryAttachmentUploader>> = {}) {
  return render(
    <InquiryAttachmentUploader kind="request" inquiryId="req-1" labels={labels} uploadToken="token-1" {...props} />,
  );
}

beforeEach(() => {
  mockedRequest.mockReset().mockResolvedValue({ ok: true, intentId: "intent-1", uploadUrl: "https://r2.example.test/put", expiresAt: "x" });
  mockedPut.mockReset().mockResolvedValue({ ok: true });
  mockedUpload.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-28, AC-29, AC-32: kreator plików po zapisie zapytania.
describe("InquiryAttachmentUploader", () => {
  it("keeps file selection disabled until the no contact data box is ticked, and shows the warning", async () => {
    const user = userEvent.setup();
    renderUploader();

    expect(screen.getByText(/Nie dołączaj plików z Twoimi danymi kontaktowymi/)).toBeInTheDocument();
    expect(screen.getByTestId("inquiry-attachment-input")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Wybierz pliki/ })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    expect(screen.getByTestId("inquiry-attachment-input")).toBeEnabled();
  });

  it("uploads each file as its own call, with the token and the confirmation", async () => {
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "a" });
    const user = userEvent.setup();
    renderUploader();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf"), pdf("plan.pdf")] } });

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(2));
    expect(mockedRequest.mock.calls[0]).toEqual([
      "request",
      "req-1",
      { filename: "rzut.pdf", mimeType: "application/pdf", sizeBytes: 100 },
      { uploadToken: "token-1", confirmedNoContactData: true },
    ]);
    expect(mockedRequest.mock.calls[1][2]).toMatchObject({ filename: "plan.pdf" });
    expect(mockedPut).toHaveBeenCalledTimes(2);
    expect(mockedUpload).toHaveBeenCalledWith("intent-1", { uploadToken: "token-1" });
    expect(await screen.findAllByText(labels.statusDone)).toHaveLength(2);
  });

  it("shows a per file error with retry; one failed file does not stop the others", async () => {
    mockedRequest.mockResolvedValueOnce({ ok: false, errorCode: "invalid_type", error: "x" });
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "b" });
    const user = userEvent.setup();
    renderUploader();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("zly.pdf"), pdf("dobry.pdf")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.invalid_type);
    expect(await screen.findByText(labels.statusDone)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: labels.retry }));
    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(3));
    expect(await screen.findAllByText(labels.statusDone)).toHaveLength(2);
  });

  it("tells a guest whose token stopped working to add files after signing in", async () => {
    mockedRequest.mockResolvedValue({ ok: false, errorCode: "no_access", error: "x" });
    const user = userEvent.setup();
    renderUploader();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.tokenExpired);
  });

  it("rejects a file over 20 MB locally without calling the server", async () => {
    const user = userEvent.setup();
    renderUploader();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("duzy.pdf", 21 * 1024 * 1024)] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.too_large);
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("staff upload needs no confirmation box, sends no confirmation and refreshes the page", async () => {
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "a" });
    renderUploader({ staff: true, uploadToken: undefined, refreshOnUploaded: true });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(labels.staffWarning)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf")] } });

    await waitFor(() => expect(mockedRequest).toHaveBeenCalledTimes(1));
    expect(mockedRequest.mock.calls[0][3]).toEqual({ uploadToken: undefined, confirmedNoContactData: undefined });
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("calls onUploaded after every successful file", async () => {
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "a" });
    const onUploaded = vi.fn();
    renderUploader({ staff: true, onUploaded });

    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("a.pdf")] } });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    within(document.body).getByText(labels.statusDone);
  });

  it("separates a failed upload to R2 from a refused address, and lets the file be retried", async () => {
    mockedPut.mockResolvedValueOnce({ ok: false, reason: "upload_failed" });
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "a" });
    const user = userEvent.setup();
    renderUploader({ staff: true });

    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.upload_failed);
    expect(mockedUpload).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: labels.retry }));
    expect(await screen.findByText(labels.statusDone)).toBeInTheDocument();
  });

  it("retries the confirmation up to twice on a transient error, then reports it", async () => {
    mockedUpload
      .mockResolvedValueOnce({ ok: false, errorCode: "generic", error: "x" })
      .mockResolvedValueOnce({ ok: true, attachmentId: "a" });
    renderUploader({ staff: true });

    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf")] } });
    expect(await screen.findByText(labels.statusDone)).toBeInTheDocument();
    expect(mockedUpload).toHaveBeenCalledTimes(2);
    expect(mockedPut).toHaveBeenCalledTimes(1);
  });
});
