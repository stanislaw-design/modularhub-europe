import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// authMock ma jawny typ: next-auth's `auth` export jest przeciążony (może też
// działać jako middleware), typ wyprowadzony automatycznie łapałby niewłaściwe
// przeciążenie. vi.hoisted: vi.mock()'s fabryka czyta `auth: authMock`
// bezpośrednio (nie w domknięciu), więc bez tego rzuciłoby "Cannot access
// before initialization" przy leniwym wykonaniu.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

class RedirectSignal extends Error {}
class NotFoundSignal extends Error {}
const redirectMock = vi.fn((url: string) => {
  throw new RedirectSignal(url);
});
const notFoundMock = vi.fn(() => {
  throw new NotFoundSignal("not-found");
});
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    redirect: (url: string) => redirectMock(url),
    notFound: () => notFoundMock(),
    // ProductPhotoManager (client component nested in this page) calls
    // useRouter(); outside a real app router this throws "invariant expected
    // app router to be mounted", which resolve-async-tree's hook-error
    // fallback doesn't recognize (it's not a hook-call error message).
    useRouter: () => ({ refresh: vi.fn() }),
  };
});

const getProductForAdminMock = vi.fn();
const getProductPhotosForAdminMock = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getProductForAdmin: (...args: unknown[]) => getProductForAdminMock(...args),
  getProductPhotosForAdmin: (...args: unknown[]) => getProductPhotosForAdminMock(...args),
}));

// ProductPhotoManager to "use client" i importuje lib/product-photo-actions
// (który importuje @/auth) — zamockowane, żeby ta strona testowała tylko
// bramkę auth i przekazane propsy, nie interaktywność (ta ma własny test,
// ProductPhotoManager.test.tsx).
vi.mock("@/lib/product-photo-actions", () => ({
  uploadProductPhoto: vi.fn(),
  setCoverPhoto: vi.fn(),
  reorderProductPhotos: vi.fn(),
  deleteProductPhoto: vi.fn(),
}));

import InternalProduktDetailPage from "./page";

async function renderPage(id = "prod-1", locale = "pl") {
  const element = await InternalProduktDetailPage({ params: Promise.resolve({ locale, id }) });
  render(await resolveAsyncTree(element));
}

beforeEach(() => {
  redirectMock.mockClear();
  notFoundMock.mockClear();
  getProductForAdminMock.mockReset();
  getProductPhotosForAdminMock.mockReset().mockResolvedValue([]);
});

// spec 0031 AC-2, AC-9: sam wzorzec auth co /internal/inquiries.
describe("InternalProduktDetailPage", () => {
  it("redirects to login with the callbackUrl pointing at this exact product when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(renderPage("prod-1")).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl/login?callbackUrl=%2Fpl%2Finternal%2Fproducts%2Fprod-1");
  });

  it("redirects to /pl when the session role is not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "client" } } as never);

    await expect(renderPage("prod-1")).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl");
  });

  it("calls notFound() for an admin visiting an unknown product id", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    getProductForAdminMock.mockResolvedValue(null);

    await expect(renderPage("unknown-id")).rejects.toThrow();

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders the product name, producer, and its photo manager for an admin session", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    getProductForAdminMock.mockResolvedValue({ id: "prod-1", name: "Kazik", producerName: "Budman House" });
    getProductPhotosForAdminMock.mockResolvedValue([
      { id: "doc-1", url: "https://pub-test.r2.dev/a.jpg", filename: "a.jpg", isCover: true, sortOrder: 0 },
    ]);

    await renderPage("prod-1");

    expect(screen.getByRole("heading", { level: 1, name: "Kazik" })).toBeInTheDocument();
    expect(screen.getByText("Budman House")).toBeInTheDocument();
    expect(screen.getByText("a.jpg")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("passes the correct productId through to getProductPhotosForAdmin", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    getProductForAdminMock.mockResolvedValue({ id: "prod-42", name: "X", producerName: "Y" });

    await renderPage("prod-42");

    expect(getProductPhotosForAdminMock).toHaveBeenCalledWith("prod-42");
  });
});
