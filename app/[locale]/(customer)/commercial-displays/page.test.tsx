import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Strona nie dotyka bazy ani poczty: kraje i akcja zapisu są podstawione na granicy.
vi.mock("@/lib/data/countries", () => ({
  getCountries: vi.fn().mockResolvedValue([
    { code: "PL", name: "Polska" },
    { code: "DE", name: "Niemcy" },
  ]),
}));
vi.mock("@/lib/commercial-display-inquiry-actions", () => ({ submitCommercialDisplayInquiry: vi.fn() }));

import CommercialDisplaysPage, { generateMetadata } from "./page";

async function renderPage(locale = "pl") {
  const element = await CommercialDisplaysPage({ params: Promise.resolve({ locale }) });
  return render(await resolveAsyncTree(element));
}

describe("CommercialDisplaysPage", () => {
  it("renders one h1 and the sales sections", async () => {
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Trzy rodziny rozwiązań" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Gdzie to działa" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Rozmiary i parametry wyświetlaczy komercyjnych IP66" })).toBeInTheDocument();
  });

  it("shows the product film with both sources, a poster and no autoplay", async () => {
    await renderPage();

    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("poster", "/videos/outdoor-tv/commercial-showcase-poster.webp");
    expect(video).toHaveAttribute("aria-label", "Film pokazujący ścianę LED MirageVision na zewnątrz");
    const sources = [...document.querySelectorAll("video source")].map((s) => s.getAttribute("src"));
    expect(sources).toEqual([
      "/videos/outdoor-tv/commercial-showcase.webm",
      "/videos/outdoor-tv/commercial-showcase.mp4",
    ]);
  });

  it("offers captions in four languages and turns on the one matching the page language", async () => {
    await renderPage("de");

    const tracks = [...document.querySelectorAll("video track")];
    expect(tracks.map((track) => track.getAttribute("srclang"))).toEqual(["pl", "en", "de", "nl"]);
    expect(tracks.map((track) => track.getAttribute("label"))).toEqual(["Polski", "English", "Deutsch", "Nederlands"]);
    expect(tracks.find((track) => track.getAttribute("srclang") === "en")).toHaveAttribute("kind", "captions");
    expect(tracks.filter((track) => track.getAttribute("srclang") !== "en").every((track) => track.getAttribute("kind") === "subtitles")).toBe(true);
    expect(tracks.filter((track) => track.hasAttribute("default")).map((track) => track.getAttribute("srclang"))).toEqual(["de"]);
    expect(tracks.map((track) => track.getAttribute("src"))).toEqual([
      "/videos/outdoor-tv/captions/commercial-showcase.pl.vtt",
      "/videos/outdoor-tv/captions/commercial-showcase.en.vtt",
      "/videos/outdoor-tv/captions/commercial-showcase.de.vtt",
      "/videos/outdoor-tv/captions/commercial-showcase.nl.vtt",
    ]);
  });

  it("describes the hero photo and leaves decorative tile photos without alt text", async () => {
    await renderPage();

    expect(
      screen.getByRole("img", { name: /Ściana LED pod czarną drewnianą pergolą/ }),
    ).toBeInTheDocument();
    // Mozaika zastosowań i tło zamknięcia są dekoracyjne: podpis obok zdjęcia niesie treść.
    expect(document.querySelectorAll('img[alt=""]').length).toBeGreaterThanOrEqual(6);
  });

  it("lists every display size in the table", async () => {
    await renderPage();

    for (const size of ["22″", "27″", "32″", "55″", "75″", "86″"]) {
      expect(screen.getByRole("rowheader", { name: size })).toBeInTheDocument();
    }
  });

  it("points the quote buttons at the inquiry form on the same page", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: /Zapytaj o wycenę/ })).toHaveAttribute("href", "#zapytanie");
    const section = document.getElementById("zapytanie");
    expect(section).not.toBeNull();
    expect(section?.querySelector("form")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Powiedz nam, gdzie ma stanąć ekran" })).toBeInTheDocument();
  });

  it("does not use a mailto link for the inquiry any more", async () => {
    await renderPage();

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("links to the garden TV catalog", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: /Telewizory do ogrodu$/ })).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv",
    );
  });

  it("does not show prices", async () => {
    await renderPage();

    expect(document.body.textContent).not.toMatch(/[€$]|zł|\bUSD\b|\bEUR\b/);
  });

  it("sets the canonical and every language alternate in metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "de" }) });

    expect(metadata.alternates?.canonical).toBe("/de/commercial-displays");
    expect(metadata.alternates?.languages).toMatchObject({
      pl: "/pl/commercial-displays",
      en: "/en/commercial-displays",
      nl: "/nl/commercial-displays",
      "x-default": "/pl/commercial-displays",
    });
  });
});
