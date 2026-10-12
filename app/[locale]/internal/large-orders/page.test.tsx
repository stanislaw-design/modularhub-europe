import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Ten sam układ mocków co internal/products/page.test.tsx: @/auth i redirect()
// na granicy, zapytania do bazy zamockowane.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

class RedirectSignal extends Error {}
const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
);
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, redirect: (url: string) => redirectMock(url) };
});

const getLargeOrdersForAdminMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({
  getLargeOrdersForAdmin: (...args: unknown[]) => getLargeOrdersForAdminMock(...args),
  LARGE_ORDER_STATUSES: ["open", "quoted", "published", "accepted", "closed"],
  LARGE_ORDERS_PAGE_SIZE: 25,
}));

import InternalLargeOrdersPage from "./page";

async function renderPage(searchParams: Record<string, string> = {}) {
  const element = await InternalLargeOrdersPage({
    params: Promise.resolve({ locale: "pl" }),
    searchParams: Promise.resolve(searchParams),
  });
  render(await resolveAsyncTree(element));
}

const item = {
  kind: "request",
  id: "5f1c7a52-0a37-4d5b-8f0b-2d3c1a9e6b10",
  countryCode: "DE",
  unitCount: 12,
  deadlineAt: new Date("2026-10-23T10:00:00Z"),
  status: "quoted",
  quoteCount: 2,
  pendingPublicationCount: 1,
  createdAt: new Date("2026-10-09T10:00:00Z"),
  investorName: "Bau GmbH",
  investorEmail: "kontakt@bau.example.test",
};

beforeEach(() => {
  redirectMock.mockClear();
  getLargeOrdersForAdminMock.mockReset().mockResolvedValue({ items: [], totalCount: 0 });
});

// Spec 0070 AC-1.
describe("InternalLargeOrdersPage", () => {
  it("redirects to login when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl/login?callbackUrl=%2Fpl%2Finternal%2Flarge-orders");
  });

  it.each(["client", "producer"] as const)("redirects a %s to /pl and never reads the list", async (role) => {
    authMock.mockResolvedValue({ user: { id: "u1", role } } as never);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl");
    expect(getLargeOrdersForAdminMock).not.toHaveBeenCalled();
  });

  it("shows an empty state when there are no requests", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Duże zamówienia" })).toBeTruthy();
    expect(screen.getByText(/Brak zapytań/)).toBeTruthy();
  });

  it("leads each row with the investor name, then kind and status pills, homes and deadline", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);
    getLargeOrdersForAdminMock.mockResolvedValue({ items: [item], totalCount: 1 });

    await renderPage();

    const link = screen.getByRole("link", { name: "Bau GmbH" });
    expect(link.getAttribute("href")).toBe(`/pl/internal/large-orders/${item.id}?kind=request`);
    const row = link.closest("tr") as HTMLElement;
    const cells = Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent);
    expect(cells[0]).toContain("kontakt@bau.example.test");
    expect(cells[1]).toBe("Zapytanie wolne");
    expect(cells[2]).toBe("Są oferty");
    expect(cells[3]).toBe("12");
    expect(cells[4]).toContain("23 paź 2026");
    expect(cells[6]).toContain("2 (1 do publikacji)");
    const button = screen.getByRole("link", { name: "Szczegóły: Bau GmbH" });
    expect(button.getAttribute("href")).toBe(`/pl/internal/large-orders/${item.id}?kind=request`);
    expect(cells[7]).toBe("Szczegóły");
  });

  it("shows only the email once when it is also the investor name", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);
    getLargeOrdersForAdminMock.mockResolvedValue({
      items: [{ ...item, investorName: "a@b.example.test", investorEmail: "a@b.example.test" }],
      totalCount: 1,
    });

    await renderPage();

    expect(screen.getAllByText("a@b.example.test")).toHaveLength(1);
  });

  it("passes the status and kind filters and the page number to the query", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);

    await renderPage({ status: "published", kind: "product", page: "3" });

    expect(getLargeOrdersForAdminMock).toHaveBeenCalledWith({ status: "published", kind: "product", page: 3 });
  });

  it("ignores an unknown status value instead of querying with it", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);

    await renderPage({ status: "bogus" });

    expect(getLargeOrdersForAdminMock).toHaveBeenCalledWith({ status: undefined, kind: undefined, page: 1 });
  });
});
