// Stylistyki wnętrz Letniskowo (pięć plansz Fitout, spec 0081): opisy i materiały przepisane z plansz, układ siatki jest
// stały (6 stref po 4 kafelki). Nazwy materiałów to nazwy własne, nie są tłumaczone; nazwy stref idą przez messages/*.json.
import { L, detUuid, type L10n } from "./letniskowo-catalog";

export const ZONES = ["walls_ceilings", "flooring", "built_in_furniture", "bathroom", "kitchen", "beds_textiles"] as const;
export type Zone = (typeof ZONES)[number];

// Kafelek: [nazwa, kod albo null], w kolejności z planszy (wiersz = strefa, cztery kolumny).
type Tile = readonly [string, string | null];

export interface StyleSource {
  key: string;
  /** Skrót z nazwy pliku Fitout i numer strony wizualizacji w pliku `_ALL+VIZ` (1 = pierwsza strona). */
  boardFile: string;
  vizPage: number;
  name: string;
  description: L10n;
  rows: readonly [readonly Tile[], readonly Tile[], readonly Tile[], readonly Tile[], readonly Tile[], readonly Tile[]];
}

const WHITE_MDF: Tile = ["White MDF", "RAL 9016"];

export const STYLES: readonly StyleSource[] = [
  {
    key: "almond-aura",
    boardFile: "FITOUT (EN) - (AA Almond Aura) 20240513.pdf",
    vizPage: 2,
    name: "Almond Aura",
    description: L(
      "Otulająca kompozycja ciepłych beży migdałowych z głębokimi akcentami w tonach kakao i matowej czerni. Nowoczesny, zmysłowy charakter łączy miękką przytulność z wyrazistym akcentem.",
      "A refined composition of warm almond beiges broken up by deep, expressive accents in cocoa tones and matte black. A modern, sensual character combining soft coziness with a strong accent.",
      "Eine raffinierte Komposition aus warmen Mandelbeigetönen, durchbrochen von tiefen, ausdrucksstarken Akzenten in Kakaotönen und mattem Schwarz. Ein moderner, sinnlicher Charakter, der weiche Gemütlichkeit mit einem starken Akzent verbindet.",
      "Een verfijnde compositie van warme amandelbeige tinten, doorbroken door diepe, expressieve accenten in cacaotinten en mat zwart. Een modern, sensueel karakter dat zachte gezelligheid combineert met een sterk accent.",
    ),
    rows: [
      [WHITE_MDF, WHITE_MDF, ["HUNTONIT", "Pepper"], ["ACCENT: Linerio", "BLACK"]],
      [["LINOLEUM", "M34"], ["MDF Asal", "Expedition"], ["SPC Stanford", "Oak CW181"], ["Trims", "White"]],
      [["SEPIA", "PU 1500"], ["Desert Sand", "PU1503 SO"], ["Fittings", "Steel-look finish"], ["Handles", "Black"]],
      [["HPL KER", "Marmo 3346"], ["FIBO WARM GREY", "M0830"], ["FIBO DARK WOOD", "4633M00"], ["Fittings", "Black"]],
      [["Worktop BWL", "SAVIANO BEŻ"], ["HPL KER", "Marmo 3346"], ["Appliances", "Black"], ["Faucet", "Black"]],
      [["Beds", "ASTI 1"], ["Beds", "Astone 1"], ["Curtains", "Paroh 10"], ["Blinds", "Paroh 10"]],
    ],
  },
  {
    key: "calm-stone",
    boardFile: "FITOUT (EN) - (CS Calm Stone) 20240513.pdf",
    vizPage: 4,
    name: "Calm Stone",
    description: L(
      "Stonowana, chłodniejsza, minimalistyczna kompozycja inspirowana estetyką zen i skandynawskim designem. Jasne, nowoczesne i harmonijne wnętrze w neutralnych szaro beżowych tonach.",
      "A subdued, cooler, minimalist composition inspired by zen aesthetics and Scandinavian design. A light, modern and harmonious interior in neutral gray-beige tones.",
      "Eine gedämpfte, kühlere, minimalistische Komposition, inspiriert von Zen-Ästhetik und skandinavischem Design. Ein helles, modernes und harmonisches Interieur in neutralen Grau-Beige-Tönen.",
      "Een ingetogen, koelere, minimalistische compositie geïnspireerd op zen-esthetiek en Scandinavisch design. Een licht, modern en harmonieus interieur in neutrale grijsbeige tinten.",
    ),
    rows: [
      [WHITE_MDF, WHITE_MDF, ["HUNTONIT", "Earth"], ["ACCENT: Linerio", "Natural"]],
      [["LINOLEUM", "M90"], ["MDF ELTON", "OAK"], ["SPC Baltimore", "Oak CWS202"], ["Trims", "White"]],
      [["SONOMA OAK", "PD 3000 WP"], ["ANTHRACITE", "PU 1203MT"], ["Fittings", "Black"], ["Handles", "Chrome finish"]],
      [["HPL", "Calipso Site"], ["FIBO DENVER WHITE", "M6030"], ["FIBO WHITE MARBLE", "M00"], ["Fittings", "Chrome finish"]],
      [["Worktop BWL", "PK 90337SG"], ["HPL", "Calipso Site"], ["Appliances", "Black"], ["Faucet", "Chrome finish"]],
      [["Beds", "ASTI 3"], ["Beds", "Astone 21"], ["Curtains", "Paroh 07"], ["Blinds", "Paroh 07"]],
    ],
  },
  {
    key: "carmel-wood",
    boardFile: "FITOUT (EN) - (CW Carmel Wood) 20240513.pdf",
    vizPage: 10,
    name: "Carmel Wood",
    description: L(
      "Szlachetne odcienie drewna w tonach karmelu i miodu wnoszą do wnętrza ciepło i naturalność. Efekt wysokiej klasy domowego komfortu, miękki w odbiorze i przytulny, bez rustykalnych skojarzeń.",
      "Noble wood shades in caramel and honey tones bring warmth and naturalness into the space. The impression of refined home premium, soft in perception and cozy, but free from rustic associations.",
      "Edle Holztöne in Karamell- und Honigfarben bringen Wärme und Natürlichkeit in den Raum. Der Eindruck von gehobenem Wohnkomfort, weich in der Wahrnehmung und gemütlich, aber frei von rustikalen Assoziationen.",
      "Edele houttinten in karamel- en honingtinten brengen warmte en natuurlijkheid in de ruimte. De indruk van verfijnde thuiskwaliteit, zacht in beleving en gezellig, maar zonder rustieke associaties.",
    ),
    rows: [
      [WHITE_MDF, WHITE_MDF, ["HUNTONIT", "Earth"], ["ACCENT", "Linerio Natural"]],
      [["LINOLEUM", "M43"], ["MDF AZURRO", "OAK 66851"], ["SPC Timberland", "Oak CW185"], ["Trims", "White"]],
      [["BALTIC DUNE OAK", "PD 3102RW"], ["DARK BEIGE", "PU 1514 SG"], ["Fittings", "Black"], ["Handles", "Chrome finish"]],
      [["HPL", "Oiled Oak"], ["FIBO DENVER WHITE", "M6030"], ["FIBO OAK NATURE", "M00"], ["Fittings", "Chrome finish"]],
      [["Worktop BWL", "Carpenter Coffee"], ["HPL", "Oiled Oak"], ["Appliances", "Black"], ["Faucet", "Chrome finish"]],
      [["Beds", "ASTI 18"], ["Beds", "Astone 2"], ["Curtains", "Paroh 10"], ["Blinds", "Paroh 10"]],
    ],
  },
  {
    key: "nude-beige",
    boardFile: "FITOUT (EN) - (NB Nude Beige) 20240513.pdf",
    vizPage: 8,
    name: "Nude Beige",
    description: L(
      "Kompozycja ciepłych beży i subtelnych naturalnych tonów tworzy spokojne, ponadczasowe tło codziennego życia. Czyste, miękkie, uniwersalne wnętrze, eleganckie i przytulne, bez agresywnych kontrastów.",
      "A composition of warm beiges and subtle natural tones that create a calm, timeless background for everyday life. A clean, soft, universal interior, elegant and cozy, without aggressive contrasts.",
      "Eine Komposition aus warmen Beigetönen und dezenten Naturtönen, die einen ruhigen, zeitlosen Hintergrund für den Alltag schafft. Ein klares, weiches, universelles Interieur, elegant und gemütlich, ohne aggressive Kontraste.",
      "Een compositie van warme beige en subtiele natuurlijke tinten die een rustige, tijdloze achtergrond voor het dagelijks leven vormt. Een zuiver, zacht, universeel interieur, elegant en gezellig, zonder agressieve contrasten.",
    ),
    rows: [
      [WHITE_MDF, WHITE_MDF, ["HUNTONIT", "Mist"], ["ACCENT", "Linerio GREY"]],
      [["LINOLEUM", "M34"], ["MDF", "MILANO OAK"], ["SPC Stanford", "Oak CW181"], ["Trims", "White"]],
      [["LINDBERG OAK", "PD 3018 LN"], ["LIGHT BEIGE", "PU 1513SG"], ["Fittings", "Black"], ["Handles", "Chrome finish"]],
      [["HPL KER", "Marmo Canova"], ["FIBO DENVER WHITE", "M6030"], ["FIBO GREY CEMENT", "M00"], ["Fittings", "Chrome finish"]],
      [["Worktop BWL", "PK 9024SO"], ["HPL KER", "Marmo Canova"], ["Appliances", "Black"], ["Faucet", "Chrome finish"]],
      [["Beds", "ASTI 2"], ["Beds", "Astone 22"], ["Curtains", "Paroh 03"], ["Blinds", "Paroh 03"]],
    ],
  },
  {
    key: "new-york",
    boardFile: "FITOUT (EN) - (NY New York) 20240513.pdf",
    vizPage: 6,
    name: "New York",
    description: L(
      "Kompozycja głębokich, ciemnych tonów z wyrazistymi złotymi akcentami, nawiązująca do wnętrz butikowych hoteli i współczesnego glamouru. Mocny akcent i efekt „wow” z kontrolowaną dawką luksusu.",
      "A composition of deep, dark tones with distinctive gold accents, referencing boutique hotel interiors and contemporary glamour. A strong accent and a clear “wow” effect, but with a controlled dose of luxury.",
      "Eine Komposition aus tiefen, dunklen Tönen mit markanten Goldakzenten, die an Boutique-Hotel-Interieurs und zeitgenössischen Glamour erinnert. Ein starker Akzent und ein klarer „Wow“-Effekt, aber mit einer kontrollierten Dosis Luxus.",
      "Een compositie van diepe, donkere tinten met opvallende gouden accenten, verwijzend naar boetiekhotelinterieurs en eigentijdse glamour. Een sterk accent en een duidelijk “wow”-effect, maar met een beheerste dosis luxe.",
    ),
    rows: [
      [WHITE_MDF, WHITE_MDF, ["HUNTONIT", "Pepper"], ["ACCENT", "Linerio Chocolate"]],
      [["LINOLEUM", "M44"], ["MDF Walnut", "Oak"], ["SPC Montana", "Oak 007"], ["Trims", "Black"]],
      [["VILLA WALNUT", "PD 5014WP"], ["Onyx Black", "PU 1001 MT"], ["Fittings", "Black"], ["Handles", "Golden finish"]],
      [["HPL Nero", "Luna 0509"], ["FIBO RHODOS WHITE", "M00"], ["FIBO SILVER GREY MRB.", "M6060"], ["Fittings", "Golden finish"]],
      [["Worktop BWL", "VILLA WALNUT PD 5014WP"], ["HPL Nero", "Luna 0509"], ["Appliances", "Black"], ["Faucet", "Golden finish"]],
      [["Beds", "ASTI 15"], ["Beds", "Astone 20"], ["Curtains", "Paroh 33"], ["Blinds", "Paroh 33"]],
    ],
  },
] as const;

export const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const tileSlug = (name: string, code: string | null): string => slugify(`${name}-${code ?? ""}`);
export const styleId = (key: string): string => detUuid(`style:${key}`);
export const materialId = (styleKey: string, index: number): string => detUuid(`material:${styleKey}:${index}`);
export const styleImageId = (styleKey: string, index: number): string => detUuid(`style-image:${styleKey}:${index}`);
export const VIZ_NAMES = ["kitchen", "bedroom", "bathroom"] as const;

// Materiały w jednej liście z kolejnością wynikającą z planszy: strefa, potem kolumna.
export function materialsOf(style: StyleSource) {
  return style.rows.flatMap((row, zoneIndex) =>
    row.map(([name, code], column) => ({ zone: ZONES[zoneIndex], name, code, sortOrder: zoneIndex * 10 + column, tile: tileSlug(name, code) })),
  );
}
