import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

vi.mock("@/lib/panel-session", () => ({
  requirePanelProducerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

class NotFoundSignal extends Error {}
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: () => {
    throw new NotFoundSignal("not found");
  },
}));

const listAttachmentsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/inquiry-attachment-actions", () => ({
  listInquiryAttachments: (...args: unknown[]) => listAttachmentsMock(...args),
}));
vi.mock("@/components/inquiry-attachments/InquiryAttachmentsPanel", () => ({
  InquiryAttachmentsPanel: (props: { items: unknown[]; changedAfterQuote?: boolean }) => (
    <div data-testid="attachments-panel" data-count={props.items.length} data-changed={String(Boolean(props.changedAfterQuote))} />
  ),
}));

vi.mock("@/components/producent/QuoteFormModal", () => ({
  QuoteFormModal: (props: { bulkProductInquiryId?: string; projectRequestId?: string; isRevision: boolean }) => (
    <div data-testid="quote-form" data-inquiry={props.bulkProductInquiryId} data-request={props.projectRequestId ?? ""} data-revision={String(props.isRevision)} />
  ),
}));

const getProducerIdForUserMock = vi.hoisted(() => vi.fn());
const getDetailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({
  getProducerIdForUser: (...args: unknown[]) => getProducerIdForUserMock(...args),
  getProductInquiryForProducerDetail: (...args: unknown[]) => getDetailMock(...args),
}));

import ProducerProductInquiryDetailPage from "./page";

const id = "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10";

const detail = {
  id,
  productId: "p-1",
  productName: "Dom Test 120",
  countryCode: "DE",
  countryName: "Niemcy",
  unitCount: 7,
  startWindowFrom: null,
  startWindowTo: null,
  deliveryWindowFrom: null,
  deliveryWindowTo: null,
  note: null,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
  createdAt: new Date("2026-10-09T10:00:00Z"),
  ownQuoteStatus: null,
  acceptingQuotes: true,
  ownQuotePublished: false,
  filesChangedAfterOwnQuote: false,
};

async function renderPage() {
  const element = await ProducerProductInquiryDetailPage({ params: Promise.resolve({ locale: "pl", id }) });
  render(await resolveAsyncTree(element));
}

beforeEach(() => {
  getProducerIdForUserMock.mockReset().mockResolvedValue("producer-1");
  getDetailMock.mockReset().mockResolvedValue(detail);
  listAttachmentsMock.mockReset().mockResolvedValue([]);
});

// Spec 0070 AC-12, AC-14, AC-21, AC-22.
describe("ProducerProductInquiryDetailPage", () => {
  it("returns not found when the inquiry is not the producer's (or does not exist)", async () => {
    getDetailMock.mockResolvedValue(null);
    await expect(renderPage()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getDetailMock).toHaveBeenCalledWith(id, "producer-1");
  });

  it("returns not found for a user without a producer account", async () => {
    getProducerIdForUserMock.mockResolvedValue(null);
    await expect(renderPage()).rejects.toBeInstanceOf(NotFoundSignal);
    expect(getDetailMock).not.toHaveBeenCalled();
  });

  it("shows the quote form wired to the product inquiry while quotes are accepted", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Dom Test 120" })).toBeInTheDocument();
    const form = screen.getByTestId("quote-form");
    expect(form.dataset.inquiry).toBe(id);
    expect(form.dataset.request).toBe("");
    expect(form.dataset.revision).toBe("false");
  });

  it("marks the form as a revision when the producer already quoted", async () => {
    getDetailMock.mockResolvedValue({ ...detail, ownQuoteStatus: "active" });
    await renderPage();
    expect(screen.getByTestId("quote-form").dataset.revision).toBe("true");
  });

  it("hides the form and explains why after the deadline or a client choice", async () => {
    getDetailMock.mockResolvedValue({ ...detail, acceptingQuotes: false });
    await renderPage();
    expect(screen.queryByTestId("quote-form")).not.toBeInTheDocument();
    expect(screen.getByText(/Termin składania ofert minął/)).toBeInTheDocument();
  });

  it("hides the form while the producer's own quote is published to the client", async () => {
    getDetailMock.mockResolvedValue({ ...detail, ownQuoteStatus: "active", ownQuotePublished: true });
    await renderPage();
    expect(screen.queryByTestId("quote-form")).not.toBeInTheDocument();
    expect(screen.getByText(/Twoja oferta jest już opublikowana klientowi/)).toBeInTheDocument();
  });

  // Spec 0070 AC-31, AC-33: pliki inwestora i znacznik zmiany po złożeniu oferty.
  it("shows the investor files section only when there are files or a change marker", async () => {
    await renderPage();
    expect(screen.queryByTestId("attachments-panel")).not.toBeInTheDocument();
  });

  it("lists the investor files read from the product inquiry", async () => {
    listAttachmentsMock.mockResolvedValue([{ id: "f1" }, { id: "f2" }]);
    await renderPage();
    expect(listAttachmentsMock).toHaveBeenCalledWith("product", id);
    expect(screen.getByTestId("attachments-panel").dataset.count).toBe("2");
    expect(screen.getByTestId("attachments-panel").dataset.changed).toBe("false");
  });

  it("shows the changed after offer marker even when every file was removed", async () => {
    getDetailMock.mockResolvedValue({ ...detail, ownQuoteStatus: "active", filesChangedAfterOwnQuote: true });
    await renderPage();
    expect(screen.getByTestId("attachments-panel").dataset.changed).toBe("true");
  });

  it("hides the form once the producer's quote is accepted", async () => {
    getDetailMock.mockResolvedValue({ ...detail, ownQuoteStatus: "accepted", acceptingQuotes: false });
    await renderPage();
    expect(screen.queryByTestId("quote-form")).not.toBeInTheDocument();
    expect(screen.getByText("Zaakceptowana")).toBeInTheDocument();
  });
});
