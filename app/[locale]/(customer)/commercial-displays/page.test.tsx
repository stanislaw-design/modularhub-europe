import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import CommercialDisplaysPage, { generateMetadata } from "./page";

const ORIGINAL_EMAIL = process.env.SUPPORT_REPLY_TO_EMAIL;

afterEach(() => {
  if (ORIGINAL_EMAIL === undefined) delete process.env.SUPPORT_REPLY_TO_EMAIL;
  else process.env.SUPPORT_REPLY_TO_EMAIL = ORIGINAL_EMAIL;
});

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

  it("points the inquiry buttons at a prefilled mailto when the support email is set", async () => {
    process.env.SUPPORT_REPLY_TO_EMAIL = "info@example.com";
    await renderPage();

    const href = screen.getByRole("link", { name: "Zapytaj o wycenę" }).getAttribute("href") ?? "";
    expect(href.startsWith("mailto:info@example.com?subject=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Zapytanie: ekrany zewnętrzne dla firm");
    expect(screen.getByRole("link", { name: "Napisz do nas" })).toHaveAttribute("href", href);
  });

  it("falls back to the contact page when no support email is configured", async () => {
    delete process.env.SUPPORT_REPLY_TO_EMAIL;
    await renderPage();

    expect(screen.getByRole("link", { name: "Zapytaj o wycenę" })).toHaveAttribute("href", "/pl/contact");
    expect(screen.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/pl/contact");
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
