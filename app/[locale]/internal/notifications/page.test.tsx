import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Same boundary-mock pattern as app/[locale]/internal/products/page.test.tsx:
// @/auth doesn't resolve under Vitest/jsdom, and a real redirect() throws to
// interrupt rendering (never returns), so the mock does the same.
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

import InternalNotificationsPage from "./page";

async function renderPage(locale = "pl") {
  const element = await InternalNotificationsPage({ params: Promise.resolve({ locale }) });
  render(await resolveAsyncTree(element));
}

beforeEach(() => {
  redirectMock.mockClear();
});

// spec 0051 AC-12, AC-13: same admin-only auth pattern as /internal/products.
describe("InternalNotificationsPage", () => {
  it("redirects to login with the right callbackUrl when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl/login?callbackUrl=%2Fpl%2Finternal%2Fnotifications");
  });

  it("redirects to /pl when the session role is not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "client" } } as never);

    await expect(renderPage()).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/pl");
  });

  it("renders all five template previews, with subjects and rendered HTML, for an admin session", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Podgląd szablonów e mail" })).toBeInTheDocument();
    const iframes = screen.getAllByTitle(/./);
    expect(iframes).toHaveLength(5);
    expect(screen.getByText(/Twój link do logowania w ModularHub Europe/)).toBeInTheDocument();
    expect(screen.getByText(/Otrzymaliśmy Twoje zapytanie/)).toBeInTheDocument();
    expect(screen.getByText(/Nowa oferta na Twoje zapytanie/)).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("never renders a send button: the screen is read only (AC-13)", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);

    await renderPage();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
