import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getFeaturedModularProject,
  getModularProjectBySlug,
  getModularProjects,
  MODULARPROJECT_ENTRIES,
  type LocalizedText,
} from "./index";

const LOCALES = ["pl", "en", "de", "nl"] as const;

function allTexts(entry: (typeof MODULARPROJECT_ENTRIES)[number]): LocalizedText[] {
  return [
    entry.title,
    entry.lead,
    ...entry.facts.flatMap((fact) => [fact.label, fact.value]),
    ...entry.sections.flatMap((section) => [section.heading, section.body]),
    ...entry.gallery.map((image) => image.alt),
  ];
}

describe("wpisy ModularProjects (spec 0076)", () => {
  it("has a non empty text in every language (AC-8, AC-10)", () => {
    for (const entry of MODULARPROJECT_ENTRIES) {
      for (const text of allTexts(entry)) {
        for (const locale of LOCALES) expect(text[locale].trim(), `${entry.slug}/${locale}`).not.toBe("");
      }
    }
  });

  it("has unique kebab case slugs and valid dates", () => {
    const slugs = MODULARPROJECT_ENTRIES.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of MODULARPROJECT_ENTRIES) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(Number.isNaN(Date.parse(entry.publishedAt))).toBe(false);
    }
  });

  it("has exactly one featured entry", () => {
    expect(MODULARPROJECT_ENTRIES.filter((entry) => entry.featured)).toHaveLength(1);
  });

  it("points every gallery file at an existing image and the cover at the gallery (AC-10)", () => {
    for (const entry of MODULARPROJECT_ENTRIES) {
      expect(entry.gallery.length).toBeGreaterThan(0);
      expect(entry.gallery.map((image) => image.file)).toContain(entry.cover);
      for (const image of entry.gallery) {
        const file = path.join(process.cwd(), "public", "images", "modularprojects", entry.slug, image.file);
        expect(existsSync(file), file).toBe(true);
      }
    }
  });

  it("holds no e mail, phone number or web address in any text (AC-13)", () => {
    const patterns = [
      /[\w.+-]+@[\w-]+\.[\w.]+/,
      /https?:\/\//i,
      /\bwww\./i,
      /(?:\+\d{2}[\s-]?)?\b\d{3}[\s-]\d{3}[\s-]\d{3}\b/,
    ];
    for (const entry of MODULARPROJECT_ENTRIES) {
      for (const text of allTexts(entry)) {
        for (const locale of LOCALES) {
          for (const pattern of patterns) expect(text[locale], `${entry.slug}/${locale}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("returns entries newest first, resolved to one language", async () => {
    const list = await getModularProjects("en");
    const dates = list.map((item) => item.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(list[0].title).toBe("CocoLeisure – 49 modern holiday cabins");
  });

  it("finds an entry by slug and returns null for an unknown one", async () => {
    expect((await getModularProjectBySlug("cocoleisure", "de"))?.title).toContain("Ferienhäuser");
    expect(await getModularProjectBySlug("nie-ma", "pl")).toBeNull();
  });

  it("returns the featured entry with split paragraphs and image paths", async () => {
    const featured = await getFeaturedModularProject("pl");
    expect(featured?.slug).toBe("cocoleisure");
    expect(featured?.sections[0].paragraphs).toHaveLength(2);
    expect(featured?.cover.src).toBe("/images/modularprojects/cocoleisure/04-przod.webp");
  });
});

describe("model 3D wpisu (spec 0076)", () => {
  it("has a non empty alt text in every language and resolves to one language", async () => {
    for (const entry of MODULARPROJECT_ENTRIES.filter((item) => item.model)) {
      for (const locale of LOCALES) expect(entry.model!.alt[locale].trim(), `${entry.slug}/${locale}`).not.toBe("");
    }
    const project = await getModularProjectBySlug("cocoleisure", "en");
    expect(project?.model?.type).toBe("stilt-chalet");
    expect(project?.model?.alt).toContain("Interactive 3D model");
  });
});
