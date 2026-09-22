export interface HouseImportGoldenRoomPlan {
  page: number;
  floor: string;
  layoutVersion: string | null;
  roomCount: number;
}

export interface HouseImportGoldenVariant {
  label: string | null;
  completionStandard: "surowy-zamkniety" | "deweloperski" | "pod-klucz";
  priceMinPln: number | null;
  priceMaxPln: number | null;
}

export interface HouseImportGoldenCase {
  filename: string;
  pageCount: number;
  roomPlans: readonly HouseImportGoldenRoomPlan[];
  variants: readonly HouseImportGoldenVariant[];
  ignoredAmountsPln: readonly number[];
  notes: readonly string[];
}

export const HOUSE_IMPORT_GOLDEN_CORPUS = [
  {
    filename: "build_better_herdla-do-testów.pdf",
    pageCount: 4,
    roomPlans: [{ page: 3, floor: "parter", layoutVersion: null, roomCount: 8 }],
    variants: [
      { label: null, completionStandard: "deweloperski", priceMinPln: null, priceMaxPln: null },
      { label: null, completionStandard: "pod-klucz", priceMinPln: null, priceMaxPln: null },
    ],
    ignoredAmountsPln: [],
    notes: [
      "Stan zero nie jest mapowany na stan surowy zamknięty.",
      "Zakresy standardów są kumulatywne, ale dokument nie podaje cen wariantów.",
    ],
  },
  {
    filename: "build_better_trolltind-do-testów.pdf",
    pageCount: 4,
    roomPlans: [
      { page: 3, floor: "parter", layoutVersion: null, roomCount: 6 },
      { page: 3, floor: "piętro", layoutVersion: null, roomCount: 5 },
    ],
    variants: [
      { label: null, completionStandard: "deweloperski", priceMinPln: null, priceMaxPln: null },
      { label: null, completionStandard: "pod-klucz", priceMinPln: null, priceMaxPln: null },
    ],
    ignoredAmountsPln: [],
    notes: [
      "Dwa piętra na jednej stronie muszą zachować osobne klucze pokojów.",
      "Stan zero nie jest mapowany na stan surowy zamknięty.",
    ],
  },
  {
    filename: "treevia-do-testów.pdf",
    pageCount: 14,
    roomPlans: [
      { page: 5, floor: "parter", layoutVersion: null, roomCount: 5 },
      { page: 6, floor: "poddasze", layoutVersion: null, roomCount: 5 },
    ],
    variants: [
      { label: "BASIC", completionStandard: "deweloperski", priceMinPln: 454_149, priceMaxPln: null },
      { label: "ALL-IN", completionStandard: "deweloperski", priceMinPln: 536_195, priceMaxPln: null },
    ],
    ignoredAmountsPln: [490_481, 579_091, 82_046, 54_000, 350],
    notes: [
      "Kwoty brutto, różnica między pakietami, orientacyjny montaż i opcje za metr nie są cenami wariantów.",
      "Wariant A i B przekroju ściany nie są pakietami handlowymi.",
    ],
  },
  {
    filename: "treevia.pl_catalogs_TREEVIA_BARN_124-do-testów.pdf",
    pageCount: 14,
    roomPlans: [
      { page: 5, floor: "parter", layoutVersion: null, roomCount: 7 },
      { page: 6, floor: "poddasze", layoutVersion: null, roomCount: 7 },
    ],
    variants: [
      { label: "BASIC", completionStandard: "deweloperski", priceMinPln: 746_055, priceMaxPln: null },
      { label: "ALL-IN", completionStandard: "deweloperski", priceMinPln: 873_610, priceMaxPln: null },
    ],
    ignoredAmountsPln: [805_739, 943_499, 127_555, 57_000, 350],
    notes: [
      "Każdy z czternastu pokojów zachowuje własny klucz wraz z kondygnacją i numerem z rzutu.",
      "Kwoty brutto, różnica, orientacyjny montaż i opcje za metr są pomijane jako ceny wariantów.",
    ],
  },
  {
    filename: "treevia.pl_catalogs_TREEVIA_MINI_31-do-testów.pdf",
    pageCount: 15,
    roomPlans: [
      { page: 5, floor: "parter", layoutVersion: "wersja-1", roomCount: 4 },
      { page: 6, floor: "parter", layoutVersion: "wersja-2", roomCount: 5 },
      { page: 7, floor: "antresola", layoutVersion: null, roomCount: 1 },
    ],
    variants: [
      { label: "BASIC", completionStandard: "deweloperski", priceMinPln: 182_379, priceMaxPln: null },
      { label: "ALL-IN", completionStandard: "deweloperski", priceMinPln: 240_945, priceMaxPln: null },
    ],
    ignoredAmountsPln: [196_969, 260_221, 58_566, 350],
    notes: [
      "Dwie wersje parteru są alternatywnymi układami i nie mogą współdzielić kluczy pokojów.",
      "Antresola jest jednym pokojem z powierzchnią użytkową 2,80 m2; 10,00 m2 powierzchni podłogi nie tworzy drugiego pokoju.",
    ],
  },
] as const satisfies readonly HouseImportGoldenCase[];
