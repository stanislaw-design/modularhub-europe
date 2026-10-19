import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import KlientHomePage from "./page";

// Sekcje, które nie zależą od danych z bazy, są zastąpione znacznikami: test dotyczy
// tego, co strona pokazuje, gdy zapytania padają (spec 0073 AC-8, AC-9).
vi.mock("@/components/klient/Hero", () => ({ Hero: () => <div data-testid="hero" /> }));
vi.mock("@/components/klient/SearchCard", () => ({ SearchCard: () => null }));
vi.mock("@/components/klient/FeaturedProjectShowcase", () => ({ FeaturedProjectShowcase: () => null }));
vi.mock("@/components/klient/ComplianceEngineShowcase", () => ({ ComplianceEngineShowcase: () => null }));
vi.mock("@/components/klient/HowItWorksExplainer", () => ({ HowItWorksExplainer: () => null }));
vi.mock("@/components/klient/ClosingCta", () => ({ ClosingCta: () => null }));
vi.mock("@/components/klient/Faq", () => ({ Faq: () => <div data-testid="faq" /> }));
vi.mock("@/components/klient/FloatingSearchButton", () => ({ FloatingSearchButton: () => null }));
vi.mock("@/components/klient/HomeStructuredData", () => ({ HomeStructuredData: () => null }));
vi.mock("@/components/klient/ProducerCard", () => ({
  ProducerCard: ({ producer }: { producer: { name: string } }) => <div>{producer.name}</div>,
}));

const getProjectsMock = vi.fn();
const getProducersMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({ getProjects: (...args: unknown[]) => getProjectsMock(...args) }));
vi.mock("@/lib/data/producers", () => ({ getProducers: (...args: unknown[]) => getProducersMock(...args) }));

const captureErrorMock = vi.fn();
vi.mock("@/lib/observability/errors", () => ({ captureError: (...args: unknown[]) => captureErrorMock(...args) }));

async function renderHome() {
  const element = await KlientHomePage({ params: Promise.resolve({ locale: "pl" }) });
  render(await resolveAsyncTree(element));
}

const featured = (id: string, name: string) => createMockProject({ id, name, featured: true });

beforeEach(() => {
  vi.clearAllMocks();
  getProducersMock.mockResolvedValue([{ id: "pr-1", name: "Producent Testowy" }]);
});

describe("strona główna: odporność na błędy danych (spec 0073)", () => {
  it("renders the rest of the page when the projects query fails and reports it (AC-8)", async () => {
    getProjectsMock.mockRejectedValue(new Error("db down"));
    await renderHome();

    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("faq")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { area: "home", section: "projects" });
  });

  it("hides only the producers section when the producers query fails (AC-8)", async () => {
    getProjectsMock.mockResolvedValue([featured("a", "Dom A"), featured("b", "Dom B")]);
    getProducersMock.mockRejectedValue(new Error("db down"));
    await renderHome();

    expect(screen.getAllByRole("heading", { name: "Dom A" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Producent Testowy")).not.toBeInTheDocument();
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { area: "home", section: "producers" });
  });

  it("renders no producers section for an empty list (AC-9)", async () => {
    getProjectsMock.mockResolvedValue([featured("a", "Dom A"), featured("b", "Dom B")]);
    getProducersMock.mockResolvedValue([]);
    await renderHome();

    expect(screen.queryByText("Producent Testowy")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).every((h) => h.textContent?.trim())).toBe(true);
  });

  it("shows no popular homes heading and no compare table when nothing is featured (AC-9)", async () => {
    getProjectsMock.mockResolvedValue([]);
    getProducersMock.mockResolvedValue([]);
    await renderHome();

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows no compare table with a single featured project (AC-9)", async () => {
    getProjectsMock.mockResolvedValue([featured("a", "Dom A")]);
    await renderHome();

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the compare table with two featured projects (AC-9)", async () => {
    getProjectsMock.mockResolvedValue([featured("a", "Dom A"), featured("b", "Dom B")]);
    await renderHome();

    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
