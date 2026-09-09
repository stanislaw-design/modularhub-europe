import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeryfikacjaFirmyPage from "./page";

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
  const element = await WeryfikacjaFirmyPage(makeProps(searchParams));
  render(element);
}

describe("WeryfikacjaFirmyPage (feature 16)", () => {
  beforeEach(() => {
    redirect.mockClear();
    window.localStorage.clear();
  });

  it("redirects to the realizacje list when project is missing", async () => {
    await expect(renderPage({})).rejects.toThrow("NEXT_REDIRECT:/pl/producent/realizacje");
  });

  it("redirects to the realizacje list for an unknown project id", async () => {
    await expect(renderPage({ project: "does-not-exist" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacje"
    );
  });

  it("redirects back to the realizacja axis when the project has no order yet", async () => {
    await expect(renderPage({ project: "prj-steelhouse-studio-38" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacja?project=prj-steelhouse-studio-38"
    );
  });

  it("redirects back to the realizacja axis when the order has not reached odbiór yet", async () => {
    await expect(renderPage({ project: "prj-budman-familia-90" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/realizacja?project=prj-budman-familia-90"
    );
  });

  it("renders the verification screen for a project that has reached odbiór", async () => {
    await renderPage({ project: "prj-steelhouse-alpine-104" });

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Steel House Alpine 104");
    expect(screen.getByRole("heading", { name: "Wymagane dokumenty" })).toBeInTheDocument();
  });
});
