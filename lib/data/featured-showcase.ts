// Realizacja pokazowa ze strony głównej (spec 0073 AC-3): dane leżą tutaj, nie w komponencie,
// żeby zmiana liczb albo zdjęć nie wymagała ruszania układu. Źródło w bazie dojdzie, gdy
// realizacji będzie więcej niż jedna.
export const FEATURED_SHOWCASE_FACT_KEYS = [
  "investor",
  "producer",
  "count",
  "model",
  "area",
  "terrace",
  "total",
  "statusLabel",
] as const;

export type FeaturedShowcaseFactKey = (typeof FEATURED_SHOWCASE_FACT_KEYS)[number];

export interface FeaturedShowcaseImage {
  file: string;
  /** Klucz w FeaturedProjectShowcase.gallery.* z tekstem alternatywnym. */
  key: string;
}

export interface FeaturedShowcase {
  imageDir: string;
  gallery: readonly FeaturedShowcaseImage[];
  /** Wartość null oznacza „status realizacji” z tłumaczeń (statusValue). */
  facts: Record<FeaturedShowcaseFactKey, string | null>;
}

export const FEATURED_SHOWCASE: FeaturedShowcase = {
  imageDir: "/images/success",
  gallery: [
    { file: "01-zgory.webp", key: "top" },
    { file: "02-bok.webp", key: "side" },
    { file: "03-prawo.webp", key: "right" },
    { file: "04-przod.webp", key: "front" },
    { file: "05-lewo.webp", key: "left" },
    { file: "06-sypialnia.webp", key: "bedroom" },
    { file: "07-salon.webp", key: "living" },
    { file: "08-glab.webp", key: "deep" },
  ],
  facts: {
    investor: "Succes Resorts",
    producer: "BUDMAN HOUSE",
    count: "49",
    model: "Voorgewel Chalet",
    area: "50,2 m²",
    terrace: "42,3 m²",
    total: "2 459,8 m²",
    statusLabel: null,
  },
};
