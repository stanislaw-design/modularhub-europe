import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProducerOfertaPage from "./page";

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
  const element = await ProducerOfertaPage(makeProps(searchParams));
  render(element);
}

describe("ProducerOfertaPage", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to the list when zapytanie is missing", async () => {
    await expect(renderPage({})).rejects.toThrow("NEXT_REDIRECT:/pl/producent/zapytania");
  });

  it("redirects to the list when zapytanie is an unknown id", async () => {
    await expect(renderPage({ zapytanie: "does-not-exist" })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/zapytania"
    );
  });

  it("ignores an array-valued zapytanie param and redirects", async () => {
    await expect(renderPage({ zapytanie: ["inq-001", "inq-002"] })).rejects.toThrow(
      "NEXT_REDIRECT:/pl/producent/zapytania"
    );
  });

  it("renders the offer template for a known inquiry id", async () => {
    await renderPage({ zapytanie: "inq-001" });

    expect(screen.getByRole("heading", { level: 1, name: "Oferta — Modulor Family 90" })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("resolves the delivery country name for the offer's read only transport note", async () => {
    await renderPage({ zapytanie: "inq-002" });

    expect(screen.getByText(/kraju dostawy \(Niemcy\)/)).toBeInTheDocument();
  });
});
