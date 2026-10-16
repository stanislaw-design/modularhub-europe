import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

vi.mock("@/lib/panel-session", () => ({
  requirePanelProducerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const getProducerIdForUserMock = vi.hoisted(() => vi.fn());
const getProductInquiriesForProducerMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({
  getProducerIdForUser: (...args: unknown[]) => getProducerIdForUserMock(...args),
  getProductInquiriesForProducer: (...args: unknown[]) => getProductInquiriesForProducerMock(...args),
}));

import ProducerProductInquiriesPage from "./page";

async function renderPage() {
  const element = await ProducerProductInquiriesPage({ params: Promise.resolve({ locale: "pl" }) });
  render(await resolveAsyncTree(element));
}

const inquiry = {
  id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
  productId: "p-1",
  productName: "Dom Test 120",
  countryCode: "DE",
  countryName: "Niemcy",
  unitCount: 7,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
  createdAt: new Date("2026-10-09T10:00:00Z"),
  ownQuoteStatus: null,
};

beforeEach(() => {
  getProducerIdForUserMock.mockReset().mockResolvedValue("producer-1");
  getProductInquiriesForProducerMock.mockReset().mockResolvedValue([]);
});

// Spec 0070 AC-21, AC-22.
describe("ProducerProductInquiriesPage", () => {
  it("shows the empty state when the producer has no inquiries", async () => {
    await renderPage();
    expect(screen.getByText("Brak zapytań o Twoje produkty.")).toBeInTheDocument();
  });

  it("lists an inquiry with a link to its detail, the unit count, the deadline and no own quote yet", async () => {
    getProductInquiriesForProducerMock.mockResolvedValue([inquiry]);
    await renderPage();

    const link = screen.getByRole("link", { name: "Dom Test 120" });
    expect(link.getAttribute("href")).toBe(`/pl/producer/panel/product-inquiries/${inquiry.id}`);
    expect(screen.getByText("Niemcy")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Nie złożono")).toBeInTheDocument();
  });

  it("shows the state of the producer's own quote, never the inquiry status", async () => {
    getProductInquiriesForProducerMock.mockResolvedValue([{ ...inquiry, ownQuoteStatus: "active" }]);
    await renderPage();
    expect(screen.getByText("Aktywna")).toBeInTheDocument();
  });

  it("asks only for the signed in producer's own inquiries and skips the query without a producer", async () => {
    getProducerIdForUserMock.mockResolvedValue(null);
    await renderPage();
    expect(getProductInquiriesForProducerMock).not.toHaveBeenCalled();
    expect(screen.getByText("Brak zapytań o Twoje produkty.")).toBeInTheDocument();
  });
});
