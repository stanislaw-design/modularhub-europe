// MirageVision: szafy z podnośnikiem TV (Premium, Custom) jako 2 produkty, rozmiar szafy = wariant
// `katalogowy` (spec 0056), plus uzupełnienie istniejącego Econo Lift danymi szafy. Źródło: Spec Poster
// 2026-09-02 (Lift Cabinets) i karty rodzin Premium (rev 22.04.26), Custom (rev 4.05.25), Econo (rev 22.4.26).
// Bez cen (priceOnRequest). Pominięte celowo: Cooler Lift i Ultimate Entertainment Center (brak danych
// o zasilaniu, lodówka 110 V), Marine Dock Box (tylko ulotka). Zasilanie samej windy nie jest podane w źródle.

import type { L10n, Locale } from "./miragevision-tv-catalog";
export { MIRAGEVISION_PRODUCER_ID } from "./miragevision-tv-catalog";
export type { L10n, Locale };

const same = (value: string): L10n => ({ pl: value, en: value, de: value, nl: value });

export interface CabinetSize {
  key: string;
  label: L10n;
  skus: string[];
  /** Wymiary szafy S × W × G w calach (bez kółek). */
  dimsIn: [number, number, number];
  raisedIn: number;
  liftLb: number;
}

export interface LiftSeriesSource {
  id: string;
  name: L10n;
  description: L10n;
  usageNote: L10n;
  features: L10n[];
  defaultSize: string;
  sizes: CabinetSize[];
  specs: Record<string, { label: L10n; value: L10n }>;
  faq: { id: string; question: L10n; answer: L10n }[];
}

const L = {
  type: { pl: "Rodzaj", en: "Type", de: "Art", nl: "Type" },
  tvIncluded: { pl: "Telewizor w zestawie", en: "TV included", de: "Fernseher enthalten", nl: "Tv inbegrepen" },
  finish: { pl: "Wykończenie zewnętrzne", en: "Exterior finish", de: "Außenfinish", nl: "Buitenafwerking" },
  colors: { pl: "Kolory obudowy", en: "Cabinet colors", de: "Gehäusefarben", nl: "Kastkleuren" },
  trim: { pl: "Kolory listew", en: "Trim colors", de: "Leistenfarben", nl: "Lijstkleuren" },
  mechanism: { pl: "Mechanizm windy", en: "Lift mechanism", de: "Hubmechanismus", nl: "Liftmechanisme" },
  control: { pl: "Sterowanie windą", en: "Lift control", de: "Liftsteuerung", nl: "Liftbediening" },
  mobility: { pl: "Mobilność", en: "Mobility", de: "Mobilität", nl: "Mobiliteit" },
  craft: { pl: "Wykonanie", en: "Build", de: "Fertigung", nl: "Vervaardiging" },
  finishes: { pl: "Dostępne wykończenia", en: "Available finishes", de: "Verfügbare Oberflächen", nl: "Beschikbare afwerkingen" },
  sizes: { pl: "Szafy dla przekątnych TV", en: "Cabinets for TV sizes", de: "Schränke für TV-Größen", nl: "Kasten voor tv-formaten" },
  cabinetDims: { pl: "Wymiary szafy (szer. × wys. × gł.)", en: "Cabinet dimensions (W × H × D)", de: "Schrankmaße (B × H × T)", nl: "Kastafmetingen (B × H × D)" },
  raised: { pl: "Wysokość z uniesionym TV", en: "Height with TV raised", de: "Höhe mit angehobenem Fernseher", nl: "Hoogte met opgetilde tv" },
  lift: { pl: "Maksymalny udźwig windy", en: "Maximum lift capacity", de: "Maximale Traglast des Lifts", nl: "Maximaal hefvermogen" },
  compatible: { pl: "Zgodne telewizory", en: "Compatible TVs", de: "Kompatible Fernseher", nl: "Compatibele tv's" },
};

const IN_TO_CM = 2.54;
const LB_TO_KG = 0.45359237;
const fmt = (value: number, locale: Locale, digits = 1) => {
  const text = value.toFixed(digits);
  return locale === "en" ? text : text.replace(".", ",");
};
const cm = (inches: number, locale: Locale) => fmt(inches * IN_TO_CM, locale, 0);

const shortSize = (size: CabinetSize) => `${size.key.replace("-", "–")}″`;

/** Wiersz per rozmiar szafy ("32″: 95 × 75 × 58 cm | 43–50″: ..."), osobno wymiary, wysokość i udźwig. */
export function cabinetLines(series: LiftSeriesSource, locale: Locale) {
  const join = (pick: (size: CabinetSize) => string) => series.sizes.map((size) => `${shortSize(size)}: ${pick(size)}`).join(" | ");
  return {
    sizes: series.sizes.map(shortSize).join(", "),
    dims: join((size) => `${size.dimsIn.map((value) => cm(value, locale)).join(" × ")} cm`),
    raised: join((size) => `${cm(size.raisedIn, locale)} cm`),
    lift: join((size) => `${fmt(size.liftLb * LB_TO_KG, locale, 0)} kg`),
  };
}

export const SPEC_LABELS = { sizes: L.sizes, cabinetDims: L.cabinetDims, raised: L.raised, lift: L.lift };

const tvLabel = (range: string): L10n => ({
  pl: `Na TV ${range}″`,
  en: `For ${range}″ TV`,
  de: `Für ${range}″-Fernseher`,
  nl: `Voor ${range}″ tv`,
});

const faqWeather = {
  id: "ochrona-przed-pogoda",
  question: {
    pl: "Czy szafa chroni telewizor przed pogodą?",
    en: "Does the cabinet protect the TV from the weather?",
    de: "Schützt der Schrank den Fernseher vor dem Wetter?",
    nl: "Beschermt de kast de tv tegen het weer?",
  },
  answer: {
    pl: "Tak. Po opuszczeniu telewizor chowa się wewnątrz zamkniętej szafy, a specjalna pokrywa chroni wnętrze przed deszczem, kurzem i śniegiem. Producent zaleca takie przechowywanie także dla telewizorów zewnętrznych, bo ekran dłużej pozostaje czysty i chroniony.",
    en: "Yes. When lowered, the TV is hidden inside the closed cabinet, and a specially designed lid protects the interior from rain, dust and snow. The manufacturer recommends this kind of storage even for outdoor TVs, because the screen stays clean and protected for longer.",
    de: "Ja. Abgesenkt verschwindet der Fernseher im geschlossenen Schrank, und eine speziell gestaltete Abdeckung schützt das Innere vor Regen, Staub und Schnee. Der Hersteller empfiehlt diese Aufbewahrung auch für Outdoor-Fernseher, weil der Bildschirm länger sauber und geschützt bleibt.",
    nl: "Ja. Neergelaten verdwijnt de tv in de gesloten kast, en een speciaal ontworpen deksel beschermt het interieur tegen regen, stof en sneeuw. De fabrikant raadt deze opslag ook aan voor buitentelevisies, omdat het scherm zo langer schoon en beschermd blijft.",
  },
};

const faqTv = {
  id: "telewizor-w-zestawie",
  question: {
    pl: "Czy telewizor jest w zestawie?",
    en: "Is the TV included?",
    de: "Ist der Fernseher enthalten?",
    nl: "Is de tv inbegrepen?",
  },
  answer: {
    pl: "Nie, to szafa z windą bez telewizora. Rozmiar szafy dobiera się do przekątnej telewizora (patrz warianty). W naszym katalogu znajdziesz telewizory zewnętrzne MirageVision, które można w niej zamontować, a dobór pasującej szafy potwierdzamy przy zapytaniu.",
    en: "No, this is a lift cabinet without a TV. The cabinet size is chosen to match the TV screen size (see the variants). Our catalog includes MirageVision outdoor TVs that can be installed in it, and we confirm the matching cabinet when you send an inquiry.",
    de: "Nein, dies ist ein Liftschrank ohne Fernseher. Die Schrankgröße richtet sich nach der Bildschirmgröße des Fernsehers (siehe Varianten). In unserem Katalog finden Sie MirageVision-Outdoor-Fernseher, die sich einbauen lassen, und den passenden Schrank bestätigen wir bei einer Anfrage.",
    nl: "Nee, dit is een liftkast zonder tv. Het kastformaat wordt gekozen op basis van het schermformaat van de tv (zie de varianten). In onze catalogus vindt u MirageVision-buitentelevisies die erin passen, en de passende kast bevestigen we bij een offerteaanvraag.",
  },
};

const faqMove = {
  id: "mobilnosc",
  question: {
    pl: "Czy szafę można przesuwać?",
    en: "Can the cabinet be moved?",
    de: "Lässt sich der Schrank verschieben?",
    nl: "Kan de kast verplaatst worden?",
  },
  answer: {
    pl: "Tak, szafa ma kółka, więc można ją przetoczyć w inne miejsce. Kółka dodają około 2,5 cala (6,4 cm) do podanych wymiarów i wysokości.",
    en: "Yes, the cabinet has wheels, so you can roll it to another spot. The wheels add about 2.5 inches (6.4 cm) to the stated dimensions and height.",
    de: "Ja, der Schrank hat Rollen und lässt sich an eine andere Stelle rollen. Die Rollen addieren etwa 2,5 Zoll (6,4 cm) zu den angegebenen Maßen und der Höhe.",
    nl: "Ja, de kast heeft wieltjes, dus u kunt hem naar een andere plek rollen. De wieltjes voegen ongeveer 2,5 inch (6,4 cm) toe aan de genoemde afmetingen en hoogte.",
  },
};

const sharedFeatures: L10n[] = [
  {
    pl: "Pokrywa chroni wnętrze szafy przed deszczem, kurzem i śniegiem",
    en: "A lid protects the inside of the cabinet from rain, dust and snow",
    de: "Eine Abdeckung schützt das Innere des Schranks vor Regen, Staub und Schnee",
    nl: "Een deksel beschermt de binnenkant van de kast tegen regen, stof en sneeuw",
  },
  {
    pl: "Mechanizm windy ze stali malowanej proszkowo, napęd pasowy z siłownikiem",
    en: "Lift mechanism of powder-coated steel with a belt and actuator drive",
    de: "Hubmechanismus aus pulverbeschichtetem Stahl mit Riemen- und Aktuatorantrieb",
    nl: "Liftmechanisme van poedergecoat staal met riem- en actuatoraandrijving",
  },
  {
    pl: "Pilot RF z przewodowym sterowaniem zapasowym, zgodność z Alexa i Google Home",
    en: "RF remote with a wired backup control, compatible with Alexa and Google Home",
    de: "RF-Fernbedienung mit kabelgebundener Ersatzsteuerung, kompatibel mit Alexa und Google Home",
    nl: "RF-afstandsbediening met bekabelde reservebediening, compatibel met Alexa en Google Home",
  },
];

const commonSpecs = {
  type: {
    label: L.type,
    value: {
      pl: "Szafa z zmotoryzowaną windą do telewizora zewnętrznego",
      en: "Motorized lift cabinet for an outdoor TV",
      de: "Motorisierter Liftschrank für einen Outdoor-Fernseher",
      nl: "Gemotoriseerde liftkast voor een buitentelevisie",
    },
  },
  tvIncluded: {
    label: L.tvIncluded,
    value: { pl: "Nie, telewizor dokupuje się osobno", en: "No, the TV is bought separately", de: "Nein, der Fernseher wird separat gekauft", nl: "Nee, de tv wordt apart gekocht" },
  },
  mechanism: {
    label: L.mechanism,
    value: {
      pl: "Stal malowana proszkowo, napęd pasowy i siłownik",
      en: "Powder-coated steel, belt and actuator drive",
      de: "Pulverbeschichteter Stahl, Riemen- und Aktuatorantrieb",
      nl: "Poedergecoat staal, riem- en actuatoraandrijving",
    },
  },
  control: {
    label: L.control,
    value: {
      pl: "Pilot RF i zapasowe sterowanie przewodowe; zgodność z Alexa i Google Home",
      en: "RF remote and wired backup control; Alexa and Google Home compatible",
      de: "RF-Fernbedienung und kabelgebundene Ersatzsteuerung; kompatibel mit Alexa und Google Home",
      nl: "RF-afstandsbediening en bekabelde reservebediening; compatibel met Alexa en Google Home",
    },
  },
  mobility: {
    label: L.mobility,
    value: { pl: "Kółka (dodają ok. 6,4 cm wysokości)", en: "Wheels (add about 6.4 cm of height)", de: "Rollen (addieren ca. 6,4 cm Höhe)", nl: "Wieltjes (voegen ca. 6,4 cm hoogte toe)" },
  },
  craft: {
    label: L.craft,
    value: {
      pl: "Ręcznie, ok. 40 roboczogodzin na szafę",
      en: "Hand-built, about 40 man-hours per cabinet",
      de: "Handgefertigt, ca. 40 Arbeitsstunden pro Schrank",
      nl: "Handgemaakt, ca. 40 manuren per kast",
    },
  },
};

const premiumSizes: CabinetSize[] = [
  { key: "32", label: tvLabel("32"), skus: ["MPL-032NTV"], dimsIn: [37.5, 29.5, 23], raisedIn: 56.25, liftLb: 75 },
  { key: "43-50", label: tvLabel("43–50"), skus: ["MPL-043NTV", "MPL-050NTV"], dimsIn: [52.5, 36, 23], raisedIn: 70, liftLb: 100 },
  { key: "55-65", label: tvLabel("55–65"), skus: ["MPL-05565NTV"], dimsIn: [66, 41, 23], raisedIn: 70, liftLb: 100 },
  { key: "75-85", label: tvLabel("75–85"), skus: ["MPL-07585NTV"], dimsIn: [86, 51, 23], raisedIn: 90.5, liftLb: 200 },
];

const customSizes: CabinetSize[] = [
  { key: "55", label: tvLabel("55"), skus: ["MCL-055-NTV"], dimsIn: [66, 41, 23], raisedIn: 70, liftLb: 100 },
  { key: "65", label: tvLabel("65"), skus: ["MCL-065-NTV"], dimsIn: [66, 41, 23], raisedIn: 70, liftLb: 100 },
  { key: "75", label: tvLabel("75"), skus: ["MCL-075-NTV"], dimsIn: [86, 51, 23], raisedIn: 90.5, liftLb: 200 },
  { key: "85", label: tvLabel("85"), skus: ["MCL-085-NTV"], dimsIn: [86, 51, 23], raisedIn: 90.5, liftLb: 200 },
];

export const LIFT_SERIES: LiftSeriesSource[] = [
  {
    id: "7d1c8d33-5a0f-4f0e-9b3e-1c6a8a52f0a1",
    name: {
      pl: "Premium Lift — szafka z podnośnikiem TV ogrodowego",
      en: "Premium Lift — Outdoor TV Lift Cabinet",
      de: "Premium Lift — Liftschrank für Outdoor-Fernseher",
      nl: "Premium Lift — liftkast voor buitentelevisie",
    },
    description: {
      pl: "Szafa z zmotoryzowaną windą na telewizor zewnętrzny, ręcznie wykonana przez wyszkolonych rzemieślników MirageVision (około 40 roboczogodzin na sztukę). Obudowa z Poly ACM jest odporna na UV i ogień, a pokrywa chroni wnętrze przed deszczem, kurzem i śniegiem. Telewizor wysuwa się na pilocie RF, a po opuszczeniu chowa się w zamkniętej szafie. Szafa ma kółka. Cztery rozmiary na telewizory od 32″ do 85″, telewizor dokupuje się osobno.",
      en: "A motorized lift cabinet for an outdoor TV, hand-built by MirageVision's trained craftsmen (about 40 man-hours per unit). The Poly ACM housing is UV-resistant and fireproof, and a lid protects the interior from rain, dust and snow. The TV rises on an RF remote and hides in the closed cabinet when lowered. The cabinet has wheels. Four sizes for TVs from 32″ to 85″; the TV is bought separately.",
      de: "Ein motorisierter Liftschrank für einen Outdoor-Fernseher, von geschulten MirageVision-Handwerkern von Hand gefertigt (rund 40 Arbeitsstunden pro Stück). Das Poly-ACM-Gehäuse ist UV-beständig und feuerfest, und eine Abdeckung schützt das Innere vor Regen, Staub und Schnee. Der Fernseher fährt per RF-Fernbedienung hoch und verschwindet abgesenkt im geschlossenen Schrank. Der Schrank hat Rollen. Vier Größen für Fernseher von 32″ bis 85″; der Fernseher wird separat gekauft.",
      nl: "Een gemotoriseerde liftkast voor een buitentelevisie, met de hand gemaakt door getrainde vakmensen van MirageVision (ongeveer 40 manuren per stuk). De Poly ACM-behuizing is UV-bestendig en brandwerend, en een deksel beschermt het interieur tegen regen, stof en sneeuw. De tv komt omhoog met een RF-afstandsbediening en verdwijnt neergelaten in de gesloten kast. De kast heeft wieltjes. Vier formaten voor tv's van 32″ tot 85″; de tv wordt apart gekocht.",
    },
    usageNote: {
      pl: "Szafa jest przeznaczona do ochrony telewizora zewnętrznego i do ukrycia go, gdy nie jest używany. Rozmiar dobiera się do przekątnej telewizora.",
      en: "The cabinet is made to protect an outdoor TV and hide it when not in use. Pick the size that matches the TV screen size.",
      de: "Der Schrank schützt einen Outdoor-Fernseher und verbirgt ihn, wenn er nicht benutzt wird. Die Größe richtet sich nach der Bildschirmgröße des Fernsehers.",
      nl: "De kast beschermt een buitentelevisie en verbergt hem wanneer hij niet gebruikt wordt. Kies het formaat dat bij het schermformaat van de tv past.",
    },
    features: sharedFeatures,
    defaultSize: "43-50",
    sizes: premiumSizes,
    specs: {
      type: commonSpecs.type,
      tvIncluded: commonSpecs.tvIncluded,
      finish: {
        label: L.finish,
        value: { pl: "Poly ACM, odporny na UV i ogień", en: "Poly ACM, UV-resistant and fireproof", de: "Poly ACM, UV-beständig und feuerfest", nl: "Poly ACM, UV-bestendig en brandwerend" },
      },
      colors: {
        label: L.colors,
        value: { pl: "Biały, czarny, szczotkowane aluminium", en: "White, black, brushed aluminum", de: "Weiß, Schwarz, gebürstetes Aluminium", nl: "Wit, zwart, geborsteld aluminium" },
      },
      trim: {
        label: L.trim,
        value: { pl: "Biały, czarny, srebrny", en: "White, black, silver", de: "Weiß, Schwarz, Silber", nl: "Wit, zwart, zilver" },
      },
      mechanism: commonSpecs.mechanism,
      control: commonSpecs.control,
      mobility: commonSpecs.mobility,
      craft: commonSpecs.craft,
    },
    faq: [faqWeather, faqTv, faqMove],
  },
  {
    id: "c2f4e6a8-91b3-4d57-8a60-3f9d1e7b4c52",
    name: {
      pl: "Custom Lift — szafka z podnośnikiem TV na zamówienie",
      en: "Custom Lift — Made-to-Order Outdoor TV Lift Cabinet",
      de: "Custom Lift — Liftschrank für Outdoor-Fernseher nach Maß",
      nl: "Custom Lift — liftkast voor buitentelevisie op maat",
    },
    description: {
      pl: "Szafa z zmotoryzowaną windą na telewizor zewnętrzny, wykonywana na zamówienie przez wyszkolonych rzemieślników MirageVision (ponad 40 roboczogodzin na sztukę). Konstrukcja jak w serii Premium (rdzeń Poly ACM, pokrywa chroniąca przed deszczem, kurzem i śniegiem), ale wykończenie zewnętrzne wybierasz samodzielnie: stal nierdzewna, marmur, granit, drewno lub kamień. Cztery rozmiary na telewizory od 55″ do 85″, telewizor dokupuje się osobno.",
      en: "A motorized lift cabinet for an outdoor TV, made to order by MirageVision's trained craftsmen (over 40 man-hours per unit). The construction matches the Premium series (Poly ACM core, a lid protecting against rain, dust and snow), but you choose the exterior finish yourself: stainless steel, marble, granite, wood or stone. Four sizes for TVs from 55″ to 85″; the TV is bought separately.",
      de: "Ein motorisierter Liftschrank für einen Outdoor-Fernseher, nach Maß von geschulten MirageVision-Handwerkern gefertigt (über 40 Arbeitsstunden pro Stück). Die Bauweise entspricht der Serie Premium (Poly-ACM-Kern, Abdeckung gegen Regen, Staub und Schnee), das Außenfinish wählen Sie jedoch selbst: Edelstahl, Marmor, Granit, Holz oder Stein. Vier Größen für Fernseher von 55″ bis 85″; der Fernseher wird separat gekauft.",
      nl: "Een gemotoriseerde liftkast voor een buitentelevisie, op bestelling gemaakt door getrainde vakmensen van MirageVision (meer dan 40 manuren per stuk). De constructie komt overeen met de Premium-serie (Poly ACM-kern, een deksel tegen regen, stof en sneeuw), maar de buitenafwerking kiest u zelf: roestvrij staal, marmer, graniet, hout of steen. Vier formaten voor tv's van 55″ tot 85″; de tv wordt apart gekocht.",
    },
    usageNote: {
      pl: "Szafa wykonywana jest na zamówienie. Wykończenie i szczegóły ustala się przy zapytaniu ofertowym. Rozmiar dobiera się do przekątnej telewizora.",
      en: "The cabinet is made to order. The finish and details are agreed when you send an inquiry. Pick the size that matches the TV screen size.",
      de: "Der Schrank wird nach Maß gefertigt. Oberfläche und Details werden bei einer Anfrage abgestimmt. Die Größe richtet sich nach der Bildschirmgröße des Fernsehers.",
      nl: "De kast wordt op bestelling gemaakt. Afwerking en details worden afgestemd bij een offerteaanvraag. Kies het formaat dat bij het schermformaat van de tv past.",
    },
    features: [
      {
        pl: "Własne wykończenie zewnętrzne: stal nierdzewna, marmur, granit, drewno, kamień",
        en: "Your own exterior finish: stainless steel, marble, granite, wood, stone",
        de: "Eigenes Außenfinish: Edelstahl, Marmor, Granit, Holz, Stein",
        nl: "Eigen buitenafwerking: roestvrij staal, marmer, graniet, hout, steen",
      },
      ...sharedFeatures,
    ],
    defaultSize: "65",
    sizes: customSizes,
    specs: {
      type: commonSpecs.type,
      tvIncluded: commonSpecs.tvIncluded,
      finish: {
        label: L.finish,
        value: { pl: "Rdzeń Poly ACM, wykończenie do wyboru", en: "Poly ACM core, finish of your choice", de: "Poly-ACM-Kern, Finish nach Wahl", nl: "Poly ACM-kern, afwerking naar keuze" },
      },
      finishes: {
        label: L.finishes,
        value: {
          pl: "Stal nierdzewna, marmur, jasny granit, imitacja marmuru Carrara, imitacja jasnego drewna, kamień łupkowy (okleina winylowa)",
          en: "Stainless steel, marble, off-white granite, Carrara marble look, light wood grain, slate stone (vinyl wrap)",
          de: "Edelstahl, Marmor, cremeweißer Granit, Carrara-Marmor-Optik, helle Holzmaserung, Schiefer (Vinylfolie)",
          nl: "Roestvrij staal, marmer, gebroken wit graniet, Carrara-marmerlook, lichte houtnerf, leisteen (vinylfolie)",
        },
      },
      trim: {
        label: L.trim,
        value: { pl: "Biały, czarny, srebrny lub na zamówienie", en: "White, black, silver or custom", de: "Weiß, Schwarz, Silber oder nach Wunsch", nl: "Wit, zwart, zilver of op maat" },
      },
      mechanism: commonSpecs.mechanism,
      control: commonSpecs.control,
      mobility: commonSpecs.mobility,
      craft: {
        label: L.craft,
        value: {
          pl: "Na zamówienie, ręcznie, ponad 40 roboczogodzin na szafę",
          en: "Made to order, hand-built, over 40 man-hours per cabinet",
          de: "Nach Maß, handgefertigt, über 40 Arbeitsstunden pro Schrank",
          nl: "Op bestelling, handgemaakt, meer dan 40 manuren per kast",
        },
      },
    },
    faq: [faqWeather, faqTv, faqMove],
  },
];

/** Uzupełnienie istniejącego Econo Lift danymi szafy z posteru 2026-09-02 i karty Econo (rev 22.4.26). */
export const ECONO_PRODUCT_ID = "19f6add0-0991-4737-852e-f3206b650775";

export const ECONO_EXTRA_SPECS: Record<string, { label: L10n; value: L10n }> = {
  wymiarySzafki: {
    label: L.cabinetDims,
    value: same("127 × 106 × 73 cm (50 × 41.75 × 28.75″)"),
  },
  wysokośćPoUniesieniu: {
    label: L.raised,
    value: same("173 cm (68″)"),
  },
  maksymalnyUdźwigWindy: {
    label: L.lift,
    value: {
      pl: "68 kg (150 lb), łącznie z telewizorem, pokrywą i wykończeniem",
      en: "68 kg (150 lb), including the TV, lid and finish",
      de: "68 kg (150 lb), einschließlich Fernseher, Abdeckung und Finish",
      nl: "68 kg (150 lb), inclusief tv, deksel en afwerking",
    },
  },
  kolorSzafki: {
    label: { pl: "Kolor szafki", en: "Cabinet color", de: "Schrankfarbe", nl: "Kastkleur" },
    value: { pl: "Beżowy korpus, zielona pokrywa (tworzywo)", en: "Beige body, green lid (plastic)", de: "Beiger Korpus, grüne Abdeckung (Kunststoff)", nl: "Beige kast, groen deksel (kunststof)" },
  },
  sterowanieWindy: {
    label: L.control,
    value: { pl: "Pilot RF i zapasowe sterowanie przewodowe", en: "RF remote and wired backup control", de: "RF-Fernbedienung und kabelgebundene Ersatzsteuerung", nl: "RF-afstandsbediening en bekabelde reservebediening" },
  },
  zgodneTelewizory: {
    label: L.compatible,
    value: same("43″, 50″"),
  },
};
