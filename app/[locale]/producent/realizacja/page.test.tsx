import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import ProducerRealizacjaPage from "./page";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (path: string) => redirect(path),
}));

function makeProps(searchParams: Record<string, string | string[] | undefined>) {
  return {
    params: Promise.resolve({ locale: "pl" }),
    searchParams: Promise.resolve(searchParams),
  };
}

async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  const element = await ProducerRealizacjaPage(makeProps(searchParams));
  render(await resolveAsyncTree(element));
}

describe("ProducerRealizacjaPage (feature 16)", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to the realizacje list when project is missing", async () => {
    await expect(renderPage({})).rejects.toThrow("NEXT_REDIRECT:/pl/producent/realizacje");
  });

  it("redirects to the realizacje list for an unknown project id", async () => {
    await expect(renderPage({ project: "does-not-exist" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacje"
    );
  });

  it("redirects to the realizacje list when the project has no accepted-offer order yet", async () => {
    await expect(renderPage({ project: "prj-steelhouse-studio-38" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacje"
    );
  });

  it("ignores an array-valued project param and redirects", async () => {
    await expect(renderPage({ project: ["prj-budman-familia-90", "prj-steelhouse-loft-120"] })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacje"
    );
  });

  it("renders the 4-stage axis with no verification button for an order still before odbiór", async () => {
    await renderPage({ project: "prj-budman-familia-90" });

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Budman Familia 90");
    expect(screen.getByText("Produkcja")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Montaż")).toBeInTheDocument();
    expect(screen.getByText("Odbiór")).toBeInTheDocument();
    expect(screen.queryByText("Gwarancja")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Weryfikacja firmy i wypłata" })).not.toBeInTheDocument();
  });

  it("shows the delivered banner and the verification button once the order reached odbiór", async () => {
    await renderPage({ project: "prj-steelhouse-alpine-104" });

    expect(screen.getByText(/Zamówienie odebrane/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Weryfikacja firmy i wypłata" });
    expect(link).toHaveAttribute("href", "/pl/producent/weryfikacja-firmy?project=prj-steelhouse-alpine-104");
  });

  it("does not show the delivered banner or button for an order still in produkcja", async () => {
    await renderPage({ project: "prj-steelhouse-loft-120" });

    expect(screen.queryByText(/Zamówienie odebrane/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Weryfikacja firmy i wypłata" })).not.toBeInTheDocument();
  });
});
