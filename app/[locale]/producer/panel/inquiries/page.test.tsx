import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

vi.mock("@/lib/panel-session", () => ({
  requirePanelProducerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const getProducerIdForUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({
  getProducerIdForUser: (...args: unknown[]) => getProducerIdForUserMock(...args),
}));

const getMergedMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/producer-inquiry-list", async () => {
  const actual = await vi.importActual<typeof import("@/lib/producer-inquiry-list")>("@/lib/producer-inquiry-list");
  return { ...actual, getMergedInquiriesForProducer: (...args: unknown[]) => getMergedMock(...args) };
});

import ProducerPanelZapytaniaPage from "./page";

async function renderPage(status?: string) {
  const element = await ProducerPanelZapytaniaPage({
    params: Promise.resolve({ locale: "pl" }),
    searchParams: Promise.resolve({ status }),
  });
  render(await resolveAsyncTree(element));
}

const row = (overrides: Record<string, unknown>) => ({
  id: "a",
  source: "shortlist",
  title: "Dom Test 120",
  countryName: "Niemcy",
  status: "needs-offer",
  createdAt: new Date(),
  href: "/pl/producer/panel/inquiries/a",
  unreadDecision: false,
  ...overrides,
});

beforeEach(() => {
  getProducerIdForUserMock.mockReset().mockResolvedValue("producer-1");
  getMergedMock.mockReset().mockResolvedValue([]);
});

// Spec 0074 AC-7.
describe("ProducerPanelZapytaniaPage", () => {
  it("shows the empty state without any inquiries", async () => {
    await renderPage();
    expect(screen.getByText("Nie masz jeszcze żadnych zapytań od klientów.")).toBeInTheDocument();
  });

  it("defaults to needs-offer and links each row to its own detail", async () => {
    getMergedMock.mockResolvedValue([
      row({}),
      row({ id: "b", source: "product", title: "Dom Bulk", status: "offered", href: "/pl/producer/panel/product-inquiries/b" }),
    ]);
    await renderPage();
    expect(screen.getByRole("link", { name: "Dom Test 120" }).getAttribute("href")).toBe("/pl/producer/panel/inquiries/a");
    expect(screen.queryByRole("link", { name: "Dom Bulk" })).not.toBeInTheDocument();
  });

  it("falls back to all when nothing needs an offer", async () => {
    getMergedMock.mockResolvedValue([
      row({ id: "b", source: "product", title: "Dom Bulk", status: "offered", href: "/pl/producer/panel/product-inquiries/b" }),
    ]);
    await renderPage();
    expect(screen.getByRole("link", { name: "Dom Bulk" }).getAttribute("href")).toBe("/pl/producer/panel/product-inquiries/b");
  });

  it("filters by the status query and marks the active filter", async () => {
    getMergedMock.mockResolvedValue([
      row({}),
      row({ id: "b", title: "Dom Zamknięty", status: "closed", href: "/pl/producer/panel/inquiries/b" }),
    ]);
    await renderPage("closed");
    expect(screen.getByRole("link", { name: "Dom Zamknięty" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dom Test 120" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zamknięte/ })).toHaveAttribute("aria-current", "true");
  });

  it("skips the query without a producer", async () => {
    getProducerIdForUserMock.mockResolvedValue(null);
    await renderPage();
    expect(getMergedMock).not.toHaveBeenCalled();
  });
});
