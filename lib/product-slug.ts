// Slug wyliczony raz z product.name (spec 0058 AC-1): małe litery, myślniki,
// polskie znaki transliterowane na łacińskie odpowiedniki (np. "Dom Żaglówka"
// -> "dom-zaglowka"). Czysta funkcja, bez dostępu do bazy — wywołująca strona
// zapisu (lib/producer-product-actions.ts) decyduje KIEDY ją odpalić (tylko
// gdy dzisiejszy slug jest null, a przychodząca nazwa niepusta) i obsługuje
// kolizję unikalności przy zapisie (retry z appendSlugSuffix poniżej).
const POLISH_DIACRITICS: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function slugifyProductName(name: string): string {
  const lowered = name.toLowerCase();
  const transliterated = lowered.replace(/[ąćęłńóśźż]/g, (char) => POLISH_DIACRITICS[char] ?? char);
  return transliterated
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // pozostałe znaki diakrytyczne spoza polskiego zestawu wyżej
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Krótki losowy sufiks doklejany na kolizję bazowego sluga (AC-2, np.
// "pomerania-40-4f2a"): hex, 4 znaki, wystarczające dla rzadkiego przypadku
// dwóch produktów o identycznej nazwie, nie kryptograficzny identyfikator.
export function appendSlugSuffix(baseSlug: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
  return `${baseSlug}-${suffix}`;
}
