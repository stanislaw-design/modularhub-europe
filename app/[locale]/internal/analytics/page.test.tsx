import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

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

const emailStatsMocks = vi.hoisted(() => ({
  getEmailStatsByType: vi.fn(),
  getEmailStatsByProducer: vi.fn(),
  getEmailStatsTotals: vi.fn(),
}));
vi.mock("@/lib/analytics/email-stats", () => emailStatsMocks);

const queriesMocks = vi.hoisted(() => ({
  getProducerNamesByIds: vi.fn(),
  getProductNamesByIds: vi.fn(),
}));
vi.mock("@/lib/db/queries", () => queriesMocks);

const posthogMocks = vi.hoisted(() => ({
  getTrafficSummary: vi.fn(),
  getPagesReport: vi.fn(),
  getProducerTraffic: vi.fn(),
  getProducerTrafficDetail: vi.fn(),
}));
vi.mock("@/lib/observability/posthog-metrics", () => posthogMocks);

import InternalAnalyticsPage from "./page";

const PRODUCER_ID = "6f1c3a52-0d7e-4c55-9b8e-1f2a3b4c5d6e";
const adminSession = { user: { role: "admin" } } as Session;

async function renderPage(search: { range?: string; view?: string; producer?: string } = {}) {
  const element = await InternalAnalyticsPage({ params: Promise.resolve({ locale: "pl" }), searchParams: Promise.resolve(search) });
  render(await resolveAsyncTree(element));
}

const row = (key: string, sent: number) => ({ key, sent, uniqueRequests: 1, delivered: sent, bounced: 0, complained: 0, trackedSent: 1, uniqueClicks: 1, humanOpens: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(adminSession);
  emailStatsMocks.getEmailStatsTotals.mockResolvedValue({ ok: true, data: { sent: 5, uniqueRequests: 3, delivered: 4, bounced: 1, complained: 0, trackedSent: 2, uniqueClicks: 1, humanOpens: 2 } });
  emailStatsMocks.getEmailStatsByType.mockResolvedValue({ ok: true, data: [row("large_order_producer_new_request", 5)] });
  emailStatsMocks.getEmailStatsByProducer.mockResolvedValue({ ok: true, data: [row(PRODUCER_ID, 5)] });
  queriesMocks.getProducerNamesByIds.mockResolvedValue(new Map([[PRODUCER_ID, "Producent Testowy"]]));
  queriesMocks.getProductNamesByIds.mockResolvedValue(new Map([["prod-1", "Domek Testowy"]]));
  posthogMocks.getProducerTraffic.mockResolvedValue({ ok: true, data: [{ producerId: PRODUCER_ID, producerPageViews: 2, productViews: 8, visitors: 6 }] });
  posthogMocks.getProducerTrafficDetail.mockResolvedValue({
    ok: true,
    data: {
      producerPageViews: 2,
      productViews: 8,
      visitors: 6,
      daily: [{ day: "2026-11-01", visitors: 3, pageviews: 5 }],
      products: [{ productId: "prod-1", views: 8 }],
    },
  });
});

// Spec 0079 AC-7, AC-9, AC-10, AC-11: ta sama inline bramka sesji co inne ekrany /internal.
describe("InternalAnalyticsPage: access", () => {
  it("redirects to login with the callbackUrl when there is no session", async () => {
    authMock.mockResolvedValue(null);
    await expect(renderPage({ view: "emails" })).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/login?callbackUrl=%2Fpl%2Finternal%2Fanalytics");
    expect(emailStatsMocks.getEmailStatsTotals).not.toHaveBeenCalled();
  });

  it("redirects a signed in user who is not an admin and reads no data", async () => {
    authMock.mockResolvedValue({ user: { role: "producer" } } as Session);
    await expect(renderPage({ view: "emails" })).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl");
    expect(emailStatsMocks.getEmailStatsTotals).not.toHaveBeenCalled();
  });
});

describe("InternalAnalyticsPage: Odwiedziny view (AC-7)", () => {
  it("shows named tiles with the change against the previous period", async () => {
    const point = (day: string, visitors: number) => ({ day, visitors, pageviews: visitors * 2 });
    posthogMocks.getTrafficSummary.mockResolvedValue({
      ok: true,
      data: {
        visitors: 118,
        sessions: 150,
        pageviews: 400,
        avgSessionSeconds: 90,
        previous: { visitors: 100, sessions: 200, pageviews: 400, avgSessionSeconds: 90 },
        daily: [point("2026-11-01", 3)],
        previousDaily: [point("2026-10-02", 2)],
      },
    });

    await renderPage({ view: "traffic", range: "30" });

    expect(screen.getByRole("heading", { level: 1, name: "Odwiedziny" })).toBeInTheDocument();
    expect(screen.getByText("Unikalni odwiedzający")).toBeInTheDocument();
    expect(screen.getByText("Czas jednej wizyty")).toBeInTheDocument();
    expect(screen.getByText(/\+18%/)).toBeInTheDocument();
    expect(screen.getByText(/-25%/)).toBeInTheDocument();
    expect(screen.getAllByText("vs poprzednie 30 dni").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Obejrzane strony" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("InternalAnalyticsPage: Maile view (AC-10, AC-11)", () => {
  it("shows the Maile tab, the totals and the per type and per producer tables", async () => {
    await renderPage({ view: "emails", range: "7" });

    expect(screen.getByRole("heading", { level: 1, name: "Maile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "7 dni" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Nowe zapytanie")).toBeInTheDocument();
    const producerLink = screen.getByRole("link", { name: "Producent Testowy" });
    expect(producerLink).toHaveAttribute("href", `/pl/internal/analytics?view=producers&range=7&producer=${PRODUCER_ID}`);
    expect(emailStatsMocks.getEmailStatsTotals).toHaveBeenCalledWith(7);
    expect(screen.getAllByText("Unikalne zapytania").length).toBeGreaterThan(0);
  });

  it("shows tracked share, unique clicks and human opens with the sample caveat", async () => {
    await renderPage({ view: "emails" });

    expect(screen.getByText(/Śledzone” to maile wysłane do odbiorców, którzy dobrowolnie zgodzili się na pomiar/)).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Unikalne kliknięcia" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader", { name: "Otwarcia (ludzkie)" }).length).toBeGreaterThan(0);
  });

  it("still renders the mail numbers when PostHog is down", async () => {
    posthogMocks.getTrafficSummary.mockResolvedValue({ ok: false });
    posthogMocks.getPagesReport.mockResolvedValue({ ok: false });
    posthogMocks.getProducerTraffic.mockResolvedValue({ ok: false });

    await renderPage({ view: "emails" });

    expect(screen.getByText("Producent Testowy")).toBeInTheDocument();
    expect(screen.queryByText(/PostHog nie odpowiada/)).toBeNull();
  });

  it("says the database is unavailable when every mail query fails", async () => {
    emailStatsMocks.getEmailStatsTotals.mockResolvedValue({ ok: false });
    emailStatsMocks.getEmailStatsByType.mockResolvedValue({ ok: false });
    emailStatsMocks.getEmailStatsByProducer.mockResolvedValue({ ok: false });

    await renderPage({ view: "emails" });

    expect(screen.getByText(/Niedostępne \(baza danych nie odpowiada\)/)).toBeInTheDocument();
  });

  it("shows an empty state when nothing was sent", async () => {
    emailStatsMocks.getEmailStatsByType.mockResolvedValue({ ok: true, data: [] });
    emailStatsMocks.getEmailStatsByProducer.mockResolvedValue({ ok: true, data: [] });

    await renderPage({ view: "emails" });

    expect(screen.getAllByText("Brak wysłanych maili w tym okresie.")).toHaveLength(2);
  });
});

describe("InternalAnalyticsPage: producer detail (AC-9)", () => {
  it("shows traffic, products by name and the producer's own mail stats", async () => {
    await renderPage({ view: "producers", producer: PRODUCER_ID, range: "90" });

    expect(posthogMocks.getProducerTrafficDetail).toHaveBeenCalledWith(PRODUCER_ID, 90);
    expect(emailStatsMocks.getEmailStatsByType).toHaveBeenCalledWith(90, PRODUCER_ID);
    expect(screen.getByText("Producent Testowy")).toBeInTheDocument();
    expect(screen.getByText("Domek Testowy")).toBeInTheDocument();
    expect(screen.getByText("Nowe zapytanie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wróć do rankingu producentów/ })).toHaveAttribute(
      "href",
      "/pl/internal/analytics?view=producers&range=90",
    );
  });

  it("shows traffic as unavailable but keeps the mail stats when PostHog is down (AC-11)", async () => {
    posthogMocks.getProducerTrafficDetail.mockResolvedValue({ ok: false });

    await renderPage({ view: "producers", producer: PRODUCER_ID });

    expect(screen.getByText(/Niedostępne \(PostHog nie odpowiada\)/)).toBeInTheDocument();
    expect(screen.getByText("Nowe zapytanie")).toBeInTheDocument();
    expect(queriesMocks.getProductNamesByIds).not.toHaveBeenCalled();
  });

  it("ignores a producer parameter that is not a uuid and shows the ranking", async () => {
    await renderPage({ view: "producers", producer: "nie-uuid" });

    expect(posthogMocks.getProducerTrafficDetail).not.toHaveBeenCalled();
    expect(posthogMocks.getProducerTraffic).toHaveBeenCalled();
    expect(screen.getByText("Ranking producentów po wyświetleniach")).toBeInTheDocument();
  });

  it("links each ranking row to that producer's detail", async () => {
    await renderPage({ view: "producers", range: "30" });

    expect(screen.getByRole("link", { name: "Producent Testowy" })).toHaveAttribute(
      "href",
      `/pl/internal/analytics?view=producers&range=30&producer=${PRODUCER_ID}`,
    );
  });
});
