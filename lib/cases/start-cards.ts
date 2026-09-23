// Katalog kart startowych od systemu (spec 0048 AC-38 do AC-44). Czyste dane,
// bez importu lucide-react ani next-intl: ten plik jest importowany zarówno
// przez createAdvisoryCase (serwer, wstawia karty do db.batch) jak i przez
// komponent renderujący karty (przeglądarka), więc nie może nosić zależności
// właściwej tylko jednej z tych stron. Ikona to nazwa komponentu z
// lucide-react (mapowana na komponent dopiero w komponencie karty), etykieta
// i zdanie konsekwencji żyją wyłącznie w katalogu tłumaczeń pod kluczem
// "CaseCards.<key>.options.<value>", nigdy w tym pliku ani w bazie.

export const NIE_WIEM = "nie_wiem" as const;

export interface StartCardOption {
  readonly value: string;
  readonly icon: string;
}

export interface StartCardDefinition {
  readonly key: string;
  readonly layer: 1 | 2;
  readonly options: readonly StartCardOption[];
}

// Kolejność zapisu wiadomości w createAdvisoryCase i kolejność pokazywania w
// interfejsie (AC-38, AC-43) to ta sama lista: cztery karty warstwy
// pierwszej, potem dwie karty warstwy drugiej.
export const START_CARDS: readonly StartCardDefinition[] = [
  {
    key: "zakres_uslug",
    layer: 1,
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
    options: [
      { value: "surowy_zamkniety", icon: "Hammer" },
      { value: "deweloperski", icon: "PaintRoller" },
      { value: "pod_klucz", icon: "KeyRound" },
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
