// Realizacje ModularProjects (spec 0076): wpisy leżą w plikach kodu, każdy tekst ma cztery języki.
export type ModularProjectLocale = "pl" | "en" | "de" | "nl";
export type LocalizedText = Record<ModularProjectLocale, string>;

export type ModularProjectStatus = "planned" | "in_production" | "delivered";
export type ModularProjectGalleryGroup = "visualization" | "design" | "construction";

export const MODULARPROJECT_GALLERY_GROUPS: readonly ModularProjectGalleryGroup[] = [
  "visualization",
  "design",
  "construction",
];

/** Model 3D rysowany kodem (components/klient/ModularProjectModel3D.tsx), bez pliku .glb. */
export type ModularProjectModelType = "stilt-chalet";

export interface ModularProjectModel {
  type: ModularProjectModelType;
  /** opis alternatywny modelu (obraz interaktywny dla czytnika ekranu) */
  alt: LocalizedText;
}

export interface ModularProjectEntry {
  /** kebab-case, unikalny */
  slug: string;
  /** data ISO, np. "2026-10-24" */
  publishedAt: string;
  /** dokładnie jeden wpis w liście ma true */
  featured?: boolean;
  status: ModularProjectStatus;
  title: LocalizedText;
  /** 1 lub 2 zdania: karta, opis meta, Open Graph */
  lead: LocalizedText;
  facts: { label: LocalizedText; value: LocalizedText }[];
  /** akapity rozdzielone pustą linią */
  sections: { heading: LocalizedText; body: LocalizedText }[];
  gallery: {
    /** nazwa pliku w public/images/modularprojects/<slug>/ */
    file: string;
    group: ModularProjectGalleryGroup;
    alt: LocalizedText;
  }[];
  /** jedna z wartości gallery[].file */
  cover: string;
  /** opcjonalny model 3D pokazywany w sekcji o realizacji */
  model?: ModularProjectModel;
}

export interface ResolvedModularProject {
  slug: string;
  publishedAt: string;
  featured: boolean;
  status: ModularProjectStatus;
  title: string;
  lead: string;
  facts: { label: string; value: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  gallery: { src: string; group: ModularProjectGalleryGroup; alt: string }[];
  cover: { src: string; alt: string };
  model: { type: ModularProjectModelType; alt: string } | null;
}

/** Wartość, która się nie tłumaczy (nazwa inwestora, liczba), we wszystkich językach. */
export function same(value: string): LocalizedText {
  return { pl: value, en: value, de: value, nl: value };
}
