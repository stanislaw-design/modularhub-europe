import { succesResorts } from "./entries/succes-resorts";
import type { ModularProjectEntry, ModularProjectLocale, ResolvedModularProject } from "./types";

export * from "./types";

// Nowa realizacja: plik w entries/, wpis tutaj i zdjęcia w public/images/modularprojects/<slug>/ (spec 0076 AC-8).
export const MODULARPROJECT_ENTRIES: readonly ModularProjectEntry[] = [succesResorts];

export const MODULARPROJECT_IMAGE_ROOT = "/images/modularprojects";

function resolveEntry(entry: ModularProjectEntry, locale: ModularProjectLocale): ResolvedModularProject {
  const src = (file: string) => `${MODULARPROJECT_IMAGE_ROOT}/${entry.slug}/${file}`;
  const cover = entry.gallery.find((image) => image.file === entry.cover) ?? entry.gallery[0];
  return {
    slug: entry.slug,
    publishedAt: entry.publishedAt,
    featured: entry.featured === true,
    status: entry.status,
    title: entry.title[locale],
    lead: entry.lead[locale],
    facts: entry.facts.map((fact) => ({ label: fact.label[locale], value: fact.value[locale] })),
    sections: entry.sections.map((section) => ({
      heading: section.heading[locale],
      paragraphs: section.body[locale].split(/\n\s*\n/).filter(Boolean),
    })),
    gallery: entry.gallery.map((image) => ({ src: src(image.file), group: image.group, alt: image.alt[locale] })),
    cover: { src: src(cover.file), alt: cover.alt[locale] },
    model: entry.model ? { type: entry.model.type, alt: entry.model.alt[locale] } : null,
  };
}

function toLocale(locale: string): ModularProjectLocale {
  return locale === "en" || locale === "de" || locale === "nl" ? locale : "pl";
}

// Asynchroniczne od początku, żeby źródło w bazie nie zmieniało wywołań (lib/data/AGENTS.md).
export async function getModularProjects(locale: string): Promise<ResolvedModularProject[]> {
  const code = toLocale(locale);
  return [...MODULARPROJECT_ENTRIES]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((entry) => resolveEntry(entry, code));
}

export async function getModularProjectBySlug(slug: string, locale: string): Promise<ResolvedModularProject | null> {
  const entry = MODULARPROJECT_ENTRIES.find((item) => item.slug === slug);
  return entry ? resolveEntry(entry, toLocale(locale)) : null;
}

export async function getFeaturedModularProject(locale: string): Promise<ResolvedModularProject | null> {
  const entry = MODULARPROJECT_ENTRIES.find((item) => item.featured);
  return entry ? resolveEntry(entry, toLocale(locale)) : null;
}
