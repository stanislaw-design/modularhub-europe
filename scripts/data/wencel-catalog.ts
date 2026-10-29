// Przemysław Wencel (osoba prowadząca firmę pod własnym nazwiskiem): domki na stalowej ramie, oferta przekazana
// przez producenta wraz z wizualizacjami (_docs/przemyslawwencel/, kopie zmniejszone do tmp/wencel/).
// Każdy tekst widoczny dla klienta ma tu cztery wersje językowe (pl jest źródłem, en/de/nl idą do tabel
// tłumaczeń, spec 0067). Wizualizacje przekazał sam producent do publikacji.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:wencel";
export const PRODUCER_ID = "e0030000-0000-4000-8000-000000000103";

export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`wencel:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// NBP, tabela 196/A/NBP/2026 z 2026-10-08: 1 EUR = 4,3789 PLN (ten sam kurs co Logbar i FrameDEV).
export const EUR_PLN_RATE = 4.3789;
export const plnToEurCents = (amountPln: number): number => Math.round(amountPln / EUR_PLN_RATE) * 100;
export const priceCentsOf = (item: { pricePln?: number; priceEur?: number }): number => {
  if ((item.pricePln === undefined) === (item.priceEur === undefined)) throw new Error("Podaj dokładnie jedną z cen: pricePln albo priceEur");
  return item.priceEur !== undefined ? item.priceEur * 100 : plnToEurCents(item.pricePln!);
};

export const WENCEL_PRODUCER = {
  name: "Przemysław Wencel",
  nip: "CATALOG-WENCEL",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent domków na solidnej stalowej ramie, które można łatwo i wielokrotnie przenosić. Ściany w technologii szkieletowej z drewna konstrukcyjnego C-24 wypełnia się wybraną izolacją (piana PUR, wełna mineralna lub włókno drzewne), a elewację i wykończenie wnętrz dobiera się z kilku wariantów. Układ pomieszczeń ustala klient, a producent jest otwarty na jego propozycje.",
    "Producer of cabins built on a solid steel frame that can be moved easily and repeatedly. Walls are timber frame in C-24 structural timber filled with the chosen insulation (PUR foam, mineral wool or wood fibre), and the facade and interior finish are chosen from several options. The client decides the room layout, and the producer is open to the client's proposals.",
    "Hersteller von Ferienhäusern auf einem massiven Stahlrahmen, die sich leicht und wiederholt versetzen lassen. Die Wände in Holzrahmenbauweise aus Konstruktionsholz C-24 werden mit der gewählten Dämmung (PUR-Schaum, Mineralwolle oder Holzfaser) gefüllt, Fassade und Innenausbau werden aus mehreren Varianten gewählt. Die Raumaufteilung bestimmt der Kunde, der Hersteller ist für dessen Vorschläge offen.",
    "Producent van huisjes op een stevig stalen frame die gemakkelijk en herhaaldelijk kunnen worden verplaatst. De wanden zijn houtskeletbouw van constructiehout C-24, gevuld met de gekozen isolatie (PUR-schuim, minerale wol of houtvezel); gevel en interieurafwerking kies je uit meerdere varianten. De klant bepaalt de indeling van de ruimtes en de producent staat open voor zijn voorstellen.",
  ),
} as const;

export const ELIGIBILITY_REASON = L(
  "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
  "Feasibility and formal requirements depend on the specific plot and local regulations.",
  "Machbarkeit und formale Anforderungen hängen vom konkreten Grundstück und den örtlichen Vorgaben ab.",
  "De haalbaarheid en de formele vereisten hangen af van de specifieke kavel en de lokale regels.",
);

export const CONSTRUCTION_SYSTEM = L(
  "Stalowa rama nośna z wypełnieniem ścian w technologii szkieletowej: drewno konstrukcyjne C-24 o przekroju 200x60 mm, izolacja do wyboru (piana PUR, wełna mineralna lub włókno drzewne). Podłoga: płyta OSB z panelem winylowym.",
  "Load-bearing steel frame with timber-frame walls: C-24 structural timber, 200x60 mm section, insulation of choice (PUR foam, mineral wool or wood fibre). Floor: OSB board with vinyl panels.",
  "Tragender Stahlrahmen mit Wänden in Holzrahmenbauweise: Konstruktionsholz C-24, Querschnitt 200x60 mm, Dämmung nach Wahl (PUR-Schaum, Mineralwolle oder Holzfaser). Boden: OSB-Platte mit Vinylpaneelen.",
  "Dragend stalen frame met houtskeletwanden: constructiehout C-24, doorsnede 200x60 mm, isolatie naar keuze (PUR-schuim, minerale wol of houtvezel). Vloer: OSB-plaat met vinylpanelen.",
);

export const CUSTOMIZATION_SCOPE = L(
  "Ostateczny układ pomieszczeń ustala klient, producent jest otwarty na jego propozycje. Elewację, izolację, wykończenie wnętrza i ogrzewanie wybiera się w opcjach dodatkowych (cena bazowa zakłada podstawowe warianty, dopłaty są podane przy opcjach).",
  "The client decides the final room layout, and the producer is open to the client's proposals. Facade, insulation, interior finish and heating are chosen in the additional options (the base price assumes the basic variants, surcharges are shown on each option).",
  "Die endgültige Raumaufteilung bestimmt der Kunde, der Hersteller ist für dessen Vorschläge offen. Fassade, Dämmung, Innenausbau und Heizung werden in den Zusatzoptionen gewählt (der Basispreis geht von den Standardvarianten aus, Aufpreise stehen bei den Optionen).",
  "De klant bepaalt de uiteindelijke indeling en de producent staat open voor zijn voorstellen. Gevel, isolatie, interieurafwerking en verwarming kies je in de aanvullende opties (de basisprijs gaat uit van de standaardvarianten, toeslagen staan bij de opties).",
);

// Opcje dodatkowe (spec 0059): oferta nie podaje dopłat, więc każda opcja ma cenę 0 i nie zmienia ceny produktu
// (konfigurator pokazuje przy niej "w cenie"). Grupy są wspólne dla wszystkich produktów tego producenta.
export interface OptionGroupSource {
  key: string;
  name: L10n;
  selectionType: "single" | "multi";
  options: { key: string; label: L10n; imageFile?: string; priceNote: L10n }[];
}

// Dopłaty z odpowiedzi producenta (2026-10-27), przeliczone kursem NBP (4,3789): CORTEN 200 zł/m² wobec 80 zł/m²
// blachy na rąbek (+120 zł/m² = 27 €), włókno drzewne 100 zł/m² wobec 50 zł/m² wełny (+50 zł/m² = 11 €),
// klimatyzacja 4 500 zł = 1 028 €, piec na pelet ok. 15 000 zł = 3 426 €, maty na podczerwień 300-400 zł/m²
// = 69-91 €/m². Cena bazowa zakłada podstawowe warianty (blacha na rąbek, wełna mineralna 20 cm). Opisy nie wchodzą do sumy.
const IN_BASE = L("w cenie bazowej", "included in the base price", "im Basispreis enthalten", "inbegrepen in de basisprijs");
const TBD = L("dopłata do ustalenia", "surcharge to be agreed", "Aufpreis nach Absprache", "toeslag in overleg");
const TBD_PRODUCER = L("do ustalenia z producentem", "to be agreed with the producer", "mit dem Hersteller zu vereinbaren", "af te stemmen met de producent");

export const OPTION_GROUPS: OptionGroupSource[] = [
  {
    key: "elewacja",
    name: L("Elewacja", "Facade", "Fassade", "Gevel"),
    selectionType: "single",
    options: [
      { key: "blacha-rabek", imageFile: "tmp/wencel/opcje/elewacja-blacha-rabek.jpg", label: L("Blacha na rąbek", "Standing-seam sheet metal", "Stehfalzblech", "Liggende felsplaat"), priceNote: IN_BASE },
      { key: "boazeria-drewniana", imageFile: "tmp/wencel/opcje/elewacja-boazeria-drewniana.jpg", label: L("Drewniana boazeria", "Timber cladding", "Holzverkleidung", "Houten bekleding"), priceNote: TBD },
      { key: "profile-pcv", imageFile: "tmp/wencel/opcje/elewacja-profile-pcv.jpg", label: L("Profile PCV", "PVC profiles", "PVC-Profile", "PVC-profielen"), priceNote: TBD },
      {
        key: "blacha-corten",
        imageFile: "tmp/wencel/opcje/elewacja-blacha-corten.jpg",
        label: L("Blacha CORTEN", "CORTEN steel sheet", "CORTEN-Stahlblech", "CORTEN-staalplaat"),
        priceNote: L("+27 € za m²", "+27 € per m²", "+27 € pro m²", "+27 € per m²"),
      },
    ],
  },
  {
    key: "izolacja",
    name: L("Izolacja ścian i dachu", "Wall and roof insulation", "Wand- und Dachdämmung", "Wand- en dakisolatie"),
    selectionType: "single",
    options: [
      {
        key: "welna-mineralna",
        imageFile: "tmp/wencel/opcje/izolacja-welna-mineralna.jpg",
        label: L("Wełna mineralna", "Mineral wool", "Mineralwolle", "Minerale wol"),
        priceNote: IN_BASE,
      },
      {
        key: "wlokno-drzewne",
        imageFile: "tmp/wencel/opcje/izolacja-wlokno-drzewne.jpg",
        label: L("Włókno drzewne", "Wood fibre", "Holzfaser", "Houtvezel"),
        priceNote: L("+11 € za m²", "+11 € per m²", "+11 € pro m²", "+11 € per m²"),
      },
      { key: "piana-pur", imageFile: "tmp/wencel/opcje/izolacja-piana-pur.jpg", label: L("Piana PUR", "PUR foam", "PUR-Schaum", "PUR-schuim"), priceNote: TBD },
    ],
  },
  {
    key: "wnetrze",
    name: L("Wykończenie wnętrza", "Interior finish", "Innenausbau", "Interieurafwerking"),
    selectionType: "single",
    options: [
      {
        key: "boazeria-swierk",
        imageFile: "tmp/wencel/opcje/wnetrze-boazeria-swierk.jpg",
        label: L("Boazeria ze świerku skandynawskiego", "Scandinavian spruce panelling", "Profilholz aus skandinavischer Fichte", "Scandinavisch vurenhout"),
        priceNote: TBD_PRODUCER,
      },
      {
        key: "strama-panels",
        imageFile: "tmp/wencel/opcje/wnetrze-strama-panels.jpg",
        label: L("Panel STRAMA-PANELS", "STRAMA-PANELS panel", "STRAMA-PANELS-Paneel", "STRAMA-PANELS-paneel"),
        priceNote: TBD_PRODUCER,
      },
      {
        key: "plyta-gk",
        imageFile: "tmp/wencel/opcje/wnetrze-plyta-gk.jpg",
        label: L("Płyta gipsowo-kartonowa", "Plasterboard", "Gipskartonplatte", "Gipsplaat"),
        priceNote: TBD_PRODUCER,
      },
    ],
  },
  {
    key: "ogrzewanie",
    name: L("Ogrzewanie i klimatyzacja", "Heating and air conditioning", "Heizung und Klimatisierung", "Verwarming en airconditioning"),
    selectionType: "multi",
    options: [
      {
        key: "maty-podczerwien",
        imageFile: "tmp/wencel/opcje/ogrzewanie-maty-podczerwien.jpg",
        label: L("Maty na podczerwień w podłodze", "Infrared underfloor mats", "Infrarot-Fußbodenmatten", "Infraroodmatten in de vloer"),
        priceNote: L("ok. +69–91 € za m²", "approx. +69–91 € per m²", "ca. +69–91 € pro m²", "ca. +69–91 € per m²"),
      },
      {
        key: "klimatyzacja",
        imageFile: "tmp/wencel/opcje/ogrzewanie-klimatyzacja.jpg",
        label: L("Klimatyzacja grzewczo-chłodząca", "Heating and cooling air conditioning", "Heiz- und Kühlklimaanlage", "Verwarmende en koelende airconditioning"),
        priceNote: L("+1 028 €", "+1,028 €", "+1.028 €", "+1.028 €"),
      },
      {
        key: "piec-pelet",
        imageFile: "tmp/wencel/opcje/ogrzewanie-piec-pelet.jpg",
        label: L("Piec na pelet", "Pellet stove", "Pelletofen", "Pelletkachel"),
        priceNote: L("ok. +3 426 €", "approx. +3,426 €", "ca. +3.426 €", "ca. +3.426 €"),
      },
    ],
  },
];

export const INSULATION = "Do wyboru: piana PUR, wełna mineralna lub włókno drzewne (ściany 200x60 mm).";
export const WALL_BUILD_UP = "Stalowa rama nośna, szkielet z drewna konstrukcyjnego C-24 200x60 mm z izolacją do wyboru.";
export const HEAT_SOURCE_NOTE = "Do wyboru: maty na podczerwień w podłodze, klimatyzacja grzewczo-chłodząca lub piec na pelet.";

export interface WencelProjectSource {
  key: string;
  id: string;
  name: string;
  floorAreaM2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  storeys: number;
  roofType: L10n;
  description: L10n;
  /** Cena netto w PLN (przeliczana kursem NBP) albo w EUR, gdy producent podaje euro. Dokładnie jedno z dwóch. */
  pricePln?: number;
  priceEur?: number;
  scope: L10n;
  excluded: L10n;
  includedItems: L10n[];
  rooms: { name: L10n; areaM2: number; floorLevel: "parter" | "pietro" }[];
  builtUpAreaM2?: number;
  /** Czas realizacji od zamówienia i zaliczki, w tygodniach (odpowiedź producenta 2026-10-27: ok. 1 miesiąc). */
  leadTimeWeeks?: { min: number; max: number };
  /** Domyślnie "rekreacyjny-caloroczny". */
  category?: "caloroczny" | "rekreacyjny-caloroczny" | "mobilny";
  /** Domyślnie "temporary" (dom na stalowej ramie, który można przenosić); null = oferta nie podaje. */
  foundationStatus?: "temporary" | "permanent" | null;
  /** Które grupy opcji dodatkowych dostaje produkt; domyślnie wszystkie (gdy oferta nie ustala wyboru, żadne). */
  optionGroupKeys?: string[];
  /** Nadpisuje wspólny tekst o dopasowaniu pod klienta. */
  customizationScope?: L10n;
  /** Nadpisuje pola danych technicznych (domyślne: DEFAULT_SPECS w skrypcie importu). */
  specs?: {
    wallBuildUp?: string;
    insulation?: string;
    windowClass?: string;
    ventilation?: "grawitacyjna" | "mechaniczna-nawiewno-wywiewna" | "rekuperacja" | "brak" | "inna";
    ventilationOther?: string;
    heatSourceOther?: string;
    constructionTechnology?: "modulowa-stal-lekka" | "inne";
    constructionTechnologyOther?: string;
  };
  /** Nadpisuje wspólny opis konstrukcji, gdy oferta podaje dane specyficzne dla modelu. */
  constructionSystem?: L10n;
  /** Pierwsze zdjęcie jest okładką. */
  photos: string[];
  floorPlans: { file: string; floorLevel: "parter" | "pietro" }[];
  /** Zdjęcia prawdziwych realizacji: osobna sekcja "Realizacje tego projektu", poza galerią główną. */
  realizations: string[];
}

export const WENCEL_PROJECTS: WencelProjectSource[] = [
  {
    key: "domek-podwojny",
    id: detUuid("product:domek-podwojny"),
    name: "Domek Podwójny 75",
    floorAreaM2: 75,
    bedrooms: 1,
    bathrooms: 1,
    storeys: 1,
    roofType: L("Dach płaski", "Flat roof", "Flachdach", "Plat dak"),
    description: L(
      "Domek na stalowej ramie złożony z dwóch modułów po 34 m², połączonych zadaszonym łącznikiem o powierzchni 7 m², z tarasem 15 m² (razem 90 m²). Jedna część to strefa wypoczynkowa z aneksem kuchennym i łazienką, druga to salon z sypialnią. Dom można wielokrotnie przenosić. Cena obejmuje instalację elektryczną i hydrauliczną wykonaną zgodnie z obowiązującymi normami, bez umeblowania i sprzętu. Układ pomieszczeń ustala klient.",
      "A cabin on a steel frame made of two 34 m² modules joined by a covered 7 m² connector, with a 15 m² terrace (90 m² in total). One part is a leisure area with a kitchenette and bathroom, the other a living room with a bedroom. The house can be moved many times. The price includes electrical and plumbing installations made to current standards, without furniture and appliances. The client decides the room layout.",
      "Ein Haus auf Stahlrahmen aus zwei Modulen von je 34 m², verbunden durch einen überdachten Verbinder von 7 m², mit einer 15 m² großen Terrasse (insgesamt 90 m²). Ein Teil ist der Aufenthaltsbereich mit Küchenzeile und Bad, der andere ein Wohnzimmer mit Schlafzimmer. Das Haus lässt sich mehrfach versetzen. Der Preis umfasst Elektro- und Sanitärinstallation nach geltenden Normen, ohne Möbel und Geräte. Die Raumaufteilung bestimmt der Kunde.",
      "Een huisje op een stalen frame, opgebouwd uit twee modules van 34 m², verbonden door een overdekte verbinding van 7 m², met een terras van 15 m² (samen 90 m²). Het ene deel is een verblijfsruimte met keukenhoek en badkamer, het andere een woonkamer met slaapkamer. Het huis kan meerdere keren worden verplaatst. De prijs omvat de elektrische en sanitaire installatie volgens de geldende normen, zonder meubels en apparatuur. De klant bepaalt de indeling.",
    ),
    pricePln: 349000,
    scope: L(
      "Dom przedstawiony na wizualizacjach: dwa moduły 34 m², łącznik 7 m² i taras 15 m², wraz z instalacją elektryczną i hydrauliczną.",
      "The house shown in the visualisations: two 34 m² modules, a 7 m² connector and a 15 m² terrace, with electrical and plumbing installations.",
      "Das auf den Visualisierungen gezeigte Haus: zwei Module von 34 m², ein Verbinder von 7 m² und eine Terrasse von 15 m², mit Elektro- und Sanitärinstallation.",
      "Het huis op de visualisaties: twee modules van 34 m², een verbinding van 7 m² en een terras van 15 m², met elektrische en sanitaire installatie.",
    ),
    excluded: L(
      "Transport, umeblowanie i sprzęt. Cena jest kwotą netto.",
      "Transport, furniture and appliances. The price is a net amount.",
      "Transport, Möblierung und Geräte. Der Preis ist ein Nettobetrag.",
      "Transport, meubilering en apparatuur. De prijs is een nettobedrag.",
    ),
    includedItems: [
      L(
        "Konstrukcja: stalowa rama nośna, ściany szkieletowe z drewna C-24 200x60 mm",
        "Structure: load-bearing steel frame, C-24 timber-frame walls 200x60 mm",
        "Konstruktion: tragender Stahlrahmen, Holzrahmenwände aus C-24 200x60 mm",
        "Constructie: dragend stalen frame, houtskeletwanden van C-24 200x60 mm",
      ),
      L(
        "Izolacja ścian do wyboru: piana PUR, wełna mineralna lub włókno drzewne",
        "Wall insulation of choice: PUR foam, mineral wool or wood fibre",
        "Wanddämmung nach Wahl: PUR-Schaum, Mineralwolle oder Holzfaser",
        "Wandisolatie naar keuze: PUR-schuim, minerale wol of houtvezel",
      ),
      L(
        "Elewacja i wykończenie wnętrz w wybranym wariancie",
        "Facade and interior finish in the chosen variant",
        "Fassade und Innenausbau in der gewählten Variante",
        "Gevel en interieurafwerking in de gekozen variant",
      ),
      L(
        "Podłoga: płyta OSB z panelem winylowym",
        "Floor: OSB board with vinyl panels",
        "Boden: OSB-Platte mit Vinylpaneelen",
        "Vloer: OSB-plaat met vinylpanelen",
      ),
      L(
        "Instalacja elektryczna wykonana według obowiązujących norm",
        "Electrical installation made to current standards",
        "Elektroinstallation nach geltenden Normen",
        "Elektrische installatie volgens de geldende normen",
      ),
      L(
        "Instalacja hydrauliczna wykonana według obowiązujących norm",
        "Plumbing installation made to current standards",
        "Sanitärinstallation nach geltenden Normen",
        "Sanitaire installatie volgens de geldende normen",
      ),
      L("Taras 15 m²", "15 m² terrace", "Terrasse 15 m²", "Terras 15 m²"),
    ],
    rooms: [
      {
        name: L(
          "Moduł wypoczynkowy z aneksem kuchennym i łazienką",
          "Leisure module with kitchenette and bathroom",
          "Aufenthaltsmodul mit Küchenzeile und Bad",
          "Verblijfsmodule met keukenhoek en badkamer",
        ),
        areaM2: 34,
        floorLevel: "parter",
      },
      {
        name: L("Moduł z salonem i sypialnią", "Module with living room and bedroom", "Modul mit Wohnzimmer und Schlafzimmer", "Module met woonkamer en slaapkamer"),
        areaM2: 34, floorLevel: "parter",
      },
      { name: L("Łącznik budynków", "Connector between the modules", "Verbinder der Gebäude", "Verbinding tussen de modules"), areaM2: 7, floorLevel: "parter" },
    ],
    photos: [
      "tmp/wencel/wencel-domek-podwojny-front.jpg",
      "tmp/wencel/wencel-domek-podwojny-widok.jpg",
      "tmp/wencel/wencel-domek-podwojny-wnetrze.jpg",
    ],
    floorPlans: [],
    realizations: ["tmp/wencel/wencel-domek-podwojny-realizacja-1.jpg", "tmp/wencel/wencel-domek-podwojny-realizacja-2.jpg"],
  },
  {
    key: "stodola",
    id: detUuid("product:stodola"),
    name: "Stodoła 60",
    floorAreaM2: 60,
    builtUpAreaM2: 40,
    bedrooms: 2,
    bathrooms: 1,
    storeys: 2,
    roofType: L("Dach dwuspadowy", "Gable roof", "Satteldach", "Zadeldak"),
    description: L(
      "Domek w formie stodoły na stalowej ramie: 40 m² podstawy i 20 m² antresoli, razem 60 m² powierzchni użytkowej. Na parterze jest część wypoczynkowa z aneksem kuchennym, łazienka i sypialnia, na piętrze druga sypialnia. Ściany i dach mają grubość 25 cm. Wizualizacje pokazują trzy warianty elewacji: drewnianą boazerię, blachę CORTEN i ciemną blachę na rąbek. Dom można wielokrotnie przenosić. Cena obejmuje instalację elektryczną i hydrauliczną wykonaną zgodnie z obowiązującymi normami, bez umeblowania i sprzętu. Układ pomieszczeń ustala klient.",
      "A barn-style cabin on a steel frame: 40 m² footprint plus a 20 m² mezzanine, 60 m² of usable area in total. The ground floor has a leisure area with a kitchenette, a bathroom and a bedroom, and the upper floor a second bedroom. Walls and roof are 25 cm thick. The visualisations show three facade variants: timber cladding, CORTEN steel and dark standing-seam sheet metal. The house can be moved many times. The price includes electrical and plumbing installations made to current standards, without furniture and appliances. The client decides the room layout.",
      "Ein Haus in Scheunenform auf Stahlrahmen: 40 m² Grundfläche plus 20 m² Galerie, insgesamt 60 m² Nutzfläche. Im Erdgeschoss befinden sich ein Aufenthaltsbereich mit Küchenzeile, ein Bad und ein Schlafzimmer, im Obergeschoss ein zweites Schlafzimmer. Wände und Dach sind 25 cm dick. Die Visualisierungen zeigen drei Fassadenvarianten: Holzverkleidung, CORTEN-Stahl und dunkles Stehfalzblech. Das Haus lässt sich mehrfach versetzen. Der Preis umfasst Elektro- und Sanitärinstallation nach geltenden Normen, ohne Möbel und Geräte. Die Raumaufteilung bestimmt der Kunde.",
      "Een huisje in de vorm van een schuur op een stalen frame: 40 m² grondoppervlak plus 20 m² vide, samen 60 m² bruikbare oppervlakte. Op de begane grond bevinden zich een verblijfsruimte met keukenhoek, een badkamer en een slaapkamer, op de verdieping een tweede slaapkamer. Wanden en dak zijn 25 cm dik. De visualisaties tonen drie gevelvarianten: houten bekleding, CORTEN-staal en donkere liggende felsplaat. Het huis kan meerdere keren worden verplaatst. De prijs omvat de elektrische en sanitaire installatie volgens de geldende normen, zonder meubels en apparatuur. De klant bepaalt de indeling.",
    ),
    constructionSystem: L(
      "Stalowa rama nośna z wypełnieniem ścian w technologii szkieletowej: drewno konstrukcyjne C-24, izolacja do wyboru (piana PUR, wełna mineralna lub włókno drzewne), grubość ściany i dachu 25 cm. Podłoga: płyta OSB z panelem winylowym.",
      "Load-bearing steel frame with timber-frame walls: C-24 structural timber, insulation of choice (PUR foam, mineral wool or wood fibre), wall and roof thickness 25 cm. Floor: OSB board with vinyl panels.",
      "Tragender Stahlrahmen mit Wänden in Holzrahmenbauweise: Konstruktionsholz C-24, Dämmung nach Wahl (PUR-Schaum, Mineralwolle oder Holzfaser), Wand- und Dachstärke 25 cm. Boden: OSB-Platte mit Vinylpaneelen.",
      "Dragend stalen frame met houtskeletwanden: constructiehout C-24, isolatie naar keuze (PUR-schuim, minerale wol of houtvezel), wand- en dakdikte 25 cm. Vloer: OSB-plaat met vinylpanelen.",
    ),
    pricePln: 209000,
    scope: L(
      "Stodoła przedstawiona na wizualizacjach: 40 m² podstawy i 20 m² antresoli, wraz z instalacją elektryczną i hydrauliczną.",
      "The barn shown in the visualisations: 40 m² footprint and 20 m² mezzanine, with electrical and plumbing installations.",
      "Die auf den Visualisierungen gezeigte Scheune: 40 m² Grundfläche und 20 m² Galerie, mit Elektro- und Sanitärinstallation.",
      "De schuur op de visualisaties: 40 m² grondoppervlak en 20 m² vide, met elektrische en sanitaire installatie.",
    ),
    excluded: L(
      "Transport, umeblowanie i sprzęt. Cena jest kwotą netto.",
      "Transport, furniture and appliances. The price is a net amount.",
      "Transport, Möblierung und Geräte. Der Preis ist ein Nettobetrag.",
      "Transport, meubilering en apparatuur. De prijs is een nettobedrag.",
    ),
    includedItems: [
      L(
        "Konstrukcja: stalowa rama nośna, ściany szkieletowe z drewna C-24, grubość ściany i dachu 25 cm",
        "Structure: load-bearing steel frame, C-24 timber-frame walls, wall and roof thickness 25 cm",
        "Konstruktion: tragender Stahlrahmen, Holzrahmenwände aus C-24, Wand- und Dachstärke 25 cm",
        "Constructie: dragend stalen frame, houtskeletwanden van C-24, wand- en dakdikte 25 cm",
      ),
      L(
        "Izolacja ścian i dachu do wyboru: piana PUR, wełna mineralna lub włókno drzewne",
        "Wall and roof insulation of choice: PUR foam, mineral wool or wood fibre",
        "Wand- und Dachdämmung nach Wahl: PUR-Schaum, Mineralwolle oder Holzfaser",
        "Wand- en dakisolatie naar keuze: PUR-schuim, minerale wol of houtvezel",
      ),
      L(
        "Elewacja i wykończenie wnętrz w wybranym wariancie",
        "Facade and interior finish in the chosen variant",
        "Fassade und Innenausbau in der gewählten Variante",
        "Gevel en interieurafwerking in de gekozen variant",
      ),
      L(
        "Podłoga: płyta OSB z panelem winylowym",
        "Floor: OSB board with vinyl panels",
        "Boden: OSB-Platte mit Vinylpaneelen",
        "Vloer: OSB-plaat met vinylpanelen",
      ),
      L(
        "Instalacja elektryczna wykonana według obowiązujących norm",
        "Electrical installation made to current standards",
        "Elektroinstallation nach geltenden Normen",
        "Elektrische installatie volgens de geldende normen",
      ),
      L(
        "Instalacja hydrauliczna wykonana według obowiązujących norm",
        "Plumbing installation made to current standards",
        "Sanitärinstallation nach geltenden Normen",
        "Sanitaire installatie volgens de geldende normen",
      ),
    ],
    rooms: [
      {
        name: L(
          "Część wypoczynkowa z aneksem kuchennym, łazienka i sypialnia",
          "Leisure area with kitchenette, bathroom and bedroom",
          "Aufenthaltsbereich mit Küchenzeile, Bad und Schlafzimmer",
          "Verblijfsruimte met keukenhoek, badkamer en slaapkamer",
        ),
        areaM2: 40,
        floorLevel: "parter",
      },
      {
        name: L("Sypialnia na antresoli", "Bedroom on the mezzanine", "Schlafzimmer auf der Galerie", "Slaapkamer op de vide"),
        areaM2: 20,
        floorLevel: "pietro",
      },
    ],
    photos: [
      "tmp/wencel/wencel-stodola-corten.jpg",
      "tmp/wencel/wencel-stodola-drewno.jpg",
      "tmp/wencel/wencel-stodola-blacha-ciemna.jpg",
    ],
    floorPlans: [
      { file: "tmp/wencel/wencel-stodola-rzut-parter.jpg", floorLevel: "parter" },
      { file: "tmp/wencel/wencel-stodola-rzut-pietro.jpg", floorLevel: "pietro" },
    ],
    realizations: [2, 5, 4, 1, 3, 6].map((n) => `tmp/wencel/wencel-stodola-realizacja-${n}.jpg`),
  },
  {
    key: "domek-mobilny",
    id: detUuid("product:domek-mobilny"),
    name: "Domek Mobilny 35",
    floorAreaM2: 35,
    category: "mobilny",
    bedrooms: 1,
    bathrooms: 1,
    storeys: 1,
    roofType: L("Dach płaski", "Flat roof", "Flachdach", "Plat dak"),
    description: L(
      "Domek na stalowej ramie o wymiarach 10 x 3,5 m (35 m²) z zadaszonym wejściem, przeznaczony dla 4 osób. Składa się z trzech pomieszczeń: części wypoczynkowo-sypialnianej z aneksem kuchennym, sypialni i łazienki. Dom można z łatwością wielokrotnie przestawiać. Cena obejmuje instalację elektryczną i hydrauliczną wykonaną zgodnie z obowiązującymi normami, bez wyposażenia i sprzętu. Układ pomieszczeń ustala klient.",
      "A cabin on a steel frame measuring 10 x 3.5 m (35 m²) with a covered entrance, designed for 4 people. It has three rooms: a living and sleeping area with a kitchenette, a bedroom and a bathroom. The house can easily be moved many times. The price includes electrical and plumbing installations made to current standards, without furnishings and appliances. The client decides the room layout.",
      "Ein Haus auf Stahlrahmen mit den Maßen 10 x 3,5 m (35 m²) und überdachtem Eingang, ausgelegt für 4 Personen. Es besteht aus drei Räumen: einem Wohn- und Schlafbereich mit Küchenzeile, einem Schlafzimmer und einem Bad. Das Haus lässt sich problemlos mehrfach versetzen. Der Preis umfasst Elektro- und Sanitärinstallation nach geltenden Normen, ohne Ausstattung und Geräte. Die Raumaufteilung bestimmt der Kunde.",
      "Een huisje op een stalen frame van 10 x 3,5 m (35 m²) met overdekte ingang, bedoeld voor 4 personen. Het bestaat uit drie ruimtes: een woon- en slaapgedeelte met keukenhoek, een slaapkamer en een badkamer. Het huis kan gemakkelijk meerdere keren worden verplaatst. De prijs omvat de elektrische en sanitaire installatie volgens de geldende normen, zonder inrichting en apparatuur. De klant bepaalt de indeling.",
    ),
    pricePln: 165000,
    scope: L(
      "Dom przedstawiony na wizualizacjach: 10 x 3,5 m z zadaszonym wejściem, wraz z instalacją elektryczną i hydrauliczną.",
      "The house shown in the visualisations: 10 x 3.5 m with a covered entrance, with electrical and plumbing installations.",
      "Das auf den Visualisierungen gezeigte Haus: 10 x 3,5 m mit überdachtem Eingang, mit Elektro- und Sanitärinstallation.",
      "Het huis op de visualisaties: 10 x 3,5 m met overdekte ingang, met elektrische en sanitaire installatie.",
    ),
    excluded: L(
      "Transport, wyposażenie i sprzęt. Cena jest kwotą netto.",
      "Transport, furnishings and appliances. The price is a net amount.",
      "Transport, Ausstattung und Geräte. Der Preis ist ein Nettobetrag.",
      "Transport, inrichting en apparatuur. De prijs is een nettobedrag.",
    ),
    includedItems: [
      L(
        "Konstrukcja: stalowa rama nośna, ściany szkieletowe z drewna C-24",
        "Structure: load-bearing steel frame, C-24 timber-frame walls",
        "Konstruktion: tragender Stahlrahmen, Holzrahmenwände aus C-24",
        "Constructie: dragend stalen frame, houtskeletwanden van C-24",
      ),
      L(
        "Izolacja ścian do wyboru: piana PUR, wełna mineralna lub włókno drzewne",
        "Wall insulation of choice: PUR foam, mineral wool or wood fibre",
        "Wanddämmung nach Wahl: PUR-Schaum, Mineralwolle oder Holzfaser",
        "Wandisolatie naar keuze: PUR-schuim, minerale wol of houtvezel",
      ),
      L(
        "Elewacja i wykończenie wnętrz w wybranym wariancie",
        "Facade and interior finish in the chosen variant",
        "Fassade und Innenausbau in der gewählten Variante",
        "Gevel en interieurafwerking in de gekozen variant",
      ),
      L(
        "Podłoga: płyta OSB z panelem winylowym",
        "Floor: OSB board with vinyl panels",
        "Boden: OSB-Platte mit Vinylpaneelen",
        "Vloer: OSB-plaat met vinylpanelen",
      ),
      L(
        "Instalacja elektryczna wykonana według obowiązujących norm",
        "Electrical installation made to current standards",
        "Elektroinstallation nach geltenden Normen",
        "Elektrische installatie volgens de geldende normen",
      ),
      L(
        "Instalacja hydrauliczna wykonana według obowiązujących norm",
        "Plumbing installation made to current standards",
        "Sanitärinstallation nach geltenden Normen",
        "Sanitaire installatie volgens de geldende normen",
      ),
      L("Zadaszone wejście", "Covered entrance", "Überdachter Eingang", "Overdekte ingang"),
    ],
    rooms: [
      {
        name: L(
          "Część wypoczynkowo-sypialniana z aneksem kuchennym, sypialnia i łazienka",
          "Living and sleeping area with kitchenette, bedroom and bathroom",
          "Wohn- und Schlafbereich mit Küchenzeile, Schlafzimmer und Bad",
          "Woon- en slaapgedeelte met keukenhoek, slaapkamer en badkamer",
        ),
        areaM2: 35,
        floorLevel: "parter",
      },
    ],
    photos: [
      "tmp/wencel/wencel-mobilny-1.jpg",
      "tmp/wencel/wencel-mobilny-4.jpg",
      "tmp/wencel/wencel-mobilny-5.jpg",
      "tmp/wencel/wencel-mobilny-2.jpg",
    ],
    floorPlans: [{ file: "tmp/wencel/wencel-mobilny-3.jpg", floorLevel: "parter" }],
    realizations: [],
  },
  {
    key: "dworek",
    id: detUuid("product:dworek"),
    name: "Dworek 65",
    floorAreaM2: 65,
    category: "caloroczny",
    foundationStatus: "permanent",
    optionGroupKeys: [],
    bedrooms: 1,
    bathrooms: 1,
    storeys: 1,
    roofType: L(
      "Dach dwuspadowy z frontonem, pokrycie: blachodachówka",
      "Gable roof with a pediment, covering: metal roof tiles",
      "Satteldach mit Giebelfront, Eindeckung: Blechdachziegel",
      "Zadeldak met fronton, dekking: metalen dakpannen",
    ),
    description: L(
      "Parterowy dom o powierzchni 65 m² w formie dworku, z frontonem i kolumnami przy wejściu. Wysokość ściany w szczycie wynosi około 4 m, a ściany bocznej około 3 m. W domu są salon z aneksem kuchennym, łazienka i sypialnia. Ściany ocieplono 20 cm wełny mineralnej, wszystkie szyby w oknach i drzwiach to bezpieczne szkło VSG, a drzwi wejściowe są antywłamaniowe i przystosowane dla osób niepełnosprawnych. W cenie jest klimatyzacja GREE z funkcją chłodzenia i grzania oraz rekuperator ścienny. Dom stoi na stalowej ramie na stałym posadowieniu, producent nie zaleca jego przestawiania. Cena nie obejmuje wyposażenia i sprzętu.",
      "A single-storey 65 m² house in the form of a manor, with a pediment and columns at the entrance. The wall height at the gable is about 4 m and at the side wall about 3 m. The house has a living room with a kitchenette, a bathroom and a bedroom. Walls are insulated with 20 cm of mineral wool, all window and door glazing is safe VSG glass, and the entrance door is burglar-resistant and adapted for people with disabilities. The price includes GREE air conditioning with cooling and heating and a wall-mounted heat recovery unit. The house stands on a steel frame with a permanent foundation, and the producer advises against moving it. The price does not include furnishings and appliances.",
      "Ein eingeschossiges Haus mit 65 m² in Form eines Gutshauses, mit Giebel und Säulen am Eingang. Die Wandhöhe am Giebel beträgt etwa 4 m, an der Seitenwand etwa 3 m. Im Haus befinden sich ein Wohnraum mit Küchenzeile, ein Bad und ein Schlafzimmer. Die Wände sind mit 20 cm Mineralwolle gedämmt, alle Scheiben in Fenstern und Türen sind sicheres VSG-Glas, und die Eingangstür ist einbruchhemmend und behindertengerecht. Im Preis enthalten sind eine GREE-Klimaanlage mit Kühl- und Heizfunktion sowie ein Wandlüftungsgerät mit Wärmerückgewinnung. Das Haus steht auf einem Stahlrahmen mit festem Fundament, der Hersteller rät vom Versetzen ab. Der Preis enthält keine Ausstattung und Geräte.",
      "Een gelijkvloerse woning van 65 m² in de vorm van een landhuis, met fronton en kolommen bij de ingang. De wandhoogte bij de gevelpunt bedraagt ongeveer 4 m en bij de zijwand ongeveer 3 m. In het huis zijn een woonkamer met keukenhoek, een badkamer en een slaapkamer. De wanden zijn geïsoleerd met 20 cm minerale wol, alle beglazing in ramen en deuren is veilig VSG-glas en de voordeur is inbraakwerend en aangepast voor mensen met een beperking. In de prijs zijn een GREE-airconditioning met koel- en verwarmfunctie en een wandventilatie-unit met warmteterugwinning inbegrepen. Het huis staat op een stalen frame met een vaste fundering en de producent raadt af het te verplaatsen. De prijs omvat geen inrichting en apparatuur.",
    ),
    constructionSystem: L(
      "Stalowa rama, ściany ocieplone 20 cm wełny mineralnej. Podłoga: blacha trapezowa (myszownica), 20 cm wełny, płyta OSB 22 mm, wykończenie panelem winylowym lub wykładziną. Dach pokryty blachodachówką.",
      "Steel frame, walls insulated with 20 cm of mineral wool. Floor: trapezoidal sheet (checker plate), 20 cm of wool, 22 mm OSB board, finished with vinyl panels or carpet. Roof covered with metal roof tiles.",
      "Stahlrahmen, Wände mit 20 cm Mineralwolle gedämmt. Boden: Trapezblech (Riffelblech), 20 cm Wolle, OSB-Platte 22 mm, Abschluss mit Vinylpaneelen oder Teppichboden. Dach mit Blechdachziegeln gedeckt.",
      "Stalen frame, wanden geïsoleerd met 20 cm minerale wol. Vloer: trapeziumplaat (strekmetaal), 20 cm wol, OSB-plaat 22 mm, afgewerkt met vinylpanelen of tapijt. Dak bedekt met metalen dakpannen.",
    ),
    customizationScope: L(
      "Ostateczny układ pomieszczeń ustala klient, producent jest otwarty na jego propozycje.",
      "The client decides the final room layout, and the producer is open to the client's proposals.",
      "Die endgültige Raumaufteilung bestimmt der Kunde, der Hersteller ist für dessen Vorschläge offen.",
      "De klant bepaalt de uiteindelijke indeling en de producent staat open voor zijn voorstellen.",
    ),
    specs: {
      wallBuildUp: "Ściany ocieplone 20 cm wełny mineralnej.",
      insulation: "Wełna mineralna 20 cm.",
      windowClass: "Szyby VSG (bezpieczne) we wszystkich oknach i drzwiach.",
      ventilation: "rekuperacja",
      heatSourceOther: "Klimatyzacja GREE z funkcją grzania i chłodzenia.",
      constructionTechnology: "modulowa-stal-lekka",
    },
    pricePln: 330000,
    scope: L(
      "Dom przedstawiony na wizualizacjach, 65 m², wraz z klimatyzacją, rekuperatorem ściennym oraz instalacją elektryczną i hydrauliczną z pomiarami.",
      "The house shown in the visualisations, 65 m², with air conditioning, a wall-mounted heat recovery unit and electrical and plumbing installations including electrical measurements.",
      "Das auf den Visualisierungen gezeigte Haus, 65 m², mit Klimaanlage, Wandlüftungsgerät mit Wärmerückgewinnung sowie Elektro- und Sanitärinstallation mit Elektromessungen.",
      "Het huis op de visualisaties, 65 m², met airconditioning, wandventilatie-unit met warmteterugwinning en elektrische en sanitaire installatie inclusief elektrische metingen.",
    ),
    excluded: L(
      "Transport, wyposażenie i sprzęt. Cena jest kwotą netto.",
      "Transport, furnishings and appliances. The price is a net amount.",
      "Transport, Ausstattung und Geräte. Der Preis ist ein Nettobetrag.",
      "Transport, inrichting en apparatuur. De prijs is een nettobedrag.",
    ),
    includedItems: [
      L(
        "Ocieplenie budynku: 20 cm wełny mineralnej",
        "Building insulation: 20 cm of mineral wool",
        "Gebäudedämmung: 20 cm Mineralwolle",
        "Isolatie van het gebouw: 20 cm minerale wol",
      ),
      L("Dach pokryty blachodachówką", "Roof covered with metal roof tiles", "Dach mit Blechdachziegeln gedeckt", "Dak bedekt met metalen dakpannen"),
      L(
        "Podłoga: blacha trapezowa (myszownica), 20 cm wełny, płyta OSB 22 mm, wykończenie panelem winylowym lub wykładziną",
        "Floor: trapezoidal sheet (checker plate), 20 cm of wool, 22 mm OSB board, finished with vinyl panels or carpet",
        "Boden: Trapezblech (Riffelblech), 20 cm Wolle, OSB-Platte 22 mm, Abschluss mit Vinylpaneelen oder Teppichboden",
        "Vloer: trapeziumplaat (strekmetaal), 20 cm wol, OSB-plaat 22 mm, afgewerkt met vinylpanelen of tapijt",
      ),
      L("Okna", "Windows", "Fenster", "Ramen"),
      L(
        "Szyby we wszystkich oknach i drzwiach: bezpieczne VSG",
        "Glazing in all windows and doors: safe VSG glass",
        "Verglasung in allen Fenstern und Türen: sicheres VSG-Glas",
        "Beglazing in alle ramen en deuren: veilig VSG-glas",
      ),
      L(
        "Drzwi wejściowe antywłamaniowe, przystosowane dla osób niepełnosprawnych",
        "Burglar-resistant entrance door adapted for people with disabilities",
        "Einbruchhemmende Eingangstür, behindertengerecht",
        "Inbraakwerende voordeur, aangepast voor mensen met een beperking",
      ),
      L("Drzwi wewnętrzne (2 szt.)", "Interior doors (2 pcs)", "Innentüren (2 Stk.)", "Binnendeuren (2 stuks)"),
      L(
        "Klimatyzacja GREE z funkcją chłodzenia i grzania",
        "GREE air conditioning with cooling and heating",
        "GREE-Klimaanlage mit Kühl- und Heizfunktion",
        "GREE-airconditioning met koel- en verwarmfunctie",
      ),
      L(
        "Instalacja hydrauliczna i elektryczna wykonana według obowiązujących norm, wraz z pomiarami elektrycznymi",
        "Plumbing and electrical installation made to current standards, including electrical measurements",
        "Sanitär- und Elektroinstallation nach geltenden Normen, einschließlich Elektromessungen",
        "Sanitaire en elektrische installatie volgens de geldende normen, inclusief elektrische metingen",
      ),
      L(
        "Kratka wentylacyjna i rekuperator ścienny",
        "Ventilation grille and wall-mounted heat recovery unit",
        "Lüftungsgitter und Wandlüftungsgerät mit Wärmerückgewinnung",
        "Ventilatierooster en wandventilatie-unit met warmteterugwinning",
      ),
      L(
        "Energooszczędne oświetlenie LED na zewnątrz i wewnątrz",
        "Energy-saving LED lighting outside and inside",
        "Energiesparende LED-Beleuchtung außen und innen",
        "Energiezuinige LED-verlichting buiten en binnen",
      ),
    ],
    rooms: [
      {
        name: L(
          "Salon z aneksem kuchennym, łazienka i sypialnia",
          "Living room with kitchenette, bathroom and bedroom",
          "Wohnzimmer mit Küchenzeile, Bad und Schlafzimmer",
          "Woonkamer met keukenhoek, badkamer en slaapkamer",
        ),
        areaM2: 65,
        floorLevel: "parter",
      },
    ],
    photos: [
      "tmp/wencel/wencel-dworek-1.jpg",
      "tmp/wencel/wencel-dworek-2.jpg",
      "tmp/wencel/wencel-dworek-salon.jpg",
      "tmp/wencel/wencel-dworek-kuchnia.jpg",
      "tmp/wencel/wencel-dworek-sypialnia.jpg",
      "tmp/wencel/wencel-dworek-lazienka.jpg",
    ],
    floorPlans: [{ file: "tmp/wencel/wencel-dworek-3.jpg", floorLevel: "parter" }],
    realizations: [],
  },
  {
    key: "woz",
    id: detUuid("product:woz"),
    name: "Wóz 24",
    floorAreaM2: 24,
    category: "mobilny",
    optionGroupKeys: [],
    bedrooms: 1,
    bathrooms: 1,
    storeys: 1,
    roofType: L(
      "Dach łukowy z aluminiowej blachy na rąbek stojący",
      "Curved roof of aluminium standing-seam sheet metal",
      "Gewölbtes Dach aus Aluminium-Stehfalzblech",
      "Gebogen dak van aluminium liggende felsplaat",
    ),
    description: L(
      "Całoroczny wóz na stalowym podwoziu z drewnianą zabudową: wnętrze 24 m² oraz zadaszony taras 6 m². Wymiary to 8 m długości plus 2 m tarasu, 3 m szerokości i 3,4 m wysokości. Elewacja jest z modrzewia syberyjskiego, dach z aluminiowej blachy na rąbek stojący, elementy metalowe malowane proszkowo, a wnętrze obite boazerią ze świerku skandynawskiego. W środku są kuchnia z salonem, sypialnia i łazienka. Wóz jest ocieplony, a instalacja elektryczna i hydrauliczna wykonana zgodnie z obowiązującymi normami. Cena jest podana w euro, netto, bez transportu.",
      "A year-round wagon on a steel chassis with a timber body: 24 m² inside plus a 6 m² covered terrace. It measures 8 m in length plus a 2 m terrace, 3 m in width and 3.4 m in height. The facade is Siberian larch, the roof is aluminium standing-seam sheet metal, metal parts are powder-coated, and the interior is lined with Scandinavian spruce panelling. Inside are a kitchen with a living area, a bedroom and a bathroom. The wagon is insulated, and the electrical and plumbing installations are made to current standards. The price is given in euro, net, excluding transport.",
      "Ein ganzjährig nutzbarer Wagen auf Stahlfahrgestell mit Holzaufbau: 24 m² Innenfläche plus 6 m² überdachte Terrasse. Er misst 8 m in der Länge plus 2 m Terrasse, 3 m in der Breite und 3,4 m in der Höhe. Die Fassade besteht aus sibirischer Lärche, das Dach aus Aluminium-Stehfalzblech, Metallteile sind pulverbeschichtet, und der Innenraum ist mit skandinavischer Fichte verkleidet. Im Inneren befinden sich eine Küche mit Wohnbereich, ein Schlafzimmer und ein Bad. Der Wagen ist gedämmt, Elektro- und Sanitärinstallation sind nach geltenden Normen ausgeführt. Der Preis ist in Euro angegeben, netto, ohne Transport.",
      "Een jaarrond bruikbare woonwagen op een stalen onderstel met houten opbouw: 24 m² binnenruimte plus een overdekt terras van 6 m². De afmetingen zijn 8 m lengte plus 2 m terras, 3 m breedte en 3,4 m hoogte. De gevel is van Siberisch lariks, het dak van aluminium liggende felsplaat, metalen onderdelen zijn poedergecoat en het interieur is bekleed met Scandinavisch vurenhout. Binnen zijn een keuken met woonruimte, een slaapkamer en een badkamer. De woonwagen is geïsoleerd en de elektrische en sanitaire installatie is volgens de geldende normen uitgevoerd. De prijs is in euro, netto, exclusief transport.",
    ),
    constructionSystem: L(
      "Podwozie: rama ze stali z profili zamkniętych 120x60 mm (ścianka 4 mm). Ściany: drewno konstrukcyjne C24 (kantówka 8x4 cm), elewacja z modrzewia syberyjskiego, membrana wiatroizolacyjna, wełna 8 cm, folia paroprzepuszczalna, wnętrze ze świerku skandynawskiego. Dach: blacha aluminiowa na rąbek stojący, deskowanie, 15 cm wełny mineralnej. Podłoga: boazeria z modrzewia, membrana wiatroizolacyjna, styropian 8 cm, sklejka wodoodporna 18 mm z wykładziną PCV.",
      "Chassis: steel frame of 120x60 mm closed profiles (4 mm wall). Walls: C24 structural timber (8x4 cm), Siberian larch facade, wind barrier membrane, 8 cm of wool, vapour-permeable foil, Scandinavian spruce interior. Roof: aluminium standing-seam sheet, boarding, 15 cm of mineral wool. Floor: larch boarding, wind barrier membrane, 8 cm of polystyrene, 18 mm waterproof plywood with PVC covering.",
      "Fahrgestell: Stahlrahmen aus 120x60-mm-Hohlprofilen (4 mm Wandstärke). Wände: Konstruktionsholz C24 (Kantholz 8x4 cm), Fassade aus sibirischer Lärche, Winddichtungsbahn, 8 cm Wolle, diffusionsoffene Folie, Innenraum aus skandinavischer Fichte. Dach: Aluminium-Stehfalzblech, Schalung, 15 cm Mineralwolle. Boden: Lärchenverkleidung, Winddichtungsbahn, 8 cm Polystyrol, 18 mm wasserfestes Sperrholz mit PVC-Belag.",
      "Onderstel: stalen frame van 120x60 mm gesloten profielen (4 mm wanddikte). Wanden: constructiehout C24 (kantelen 8x4 cm), gevel van Siberisch lariks, windscherm, 8 cm wol, dampopen folie, interieur van Scandinavisch vurenhout. Dak: aluminium liggende felsplaat, beplanking, 15 cm minerale wol. Vloer: larikshouten bekleding, windscherm, 8 cm polystyreen, 18 mm waterbestendig multiplex met pvc-vloerbedekking.",
    ),
    customizationScope: L(
      "Dostępne są dwie wersje kolorystyczne, jak na zdjęciach: naturalny modrzew syberyjski z szarymi elementami albo czerwono-kremowa.",
      "Two colour versions are available, as in the photos: natural Siberian larch with grey details, or red and cream.",
      "Es gibt zwei Farbvarianten, wie auf den Fotos: naturbelassene sibirische Lärche mit grauen Elementen oder Rot-Creme.",
      "Er zijn twee kleurvarianten, zoals op de foto's: natuurlijk Siberisch lariks met grijze onderdelen of rood-crème.",
    ),
    specs: {
      wallBuildUp: "Drewno C24 (kantówka 8x4 cm), elewacja z modrzewia syberyjskiego, wełna 8 cm, wnętrze ze świerku skandynawskiego.",
      insulation: "Wełna 8 cm w ścianach, 15 cm wełny mineralnej w dachu, styropian 8 cm w podłodze.",
      windowClass: "Szyby VSG (z folią, bezpieczne) w oknach i drzwiach.",
      heatSourceOther: "Brak danych w ofercie producenta.",
      constructionTechnology: "inne",
      constructionTechnologyOther: "Stalowe podwozie z profili zamkniętych 120x60 mm, ściany szkieletowe z drewna C24.",
    },
    priceEur: 34500,
    scope: L(
      "Wóz przedstawiony na zdjęciach: wnętrze 24 m² (kuchnia z salonem, sypialnia, łazienka) i zadaszony taras 6 m², z instalacją elektryczną i hydrauliczną.",
      "The wagon shown in the photos: 24 m² interior (kitchen with living area, bedroom, bathroom) and a 6 m² covered terrace, with electrical and plumbing installations.",
      "Der auf den Fotos gezeigte Wagen: 24 m² Innenfläche (Küche mit Wohnbereich, Schlafzimmer, Bad) und eine überdachte Terrasse von 6 m², mit Elektro- und Sanitärinstallation.",
      "De woonwagen op de foto's: 24 m² binnenruimte (keuken met woonruimte, slaapkamer, badkamer) en een overdekt terras van 6 m², met elektrische en sanitaire installatie.",
    ),
    excluded: L(
      "Transport. Cena jest kwotą netto.",
      "Transport. The price is a net amount.",
      "Transport. Der Preis ist ein Nettobetrag.",
      "Transport. De prijs is een nettobedrag.",
    ),
    includedItems: [
      L(
        "Podwozie: stalowa rama z profili zamkniętych 120x60 mm, ścianka 4 mm",
        "Chassis: steel frame of 120x60 mm closed profiles, 4 mm wall",
        "Fahrgestell: Stahlrahmen aus 120x60-mm-Hohlprofilen, 4 mm Wandstärke",
        "Onderstel: stalen frame van 120x60 mm gesloten profielen, 4 mm wanddikte",
      ),
      L(
        "Elewacja z modrzewia syberyjskiego, elementy metalowe malowane proszkowo",
        "Siberian larch facade, powder-coated metal parts",
        "Fassade aus sibirischer Lärche, pulverbeschichtete Metallteile",
        "Gevel van Siberisch lariks, poedergecoate metalen onderdelen",
      ),
      L(
        "Ściany z drewna C24 z wełną 8 cm, wnętrze obite świerkiem skandynawskim",
        "C24 timber walls with 8 cm of wool, interior lined with Scandinavian spruce",
        "Wände aus C24-Holz mit 8 cm Wolle, Innenraum mit skandinavischer Fichte verkleidet",
        "Wanden van C24-hout met 8 cm wol, interieur bekleed met Scandinavisch vurenhout",
      ),
      L(
        "Dach z aluminiowej blachy na rąbek stojący, 15 cm wełny mineralnej",
        "Aluminium standing-seam roof, 15 cm of mineral wool",
        "Dach aus Aluminium-Stehfalzblech, 15 cm Mineralwolle",
        "Dak van aluminium liggende felsplaat, 15 cm minerale wol",
      ),
      L(
        "Podłoga z styropianem 8 cm, sklejką wodoodporną 18 mm i wykładziną PCV",
        "Floor with 8 cm of polystyrene, 18 mm waterproof plywood and PVC covering",
        "Boden mit 8 cm Polystyrol, 18 mm wasserfestem Sperrholz und PVC-Belag",
        "Vloer met 8 cm polystyreen, 18 mm waterbestendig multiplex en pvc-vloerbedekking",
      ),
      L(
        "Szyby VSG (z folią, bezpieczne) w oknach i drzwiach",
        "VSG glazing (laminated, safe) in windows and doors",
        "VSG-Verglasung (mit Folie, sicher) in Fenstern und Türen",
        "VSG-beglazing (gelaagd, veilig) in ramen en deuren",
      ),
      L(
        "Instalacja elektryczna i hydrauliczna wykonana według obowiązujących norm",
        "Electrical and plumbing installation made to current standards",
        "Elektro- und Sanitärinstallation nach geltenden Normen",
        "Elektrische en sanitaire installatie volgens de geldende normen",
      ),
      L("Zadaszony taras 6 m²", "6 m² covered terrace", "Überdachte Terrasse 6 m²", "Overdekt terras van 6 m²"),
    ],
    rooms: [
      {
        name: L(
          "Kuchnia z salonem, sypialnia i łazienka",
          "Kitchen with living area, bedroom and bathroom",
          "Küche mit Wohnbereich, Schlafzimmer und Bad",
          "Keuken met woonruimte, slaapkamer en badkamer",
        ),
        areaM2: 24,
        floorLevel: "parter",
      },
    ],
    // Prawdziwe zdjęcia realizacji (dwie wersje kolorystyczne): jako galeria główna ("wizualizacje") i jako realizacje,
    // dlatego dwie kopie plików o różnych nazwach (wiersz dokumentu jest rozróżniany po nazwie pliku).
    photos: [3, 1, 2, 5, 4, 6].map((n) => `tmp/wencel/wencel-woz-${n}.jpg`),
    floorPlans: [],
    realizations: [3, 1, 2, 5, 4, 6].map((n) => `tmp/wencel/wencel-woz-realizacja-${n}.jpg`),
  },
];
