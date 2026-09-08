import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import ProducerZapytaniaPage from "./page";

async function renderPage() {
  const element = await ProducerZapytaniaPage({ params: Promise.resolve({ locale: "pl" }) });
  render(await resolveAsyncTree(element));
}

describe("ProducerZapytaniaPage", () => {
  it("renders the heading and every fixture inquiry", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Zapytania i oferty" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Baltyk Loft 120" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Karpaty Ridge 72" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Modulor Compact 56" })).toBeInTheDocument();
  });

  it("links each inquiry's offer button to the offer page with its id, under the given locale", async () => {
    await renderPage();

    const links = screen.getAllByRole("link", { name: "Przygotuj ofertę" });
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/pl/producent/zapytania/oferta?zapytanie=inq-001");
  });
});
