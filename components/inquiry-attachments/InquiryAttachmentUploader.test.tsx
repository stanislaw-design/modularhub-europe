import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pl from "@/messages/pl.json";
import { uploadInquiryAttachment } from "@/lib/inquiry-attachment-actions";
import { buildInquiryAttachmentLabels } from "./labels";
import { InquiryAttachmentUploader } from "./InquiryAttachmentUploader";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/inquiry-attachment-actions", () => ({ uploadInquiryAttachment: vi.fn() }));

const mockedUpload = vi.mocked(uploadInquiryAttachment);
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
    expect(mockedUpload.mock.calls[0]).toEqual(["request", "req-1", expect.any(File), { uploadToken: "token-1", confirmedNoContactData: true }]);
    expect((mockedUpload.mock.calls[0][2] as File).name).toBe("rzut.pdf");
    expect((mockedUpload.mock.calls[1][2] as File).name).toBe("plan.pdf");
    expect(await screen.findAllByText(labels.statusDone)).toHaveLength(2);
  });

  it("shows a per file error with retry; one failed file does not stop the others", async () => {
    mockedUpload
      .mockResolvedValueOnce({ ok: false, errorCode: "invalid_type", error: "x" })
      .mockResolvedValueOnce({ ok: true, attachmentId: "b" })
      .mockResolvedValueOnce({ ok: true, attachmentId: "c" });
    const user = userEvent.setup();
    renderUploader();

    await user.click(screen.getByRole("checkbox", { name: labels.consentLabel }));
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("zly.pdf"), pdf("dobry.pdf")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.invalid_type);
    expect(await screen.findByText(labels.statusDone)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: labels.retry }));
    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(3));
    expect(await screen.findAllByText(labels.statusDone)).toHaveLength(2);
  });

  it("tells a guest whose token stopped working to add files after signing in", async () => {
    mockedUpload.mockResolvedValue({ ok: false, errorCode: "no_access", error: "x" });
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
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("staff upload needs no confirmation box, sends no confirmation and refreshes the page", async () => {
    mockedUpload.mockResolvedValue({ ok: true, attachmentId: "a" });
    renderUploader({ staff: true, uploadToken: undefined, refreshOnUploaded: true });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(labels.staffWarning)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("inquiry-attachment-input"), { target: { files: [pdf("rzut.pdf")] } });

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledTimes(1));
    expect(mockedUpload.mock.calls[0][3]).toEqual({ uploadToken: undefined, confirmedNoContactData: undefined });
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
});
