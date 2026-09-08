import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DomykanieLukPage from "./page";

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
  const element = await DomykanieLukPage(makeProps(searchParams));
  render(element);
}

describe("DomykanieLukPage (spec 0010)", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to the map, without nazwa, when kraj is missing (AC-3)", async () => {
    await expect(renderPage({})).rejects.toThrow("NEXT_REDIRECT:/pl/producent/gotowosc-eksportowa");
  });

  it("redirects to the map, preserving nazwa, when kraj is an unknown code (AC-3)", async () => {
    await expect(renderPage({ kraj: "XX", nazwa: "Modulor 28" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/gotowosc-eksportowa?nazwa=Modulor%2028"
    );
  });

  it("redirects to the map when kraj is approved, not conditional (AC-3)", async () => {
    await expect(renderPage({ kraj: "PL" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/gotowosc-eksportowa"
    );
  });

  it("redirects to the map when kraj is blocked, not conditional (AC-3)", async () => {
    await expect(renderPage({ kraj: "NL" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/gotowosc-eksportowa"
    );
  });

  it("ignores an array-valued kraj param and redirects (AC-3)", async () => {
    await expect(renderPage({ kraj: ["DE", "NL"] })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/gotowosc-eksportowa"
    );
  });

  it("renders the gap closure screen with the resolved country name for a conditional kraj (AC-2)", async () => {
    await renderPage({ kraj: "DE" });

    expect(screen.getByRole("heading", { level: 1, name: "Domknij luki: Niemcy" })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("includes the project name in the heading when nazwa is present (AC-2)", async () => {
    await renderPage({ kraj: "DE", nazwa: "Modulor 28" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Domknij luki: Niemcy — „Modulor 28”" })
    ).toBeInTheDocument();
  });

  it("treats a whitespace-only nazwa as absent (AC-2)", async () => {
    await renderPage({ kraj: "DE", nazwa: "   " });

    expect(screen.getByRole("heading", { level: 1, name: "Domknij luki: Niemcy" })).toBeInTheDocument();
  });
});
