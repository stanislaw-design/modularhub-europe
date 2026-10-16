import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pl from "@/messages/pl.json";
import {
  deleteInquiryAttachment,
  getInquiryAttachmentUrl,
  hideInquiryAttachment,
  unhideInquiryAttachment,
  type InquiryAttachmentItem,
} from "@/lib/inquiry-attachment-actions";
import { buildInquiryAttachmentLabels } from "./labels";
import { InquiryAttachmentList } from "./InquiryAttachmentList";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/inquiry-attachment-actions", () => ({
  deleteInquiryAttachment: vi.fn(),
  getInquiryAttachmentUrl: vi.fn(),
  hideInquiryAttachment: vi.fn(),
  unhideInquiryAttachment: vi.fn(),
}));

const mockedDelete = vi.mocked(deleteInquiryAttachment);
const mockedUrl = vi.mocked(getInquiryAttachmentUrl);
const mockedHide = vi.mocked(hideInquiryAttachment);
const mockedUnhide = vi.mocked(unhideInquiryAttachment);
const labels = buildInquiryAttachmentLabels((key) => (pl.InquiryAttachments as Record<string, unknown>)[key]);

function item(overrides: Partial<InquiryAttachmentItem> = {}): InquiryAttachmentItem {
  return {
    id: "f1",
    filename: "rzut.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    createdAt: "2026-10-14T10:00:00.000Z",
    hidden: false,
    hiddenReason: null,
    deleted: false,
    uploadedByKind: null,
    ...overrides,
  };
}

function renderList(props: Partial<React.ComponentProps<typeof InquiryAttachmentList>> = {}) {
  return render(<InquiryAttachmentList items={[item()]} viewer="client" labels={labels} locale="pl" {...props} />);
}

beforeEach(() => {
  mockedDelete.mockReset();
  mockedUrl.mockReset();
  mockedHide.mockReset();
  mockedUnhide.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-30 do AC-33: lista plików zapytania.
describe("InquiryAttachmentList", () => {
  it("shows the empty state", () => {
    renderList({ items: [] });
    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  it("opens a file only through the signed link action", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    mockedUrl.mockResolvedValue({ ok: true, url: "https://signed.example.test/x" });
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: labels.download }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://signed.example.test/x"));
    expect(mockedUrl).toHaveBeenCalledWith("f1");
    vi.unstubAllGlobals();
  });

  it("shows a download error when the link action refuses", async () => {
    mockedUrl.mockResolvedValue({ ok: false, errorCode: "not_found" });
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: labels.download }));

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.downloadError);
  });

  it("offers remove only when changes are allowed, and refreshes after removing", async () => {
    mockedDelete.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const { rerender } = renderList();
    expect(screen.queryByRole("button", { name: labels.remove })).not.toBeInTheDocument();

    rerender(<InquiryAttachmentList items={[item()]} viewer="client" labels={labels} locale="pl" canRemove />);
    await user.click(screen.getByRole("button", { name: labels.remove }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith("f1"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("shows the translated error when removing is refused", async () => {
    mockedDelete.mockResolvedValue({ ok: false, errorCode: "closed" });
    const user = userEvent.setup();
    renderList({ canRemove: true });

    await user.click(screen.getByRole("button", { name: labels.remove }));

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.closed);
  });

  it("marks a file hidden by ModularHub for the client, with the reason", () => {
    renderList({ items: [item({ hidden: true, hiddenReason: "telefon w stopce" })] });

    expect(screen.getByText(labels.hiddenBadge)).toBeInTheDocument();
    expect(screen.getByText("Powód: telefon w stopce")).toBeInTheDocument();
  });

  it("does not offer moderation to the client or the producer", () => {
    renderList({ canRemove: true });
    expect(screen.queryByRole("button", { name: labels.hide })).not.toBeInTheDocument();
  });

  it("lets the admin hide a file only with a reason", async () => {
    mockedHide.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderList({ viewer: "admin", canModerate: true, items: [item({ uploadedByKind: "guest" })] });

    expect(screen.getByText(labels.uploadedBy.guest)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: labels.hide }));
    await user.click(screen.getByRole("button", { name: labels.hideConfirm }));
    expect(await screen.findByRole("alert")).toHaveTextContent(labels.errors.reason_required);
    expect(mockedHide).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(labels.hideReasonLabel), "adres e mail w stopce");
    await user.click(screen.getByRole("button", { name: labels.hideConfirm }));

    await waitFor(() => expect(mockedHide).toHaveBeenCalledWith("f1", "adres e mail w stopce"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("lets the admin restore a hidden file", async () => {
    mockedUnhide.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderList({ viewer: "admin", canModerate: true, items: [item({ hidden: true, hiddenReason: "powód" })] });

    await user.click(screen.getByRole("button", { name: labels.unhide }));

    await waitFor(() => expect(mockedUnhide).toHaveBeenCalledWith("f1"));
  });

  it("shows deleted files to the admin as removed, without actions", () => {
    renderList({ viewer: "admin", canModerate: true, canRemove: true, items: [item({ deleted: true })] });

    expect(screen.getByText(labels.deletedBadge)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: labels.remove })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: labels.hide })).not.toBeInTheDocument();
  });

  it("offers replace next to remove when the panel supports it", async () => {
    const onReplace = vi.fn();
    const user = userEvent.setup();
    renderList({ canRemove: true, onReplace });

    await user.click(screen.getByRole("button", { name: labels.replace }));

    expect(onReplace).toHaveBeenCalledWith("f1");
  });
});
