import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// @/auth nie ładuje się pod Vitest/jsdom (next-auth's env.js robi bare `import
// "next/server"`), więc jest mockowane na granicy, ten sam wzorzec co
// lib/product-photo-actions.test.ts. authMock ma jawny typ, bo next-auth's
// `auth` export jest przeciążony (może też działać jako middleware) i typ
// wyprowadzony automatycznie łapałby niewłaściwe przeciążenie. vi.hoisted
// jest wymagane wszędzie tutaj: vi.mock() jest podnoszone nad zwykłe
// deklaracje top level, zwykłe `const x = vi.fn()` rzuciłoby "Cannot access
// before initialization" w momencie leniwego wykonania fabryki mocka.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

// Prawdziwy redirect() z next/navigation rzuca specjalny błąd, żeby przerwać
// renderowanie (nigdy nie zwraca); mock robi to samo, żeby kod za redirect()
// (np. session.user.role na null session) nigdy się nie wykonał.
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

const getAllProductsForAdminMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({
  getAllProductsForAdmin: () => getAllProductsForAdminMock(),
}));

import InternalProduktyPage from "./page";

async function renderPage(locale = "pl") {
  const element = await InternalProduktyPage({ params: Promise.resolve({ locale }) });
  render(await resolveAsyncTree(element));
}

beforeEach(() => {
  redirectMock.mockClear();
  getAllProductsForAdminMock.mockReset().mockResolvedValue([]);
});

// spec 0031 AC-9: dokładnie ten sam wzorzec auth co /internal/inquiries.
describe("InternalProduktyPage", () => {
  it("redirects to login with the right callbackUrl when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl/login?callbackUrl=%2Fpl%2Finternal%2Fproducts");
  });

  it("redirects to /pl when the session role is not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "producer" } } as never);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl");
  });

  it("never fetches the product list when access is denied", async () => {
    authMock.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow();

    expect(getAllProductsForAdminMock).not.toHaveBeenCalled();
  });

  it("renders the product list with photo counts and a link to each product's photo manager for an admin session", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    getAllProductsForAdminMock.mockResolvedValue([
      { id: "p1", name: "Dom Testowy", producerName: "Test Producer", photoCount: 3 },
      { id: "p2", name: "Dom Bez Zdjęć", producerName: "Test Producer", photoCount: 0 },
    ]);

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Produkty i zdjęcia" })).toBeInTheDocument();
    expect(screen.getByText("Dom Testowy")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/brak \(okładka z mocka\)/)).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Zarządzaj zdjęciami" });
    expect(links.map((l) => l.getAttribute("href"))).toContain("/pl/internal/products/p1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("shows an empty state when there are no products", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    getAllProductsForAdminMock.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByText("Brak produktów.")).toBeInTheDocument();
  });
});
