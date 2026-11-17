// Katalog kart startowych od systemu (spec 0048 AC-38 do AC-44). Czyste dane,
// bez importu lucide-react ani next-intl: ten plik jest importowany zarówno
// przez createAdvisoryCase (serwer, wstawia karty do db.batch) jak i przez
// komponent renderujący karty (przeglądarka), więc nie może nosić zależności
// właściwej tylko jednej z tych stron. Ikona to nazwa komponentu z
// lucide-react (mapowana na komponent dopiero w komponencie karty), etykieta
// i zdanie konsekwencji żyją wyłącznie w katalogu tłumaczeń pod kluczem
// "CaseCards.<key>.options.<value>", nigdy w tym pliku ani w bazie.

import type { ProductFamily } from "@/lib/data/types";

export const NIE_WIEM = "nie_wiem" as const;

export interface StartCardOption {
  readonly value: string;
  readonly icon: string;
}

export interface StartCardDefinition {
  readonly key: string;
  readonly layer: 1 | 2;
  // Spec 0084: rodziny produktu, których dotyczy pytanie. Karta i pytanie w
  // formularzu istnieją tylko dla rodzin z tej listy.
  readonly families: readonly ProductFamily[];
  readonly options: readonly StartCardOption[];
}

// Kolejność zapisu wiadomości w createAdvisoryCase i kolejność pokazywania w
// interfejsie (AC-38, AC-43) to ta sama lista: cztery karty warstwy
// pierwszej, potem dwie karty warstwy drugiej.
export const START_CARDS: readonly StartCardDefinition[] = [
  {
    key: "zakres_uslug",
    layer: 1,
    families: ["dom"],
    options: [
      { value: "sam_dom", icon: "House" },
      { value: "dom_i_transport", icon: "Truck" },
      { value: "dom_transport_montaz", icon: "Wrench" },
      { value: "kompleksowo_z_fundamentem", icon: "Layers" },
    ],
  },
  {
    key: "budzet",
    layer: 1,
    families: ["dom"],
    options: [
      { value: "do_150k", icon: "Coins" },
      { value: "150_do_250k", icon: "Wallet" },
      { value: "250_do_400k", icon: "Banknote" },
      { value: "powyzej_400k", icon: "PiggyBank" },
    ],
  },
  {
    key: "termin",
    layer: 1,
    families: ["dom", "spa-modulowe", "kontenery-modulowe", "outdoor-tv", "outdoor-kitchen"],
    options: [
      { value: "jak_najszybciej", icon: "Zap" },
      { value: "do_6_miesiecy", icon: "CalendarClock" },
      { value: "do_roku", icon: "CalendarDays" },
      { value: "elastyczny", icon: "CalendarRange" },
    ],
  },
  {
    key: "gotowosc_dzialki",
    layer: 1,
    families: ["dom"],
    options: [
      { value: "dzialka_i_pozwolenie", icon: "CheckCircle2" },
      { value: "dzialka_bez_pozwolenia", icon: "FileClock" },
      { value: "szukam_dzialki", icon: "MapPin" },
      { value: "potrzebuje_analizy", icon: "ClipboardList" },
    ],
  },
  {
    key: "ogrzewanie",
    layer: 2,
    families: ["dom"],
    options: [
      { value: "pompa_ciepla", icon: "Thermometer" },
      { value: "gaz", icon: "Fuel" },
      { value: "elektryczne", icon: "PlugZap" },
      { value: "kominek_biomasa", icon: "Flame" },
    ],
  },
  {
    key: "standard_wykonczenia",
    layer: 2,
    families: ["dom"],
    options: [
      { value: "surowy_zamkniety", icon: "Hammer" },
      { value: "deweloperski", icon: "PaintRoller" },
      { value: "pod_klucz", icon: "KeyRound" },
    ],
  },
  {
    key: "miejsce_ustawienia",
    layer: 1,
    families: ["spa-modulowe", "outdoor-kitchen"],
    options: [
      { value: "ogrod", icon: "Trees" },
      { value: "taras", icon: "LayoutGrid" },
      { value: "wnetrze_budynku", icon: "Building2" },
      { value: "inne", icon: "MapPin" },
    ],
  },
  {
    key: "zasilanie_400v",
    layer: 1,
    families: ["spa-modulowe"],
    options: [
      { value: "jest_przylacze", icon: "PlugZap" },
      { value: "do_wykonania", icon: "Wrench" },
      { value: "niepotrzebne", icon: "CircleSlash" },
    ],
  },
  {
    key: "przylacza",
    layer: 1,
    families: ["kontenery-modulowe"],
    options: [
      { value: "wszystkie", icon: "CheckCircle2" },
      { value: "czesc", icon: "ListChecks" },
      { value: "brak", icon: "CircleSlash" },
    ],
  },
  {
    key: "liczba_sztuk",
    layer: 1,
    families: ["kontenery-modulowe", "outdoor-tv", "outdoor-kitchen"],
    options: [
      { value: "jeden", icon: "Package" },
      { value: "od_2_do_5", icon: "Boxes" },
      { value: "od_6", icon: "Warehouse" },
    ],
  },
  {
    key: "miejsce_montazu_tv",
    layer: 1,
    families: ["outdoor-tv"],
    options: [
      { value: "wewnatrz", icon: "House" },
      { value: "na_zewnatrz_pod_dachem", icon: "Umbrella" },
      { value: "na_zewnatrz_odkryte", icon: "Sun" },
    ],
  },
] as const;

export type StartCardKey = (typeof START_CARDS)[number]["key"];

const BY_KEY = new Map(START_CARDS.map((card) => [card.key, card]));

export function getStartCard(key: string): StartCardDefinition | undefined {
  return BY_KEY.get(key);
}

// Zbiór dozwolonych wartości dla klucza, zawsze z "nie_wiem" na końcu
// (AC-40). Używane przez case-schemas.ts do budowy walidatora Zod.
export function startCardValues(key: string): readonly string[] {
  const card = getStartCard(key);
  return card ? [...card.options.map((option) => option.value), NIE_WIEM] : [];
}

// Spec 0084: pytania dla rodziny zadaje doradca przez karty po wysłaniu
// zapytania (nie formularz). Dom dostaje wszystkie sześć dzisiejszych kart
// (warstwa 1, potem 2, kolejność katalogu), pozostałe rodziny trzy karty.
const FAMILY_CARD_KEYS: Readonly<Record<Exclude<ProductFamily, "dom">, readonly string[]>> = {
  "spa-modulowe": ["miejsce_ustawienia", "zasilanie_400v", "termin"],
  "kontenery-modulowe": ["przylacza", "liczba_sztuk", "termin"],
  "outdoor-tv": ["miejsce_montazu_tv", "liczba_sztuk", "termin"],
  // Spec 0086 AC-17: tylko istniejące karty, rodzina dopisana do ich listy families.
  "outdoor-kitchen": ["miejsce_ustawienia", "liczba_sztuk", "termin"],
};

// Spec 0084 AC-5: zestaw kart po wysłaniu. Dom dostaje wszystkie sześć
// dzisiejszych kart (warstwa 1, potem 2, kolejność katalogu), pozostałe rodziny
// tylko klucze ze swojego formularza.
export function familyCardKeys(family: ProductFamily): string[] {
  if (family === "dom") {
    const home = START_CARDS.filter((card) => card.families.includes("dom"));
    return [...home.filter((card) => card.layer === 1), ...home.filter((card) => card.layer === 2)].map((card) => card.key);
  }
  return [...FAMILY_CARD_KEYS[family]];
}
