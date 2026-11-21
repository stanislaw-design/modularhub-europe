// Kunert Mobile Homes (Koszalin): 13 wybranych domów mobilnych z kunertmobilehomes.pl/oferta (pełna oferta ma 24 modele,
// pozostałe 11 to w większości warianty 44 m² 2/1, do dogrania później). Dane ze stron modeli (2026-11-20), dane
// kontaktowe handlowców nie wchodzą do kodu ani bazy. Zgoda na użycie zdjęć potwierdzona przez Stanisława 2026-11-20.
// Cena: producent nie publikuje cennika (poza jednym egzemplarzem od ręki), więc na decyzję Stanisława (2026-11-20)
// każdy model dostaje orientacyjną cenę "od" = 1100 EUR × powierzchnia użytkowa. Do podmiany, gdy przyjdzie cennik.
// Każdy tekst widoczny dla klienta ma cztery wersje językowe (pl jest źródłem, en/de/nl idą do tabel tłumaczeń, spec 0067).
import { createHash } from "node:crypto";
import { MARKET_COUNTRY_CODES, type CountryCode } from "../../lib/countries";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:kunert";
export const PRODUCER_ID = "e0030000-0000-4000-8000-000000000111";
export const TECHNICAL_ACCOUNT_EMAIL = "catalog-import+kunert@modularhub.invalid";
export const PRICE_EUR_PER_M2 = 1100;
// Kraje dostaw z listy rynków platformy, które producent obsługuje (formularz i wersje językowe kunertmobilehomes.eu).
// Pochodna z lib/countries.ts (spec 0082: lista rynków żyje tylko tam), bez Włoch.
export const DELIVERY_COUNTRIES: readonly CountryCode[] = MARKET_COUNTRY_CODES.filter((code) => code !== "IT");

export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`kunert:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export const KUNERT_PRODUCER = {
  name: "Kunert Mobile Homes",
  // NIP z rejestru (stopka strony producenta, KRS 0000891428).
  nip: "4990661888",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent domów mobilnych z Koszalina, działający od 1997 roku. Projektuje i buduje domy mobilne na ramie stalowej, od kompaktowych modeli 24 m² po rodzinne domy z trzema sypialniami i dwiema łazienkami, do użytku całorocznego lub sezonowego. Dostarcza domy w Polsce i do innych krajów Europy, m.in. do Niemiec i Holandii, także dla ośrodków wypoczynkowych i parków domków.",
    "Mobile home producer from Koszalin, Poland, in business since 1997. It designs and builds mobile homes on a steel frame, from compact 24 m² models to family homes with three bedrooms and two bathrooms, for year-round or seasonal use. Homes are delivered within Poland and to other European countries, including Germany and the Netherlands, also for holiday resorts and holiday parks.",
    "Hersteller mobiler Häuser aus Koszalin, Polen, seit 1997 tätig. Das Unternehmen plant und baut mobile Häuser auf einem Stahlrahmen, von kompakten 24 m² Modellen bis zu Familienhäusern mit drei Schlafzimmern und zwei Bädern, für ganzjährige oder saisonale Nutzung. Geliefert wird in Polen und in andere europäische Länder, u. a. nach Deutschland und in die Niederlande, auch für Ferienanlagen und Ferienparks.",
    "Producent van mobiele huizen uit Koszalin, Polen, actief sinds 1997. Het bedrijf ontwerpt en bouwt mobiele huizen op een stalen frame, van compacte modellen van 24 m² tot gezinswoningen met drie slaapkamers en twee badkamers, voor gebruik het hele jaar of per seizoen. Er wordt geleverd in Polen en naar andere Europese landen, waaronder Duitsland en Nederland, ook voor vakantieparken.",
  ),
};

// Ten sam tekst co u Letniskowa (słownik reference_text_translation już go ma).
export const ELIGIBILITY_REASON = L(
  "Dom mobilny jest dostarczany w całości z fabryki. Wymagania lokalne (zgłoszenie, podłączenia, posadowienie) zależą od kraju i działki.",
  "The mobile home is delivered complete from the factory. Local requirements (notification, connections, foundation) depend on the country and the plot.",
  "Das mobile Haus wird komplett ab Werk geliefert. Lokale Anforderungen (Anzeige, Anschlüsse, Aufstellung) hängen vom Land und vom Grundstück ab.",
  "Het mobiele huis wordt compleet vanuit de fabriek geleverd. Lokale eisen (melding, aansluitingen, fundering) hangen af van het land en het perceel.",
);

// Strona /konstrukcja/ producenta.
export const CONSTRUCTION_SYSTEM = L(
  "Rama stalowa, ściany z płyt AGNES i wodoodpornych paneli Fibo.",
  "Steel frame, walls of AGNES boards and waterproof Fibo panels.",
  "Stahlrahmen, Wände aus AGNES-Platten und wasserfesten Fibo-Paneelen.",
  "Stalen frame, wanden van AGNES-platen en waterdichte Fibo-panelen.",
);

// Strony /konstrukcja/ i /ogrzewanie/ producenta.
export const CUSTOMIZATION_SCOPE = L(
  "Wnętrze i wykończenie do konfiguracji; do wyboru typ dachu, taras i ogrzewanie (gaz, prąd, podłogówka lub klimatyzacja).",
  "Configurable interior and finishes; choice of roof type, terrace and heating (gas, electric, underfloor or air conditioning).",
  "Innenraum und Oberflächen konfigurierbar; wählbar sind Dachform, Terrasse und Heizung (Gas, Strom, Fußbodenheizung oder Klimaanlage).",
  "Interieur en afwerking naar keuze; te kiezen zijn daktype, terras en verwarming (gas, elektrisch, vloerverwarming of airco).",
);

// Strona /transport-domku-mobilnego/ producenta.
export const FOUNDATION_OPTIONS = L(
  "Równe, przygotowane podłoże; miejsce ustawienia i dojazd przygotowuje klient.",
  "A level, prepared base; the customer prepares the site and access.",
  "Ebener, vorbereiteter Untergrund; Stellplatz und Zufahrt bereitet der Kunde vor.",
  "Een vlakke, voorbereide ondergrond; de klant bereidt standplaats en toegang voor.",
);

export const SCOPE_SUMMARY = L(
  "Dom mobilny z wyposażeniem kuchni i łazienki według wybranej konfiguracji. Cena orientacyjna od 1100 EUR netto za m² powierzchni użytkowej; dokładna wycena po wyborze konfiguracji.",
  "A mobile home with kitchen and bathroom equipment according to the chosen configuration. Indicative price from EUR 1,100 net per m² of usable floor area; the exact quote follows once the configuration is chosen.",
  "Mobiles Haus mit Küchen- und Badausstattung gemäß gewählter Konfiguration. Richtpreis ab 1.100 EUR netto pro m² Nutzfläche; das genaue Angebot folgt nach Wahl der Konfiguration.",
  "Mobiel huis met keuken- en badkameruitrusting volgens de gekozen configuratie. Richtprijs vanaf EUR 1.100 netto per m² gebruiksoppervlakte; de exacte offerte volgt na keuze van de configuratie.",
);

export const EXCLUDED_SCOPE = L(
  "Transport, przygotowanie miejsca ustawienia i przyłącza na działce nie wchodzą w cenę domu.",
  "Transport, site preparation and connections on the plot are not included in the price of the home.",
  "Transport, Vorbereitung des Stellplatzes und Anschlüsse auf dem Grundstück sind im Hauspreis nicht enthalten.",
  "Transport, voorbereiding van de standplaats en aansluitingen op het perceel zijn niet inbegrepen in de prijs van het huis.",
);

const ROOFS = {
  gable: L("Dwuspadowy", "Gable roof", "Satteldach", "Zadeldak"),
  flat: L("Płaski", "Flat roof", "Flachdach", "Plat dak"),
  mono: L("Jednospadowy", "Mono-pitch roof", "Pultdach", "Lessenaarsdak"),
  asym: L("Dwuspadowy asymetryczny", "Asymmetric gable roof", "Asymmetrisches Satteldach", "Asymmetrisch zadeldak"),
  barn: L("Dwuspadowy, stromy (styl barn)", "Steep gable roof (barn style)", "Steiles Satteldach (Barn-Stil)", "Steil zadeldak (schuurstijl)"),
} as const;

export interface PlanSource {
  /** Prefiks pliku w tmp/kunert-raw/<key>/ (np. "05"). */
  file: string;
  level: "parter" | "pietro";
}

export type RoomKind =
  | "living"
  | "bedroom"
  | "bedroom2"
  | "bedroom3"
  | "room"
  | "bathroom"
  | "bathroom2"
  | "wc"
  | "hall"
  | "dressing"
  | "utility"
  | "mezzanine";

export const ROOM_NAMES: Record<RoomKind, L10n> = {
  living: L("Salon z aneksem kuchennym", "Living room with kitchenette", "Wohnzimmer mit Küchenzeile", "Woonkamer met kitchenette"),
  bedroom: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
  bedroom2: L("Sypialnia 2", "Bedroom 2", "Schlafzimmer 2", "Slaapkamer 2"),
  bedroom3: L("Sypialnia 3", "Bedroom 3", "Schlafzimmer 3", "Slaapkamer 3"),
  room: L("Pokój", "Room", "Zimmer", "Kamer"),
  bathroom: L("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
  bathroom2: L("Łazienka 2", "Bathroom 2", "Badezimmer 2", "Badkamer 2"),
  wc: L("WC", "WC", "WC", "Toilet"),
  hall: L("Korytarz", "Hallway", "Flur", "Gang"),
  dressing: L("Garderoba", "Walk-in wardrobe", "Ankleide", "Inloopkast"),
  utility: L("Pomieszczenie gospodarcze", "Utility room", "Hauswirtschaftsraum", "Bijkeuken"),
  mezzanine: L("Antresola", "Mezzanine", "Galerie", "Vide"),
};

export interface ModelSource {
  key: string;
  name: string;
  /**
   * Pomieszczenia z metrażem SZACOWANYM z rzutu (producent nie podaje metraży pomieszczeń): powierzchnia w pikselach
   * przeliczona proporcjonalnie do powierzchni domu, zaokrąglona do 0,5 m² (decyzja Stanisława 2026-11-20).
   */
  rooms: ReadonlyArray<[RoomKind, number]>;
  areaM2: number;
  builtUpAreaM2?: number;
  externalDimensions?: string;
  bedrooms: number;
  bathrooms: number;
  roof: keyof typeof ROOFS;
  description: L10n;
  /** Prefiksy plików zdjęć w tmp/kunert-raw/<key>/, pierwszy jest okładką. */
  photos: string[];
  plans: PlanSource[];
}

export const roofOf = (model: ModelSource): L10n => ROOFS[model.roof];
export const priceEurOf = (model: ModelSource): number => Math.round(model.areaM2 * PRICE_EUR_PER_M2);
export const productId = (model: ModelSource): string => detUuid(`product:${model.key}`);
export const variantId = (model: ModelSource): string => detUuid(`variant:${model.key}:pod-klucz`);
export const roomId = (model: ModelSource, index: number): string => detUuid(`room:${model.key}:${index}`);

// Pozycje "co w cenie, a co poza nią" (sekcja "Cena i zakres", cost_line_item). Źródło: strony modeli, /wyposazenie,
// /ogrzewanie, /konstrukcja i /transport-domku-mobilnego producenta. Tam, gdzie producent wiąże zakres z konfiguracją
// (ogrzewanie, meble), status to "do wyceny"; Horizon ma opisane wyposażenie, więc jego pozycje są "w cenie".
export type CostStatus = "w-cenie" | "obowiazkowa-doplata" | "opcja" | "po-stronie-klienta" | "do-wyceny";
export interface CostItem {
  label: L10n;
  status: CostStatus;
}
const C = (status: CostStatus, label: L10n): CostItem => ({ status, label });

const COST_STRUCTURE = C("w-cenie", L(
  "Konstrukcja na ramie stalowej, ściany z płyt AGNES i paneli Fibo",
  "Steel-frame structure, walls of AGNES boards and Fibo panels",
  "Konstruktion auf Stahlrahmen, Wände aus AGNES-Platten und Fibo-Paneelen",
  "Constructie op stalen frame, wanden van AGNES-platen en Fibo-panelen",
));
const COST_JOINERY = C("w-cenie", L("Okna i drzwi zewnętrzne", "Windows and exterior doors", "Fenster und Außentüren", "Ramen en buitendeuren"));
const COST_INSTALLATIONS = C("w-cenie", L(
  "Instalacja elektryczna i wodno-kanalizacyjna wewnątrz domu",
  "Electrical, water and drainage installation inside the home",
  "Elektro-, Wasser- und Abwasserinstallation im Haus",
  "Elektrische installatie en water- en afvoerleidingen in het huis",
));
const COST_BATHROOM = C("w-cenie", L(
  "Łazienka z prysznicem, umywalką i WC",
  "Bathroom with shower, washbasin and WC",
  "Bad mit Dusche, Waschbecken und WC",
  "Badkamer met douche, wastafel en toilet",
));
const COST_KITCHEN = C("w-cenie", L(
  "Zabudowa kuchenna (zakres AGD według konfiguracji)",
  "Kitchen units (appliances according to configuration)",
  "Küchenzeile (Geräteumfang je nach Konfiguration)",
  "Keukenblok (apparatuur volgens configuratie)",
));
const COST_HEATING = C("do-wyceny", L(
  "Ogrzewanie (gazowe, elektryczne, podłogowe lub klimatyzacja)",
  "Heating (gas, electric, underfloor or air conditioning)",
  "Heizung (Gas, Strom, Fußbodenheizung oder Klimaanlage)",
  "Verwarming (gas, elektrisch, vloerverwarming of airco)",
));
const COST_FURNITURE = C("do-wyceny", L(
  "Meble i wyposażenie sypialni oraz salonu",
  "Furniture for bedrooms and living room",
  "Möbel für Schlafzimmer und Wohnzimmer",
  "Meubilair voor slaapkamers en woonkamer",
));
const COST_TERRACE_OPTION = C("opcja", L(
  "Taras (standardowo 2 lub 2,5 m, inne wymiary na zamówienie)",
  "Terrace (2 or 2.5 m as standard, other sizes to order)",
  "Terrasse (standardmäßig 2 oder 2,5 m, andere Maße auf Bestellung)",
  "Terras (standaard 2 of 2,5 m, andere maten op bestelling)",
));
const COST_TERRACE_INCLUDED = C("w-cenie", L("Taras w projekcie domu", "Terrace as part of the design", "Terrasse als Teil des Entwurfs", "Terras als onderdeel van het ontwerp"));
const COST_ROOF_OPTION = C("opcja", L("Inny typ dachu", "Different roof type", "Andere Dachform", "Ander daktype"));
const COST_TRANSPORT = C("do-wyceny", L(
  "Transport do miejsca ustawienia (Polska i Europa)",
  "Transport to the site (Poland and Europe)",
  "Transport zum Stellplatz (Polen und Europa)",
  "Transport naar de standplaats (Polen en Europa)",
));
const COST_PLACEMENT = C("do-wyceny", L("Ustawienie domu na miejscu", "Placing the home on site", "Aufstellung des Hauses vor Ort", "Plaatsing van het huis ter plaatse"));
const COST_SITE = C("po-stronie-klienta", L(
  "Przygotowanie równego podłoża pod dom",
  "Preparing a level base for the home",
  "Vorbereitung eines ebenen Untergrunds für das Haus",
  "Voorbereiden van een vlakke ondergrond voor het huis",
));
const COST_ACCESS = C("po-stronie-klienta", L(
  "Dojazd dla transportu do miejsca ustawienia",
  "Access for the delivery vehicle to the site",
  "Zufahrt für den Transport zum Stellplatz",
  "Toegang voor het transport tot de standplaats",
));
const COST_UTILITIES = C("po-stronie-klienta", L(
  "Przyłącza mediów na działce (prąd, woda, kanalizacja)",
  "Utility connections on the plot (power, water, sewage)",
  "Medienanschlüsse auf dem Grundstück (Strom, Wasser, Abwasser)",
  "Nutsaansluitingen op het perceel (stroom, water, riolering)",
));
const COST_PERMITS = C("po-stronie-klienta", L(
  "Zgłoszenie lub pozwolenie (zależnie od kraju i działki)",
  "Notification or permit (depending on country and plot)",
  "Anzeige oder Genehmigung (je nach Land und Grundstück)",
  "Melding of vergunning (afhankelijk van land en perceel)",
));

// Horizon: wyposażenie opisane przez producenta wprost.
const HORIZON_KITCHEN = C("w-cenie", L(
  "Kuchnia z wysoką lodówką, płytą indukcyjną, mikrofalą z piekarnikiem, okapem i zmywarką 45 cm",
  "Kitchen with tall fridge, induction hob, microwave with oven, hood and 45 cm dishwasher",
  "Küche mit hohem Kühlschrank, Induktionskochfeld, Mikrowelle mit Backofen, Dunstabzug und 45 cm Geschirrspüler",
  "Keuken met hoge koelkast, inductiekookplaat, magnetron met oven, afzuigkap en vaatwasser van 45 cm",
));
const HORIZON_BATHROOMS = C("w-cenie", L(
  "Dwie łazienki (kabina FIBO, deszczownica, podwieszane WC) i osobne WC",
  "Two bathrooms (FIBO shower, rain shower, wall-hung WC) and a separate WC",
  "Zwei Bäder (FIBO-Dusche, Regendusche, Wand-WC) und separates WC",
  "Twee badkamers (FIBO-douche, regendouche, hangend toilet) en apart toilet",
));
const HORIZON_HEATING = C("w-cenie", L(
  "Ogrzewanie centralne, przygotowanie pod bojler",
  "Central heating, prepared for a water heater",
  "Zentralheizung, Vorbereitung für Warmwasserspeicher",
  "Centrale verwarming, voorbereid voor een boiler",
));
const HORIZON_INSULATION = C("w-cenie", L(
  "Ocieplenie wełną mineralną: 20 cm dach i podłoga, 15 cm ściany",
  "Mineral wool insulation: 20 cm roof and floor, 15 cm walls",
  "Mineralwolldämmung: 20 cm Dach und Boden, 15 cm Wände",
  "Isolatie met minerale wol: 20 cm dak en vloer, 15 cm wanden",
));
const HORIZON_FURNITURE = C("w-cenie", L(
  "Meble sypialni: łóżka 160 cm z pojemnikiem, szafki nocne, zabudowa; w pokoju łóżko i biurko",
  "Bedroom furniture: 160 cm beds with storage, bedside tables, built-in units; bed and desk in the extra room",
  "Schlafzimmermöbel: 160 cm Betten mit Bettkasten, Nachttische, Einbauten; Bett und Schreibtisch im Zusatzzimmer",
  "Slaapkamermeubels: bedden van 160 cm met lade, nachtkastjes, inbouwkasten; bed en bureau in de extra kamer",
));

const COMMON_TAIL = [COST_ROOF_OPTION, COST_TRANSPORT, COST_PLACEMENT, COST_SITE, COST_ACCESS, COST_UTILITIES, COST_PERMITS];
// Taras jest częścią projektu Edrii (strona modelu) i Corala ("duży taras" jako cecha modelu).
const TERRACE_INCLUDED = new Set(["edria", "coral"]);

export function costItemsOf(model: ModelSource): CostItem[] {
  const terrace = TERRACE_INCLUDED.has(model.key) ? COST_TERRACE_INCLUDED : COST_TERRACE_OPTION;
  if (model.key === "horizon") {
    return [COST_STRUCTURE, HORIZON_INSULATION, COST_JOINERY, COST_INSTALLATIONS, HORIZON_HEATING, HORIZON_KITCHEN, HORIZON_BATHROOMS, HORIZON_FURNITURE, terrace, ...COMMON_TAIL];
  }
  return [COST_STRUCTURE, COST_JOINERY, COST_INSTALLATIONS, COST_KITCHEN, COST_BATHROOM, COST_HEATING, COST_FURNITURE, terrace, ...COMMON_TAIL];
}
export const roomLayoutOf = (model: ModelSource) =>
  model.rooms.map(([kind, areaM2], index) => ({
    id: roomId(model, index),
    name: ROOM_NAMES[kind].pl,
    areaM2,
    floorLevel: kind === "mezzanine" ? ("pietro" as const) : ("parter" as const),
  }));
export const roomLayoutTranslationOf = (model: ModelSource, locale: "en" | "de" | "nl") =>
  model.rooms.map(([kind], index) => ({ id: roomId(model, index), name: ROOM_NAMES[kind][locale] }));

// Wartości słownikowe (bez wolnego tekstu, bo pola tekstowe danych technicznych domu nie są tłumaczone);
// konstrukcja, ogrzewanie i ocieplenie są opisane w tłumaczonych polach produktu.
export const TECHNICAL_SPECS = {
  heatTransferCoefficients: "nieznana" as const,
  ventilation: "inna" as const,
  heatSource: "inne" as const,
  constructionTechnology: "modulowa-stal-lekka" as const,
};

export const MODELS: readonly ModelSource[] = [
  {
    key: "ikar",
    name: "Ikar",
    rooms: [["living", 14], ["bedroom", 7.5], ["bathroom", 2.5]],
    areaM2: 24,
    bedrooms: 1,
    bathrooms: 1,
    roof: "gable",
    photos: ["01", "06", "07", "09", "11", "13", "14", "15", "10"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Kompaktowy dom mobilny 24 m² dla 1–2 osób: osobna sypialnia z podwójnym łóżkiem i zabudową nad łóżkiem, salon z otwartą kuchnią oraz łazienka z prysznicem, umywalką i podwieszanym WC. Duże okna w salonie i sypialni doświetlają wnętrze. Sprawdza się jako domek na działkę, domek gościnny albo jednostka noclegowa w ośrodku, na campingu lub w projekcie glampingowym.",
      "A compact 24 m² mobile home for 1–2 people: a separate bedroom with a double bed and overhead storage, a living room with an open kitchen, and a bathroom with shower, washbasin and wall-hung WC. Large windows in the living room and bedroom bring in plenty of daylight. Suits a garden plot, a guest house or a rental unit in a holiday park, campsite or glamping project.",
      "Kompaktes mobiles Haus mit 24 m² für 1–2 Personen: separates Schlafzimmer mit Doppelbett und Überbauschrank, Wohnzimmer mit offener Küche sowie Bad mit Dusche, Waschbecken und Wand-WC. Große Fenster im Wohn- und Schlafzimmer sorgen für viel Tageslicht. Geeignet als Haus auf dem Grundstück, Gästehaus oder Mieteinheit in Ferienparks, auf Campingplätzen oder in Glamping-Projekten.",
      "Compact mobiel huis van 24 m² voor 1–2 personen: een aparte slaapkamer met tweepersoonsbed en bovenkast, een woonkamer met open keuken en een badkamer met douche, wastafel en hangend toilet. Grote ramen in woonkamer en slaapkamer zorgen voor veel daglicht. Geschikt voor een eigen perceel, als gastenverblijf of als verhuurunit op een vakantiepark, camping of glampingproject.",
    ),
  },
  {
    key: "tiny",
    name: "Tiny",
    rooms: [["living", 13.5], ["bedroom", 4], ["bathroom", 4], ["mezzanine", 9.5]],
    areaM2: 31,
    bedrooms: 1,
    bathrooms: 1,
    roof: "flat",
    photos: ["01", "07", "08", "04", "10", "14", "19", "13", "12"],
    plans: [
      { file: "06", level: "parter" },
      { file: "05", level: "pietro" },
    ],
    description: L(
      "Dom mobilny 31 m² z antresolą sypialną dla jednej osoby lub pary. Na dole otwarta strefa dzienna z salonem i aneksem kuchennym oraz łazienka z prysznicem, umywalką i WC; antresola wykorzystuje wysokość wnętrza jako prywatną strefę nocną. Nadaje się na działkę oraz pod wynajem turystyczny.",
      "A 31 m² mobile home with a sleeping mezzanine for one person or a couple. The ground floor holds an open living area with kitchenette and a bathroom with shower, washbasin and WC; the mezzanine uses the interior height as a private sleeping zone. Suits a private plot or holiday rental.",
      "Mobiles Haus mit 31 m² und Schlafgalerie für eine Person oder ein Paar. Unten liegen ein offener Wohnbereich mit Küchenzeile und ein Bad mit Dusche, Waschbecken und WC; die Galerie nutzt die Raumhöhe als privaten Schlafbereich. Geeignet für das eigene Grundstück oder die Ferienvermietung.",
      "Mobiel huis van 31 m² met een slaapvide voor één persoon of een stel. Beneden een open woonruimte met kitchenette en een badkamer met douche, wastafel en toilet; de vide benut de hoogte van de ruimte als privé slaapgedeelte. Geschikt voor een eigen perceel of vakantieverhuur.",
    ),
  },
  {
    key: "lunea",
    name: "Lunea",
    rooms: [["living", 15], ["bedroom", 7], ["bedroom2", 6.5], ["bathroom", 3.5]],
    areaM2: 32,
    bedrooms: 2,
    bathrooms: 1,
    roof: "gable",
    photos: ["01", "05", "06", "11", "12", "14", "13", "10", "08"],
    plans: [{ file: "04", level: "parter" }],
    description: L(
      "Kompaktowy dom mobilny 32 m² z dwiema niezależnymi sypialniami, otwartą strefą dzienną z aneksem kuchennym i łazienką z prysznicem. Przemyślany układ dobrze wykorzystuje niewielką powierzchnię. Sprawdza się jako domek na działkę, domek letniskowy lub jednostka noclegowa w obiekcie turystycznym.",
      "A compact 32 m² mobile home with two separate bedrooms, an open living area with kitchenette and a bathroom with shower. The well planned layout makes good use of a small footprint. Works as a home on a garden plot, a summer house or a rental unit in a tourist facility.",
      "Kompaktes mobiles Haus mit 32 m², zwei separaten Schlafzimmern, offenem Wohnbereich mit Küchenzeile und Bad mit Dusche. Der durchdachte Grundriss nutzt die kleine Fläche gut aus. Geeignet als Haus auf dem Grundstück, Ferienhaus oder Mieteinheit in einer touristischen Anlage.",
      "Compact mobiel huis van 32 m² met twee aparte slaapkamers, een open woonruimte met kitchenette en een badkamer met douche. De doordachte indeling benut de kleine oppervlakte goed. Geschikt als huis op een perceel, zomerhuis of verhuurunit in een toeristische accommodatie.",
    ),
  },
  {
    key: "aldea",
    name: "Aldea",
    rooms: [["living", 10], ["bedroom", 4.5], ["bedroom2", 3.5], ["bathroom", 2.5], ["hall", 3], ["mezzanine", 11.5]],
    areaM2: 35,
    bedrooms: 2,
    bathrooms: 1,
    roof: "gable",
    photos: ["01", "05", "03", "13", "15", "09", "12", "08"],
    plans: [
      { file: "07", level: "parter" },
      { file: "06", level: "pietro" },
    ],
    description: L(
      "Dom mobilny 35 m² w nowoczesnej bryle z dwuspadowym dachem i dużym przeszkleniem szczytu. Mieści salon z aneksem kuchennym, dwie sypialnie, łazienkę z prysznicem oraz antresolę na dodatkowe miejsce do spania lub przechowywania. Dobry wybór dla pary lub małej rodziny, na działkę rekreacyjną albo pod wynajem.",
      "A 35 m² mobile home with a modern gable roof form and a large glazed gable. It contains a living room with kitchenette, two bedrooms, a bathroom with shower and a mezzanine for extra sleeping space or storage. A good choice for a couple or a small family, on a leisure plot or for rental.",
      "Mobiles Haus mit 35 m² in moderner Form mit Satteldach und großer verglaster Giebelseite. Es bietet Wohnzimmer mit Küchenzeile, zwei Schlafzimmer, Bad mit Dusche und eine Galerie als zusätzlichen Schlaf- oder Stauraum. Eine gute Wahl für Paare oder kleine Familien, auf dem Freizeitgrundstück oder zur Vermietung.",
      "Mobiel huis van 35 m² met een moderne vorm, zadeldak en grote glazen kopgevel. Het bevat een woonkamer met kitchenette, twee slaapkamers, een badkamer met douche en een vide voor extra slaapruimte of opslag. Een goede keuze voor een stel of klein gezin, op een recreatieperceel of voor verhuur.",
    ),
  },
  {
    key: "primavera",
    name: "Primavera",
    rooms: [["living", 26.5], ["bedroom", 7], ["bedroom2", 4.5], ["bathroom", 2]],
    areaM2: 40,
    bedrooms: 2,
    bathrooms: 1,
    roof: "gable",
    photos: ["01", "06", "07", "08", "15", "14", "13", "11", "12", "09"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Dom mobilny 40 m² z dwiema sypialniami, łazienką z prysznicem, kuchnią i jasną strefą dzienną z dużymi przeszkleniami. Łączy kompaktową formę z wygodnym układem na krótsze i dłuższe pobyty. Sprawdza się jako domek na działkę, domek letniskowy lub jednostka noclegowa w ośrodku wypoczynkowym.",
      "A 40 m² mobile home with two bedrooms, a bathroom with shower, a kitchen and a bright living area with large glazing. It combines a compact form with a comfortable layout for short and longer stays. Suits a garden plot, a summer house or a rental unit in a holiday resort.",
      "Mobiles Haus mit 40 m², zwei Schlafzimmern, Bad mit Dusche, Küche und hellem Wohnbereich mit großen Glasflächen. Es verbindet kompakte Bauweise mit einem bequemen Grundriss für kurze und längere Aufenthalte. Geeignet für das Grundstück, als Ferienhaus oder als Mieteinheit in einer Ferienanlage.",
      "Mobiel huis van 40 m² met twee slaapkamers, een badkamer met douche, een keuken en een lichte woonruimte met grote glaspartijen. Het combineert een compacte vorm met een comfortabele indeling voor korte en langere verblijven. Geschikt voor een perceel, als zomerhuis of als verhuurunit op een vakantiepark.",
    ),
  },
  {
    key: "coastal",
    name: "Coastal",
    rooms: [["living", 25.5], ["bedroom", 9.5], ["bedroom2", 5.5], ["bathroom", 3.5]],
    areaM2: 44,
    bedrooms: 2,
    bathrooms: 1,
    roof: "flat",
    photos: ["01", "07", "06", "04", "15", "08", "09", "10", "11"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Dom mobilny 44 m² inspirowany nadmorskim stylem: przestronny salon z otwartą kuchnią, dwie sypialnie i łazienka z prysznicem. Sypialnia główna może służyć rodzicom, a druga jako pokój dziecięcy lub gościnny. Nadaje się na działkę, do obiektów turystycznych i pod wynajem krótkoterminowy.",
      "A 44 m² mobile home with a coastal feel: a spacious living room with open kitchen, two bedrooms and a bathroom with shower. The main bedroom suits the parents, the second works as a children's or guest room. Suits a private plot, tourist facilities and short-term rental.",
      "Mobiles Haus mit 44 m² im Küstenstil: geräumiges Wohnzimmer mit offener Küche, zwei Schlafzimmer und Bad mit Dusche. Das Hauptschlafzimmer eignet sich für die Eltern, das zweite als Kinder- oder Gästezimmer. Geeignet für das eigene Grundstück, touristische Anlagen und Kurzzeitvermietung.",
      "Mobiel huis van 44 m² met een kustuitstraling: een ruime woonkamer met open keuken, twee slaapkamers en een badkamer met douche. De hoofdslaapkamer is voor de ouders, de tweede dient als kinder- of logeerkamer. Geschikt voor een eigen perceel, toeristische accommodaties en kortetermijnverhuur.",
    ),
  },
  {
    key: "vernal",
    name: "Vernal",
    rooms: [["living", 21.5], ["bedroom", 6.5], ["bedroom2", 7], ["bedroom3", 5.5], ["bathroom", 4], ["bathroom2", 1.5]],
    areaM2: 46,
    bedrooms: 3,
    bathrooms: 2,
    roof: "gable",
    photos: ["01", "06", "07", "08", "09", "10", "12", "13", "14"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Dom mobilny 46 m² dla 4–6 osób: trzy sypialnie, dwie łazienki (każda z prysznicem, umywalką i WC) oraz salon z otwartą kuchnią. Rzadko spotykany układ na tej powierzchni daje więcej prywatności większej rodzinie lub grupie gości. Sprawdza się w ośrodkach wypoczynkowych i przy wynajmie krótkoterminowym.",
      "A 46 m² mobile home for 4–6 people: three bedrooms, two bathrooms (each with shower, washbasin and WC) and a living room with open kitchen. This uncommon layout for the size gives more privacy to a larger family or group of guests. Works well in holiday resorts and for short-term rental.",
      "Mobiles Haus mit 46 m² für 4–6 Personen: drei Schlafzimmer, zwei Bäder (jeweils mit Dusche, Waschbecken und WC) und Wohnzimmer mit offener Küche. Dieser für die Größe seltene Grundriss bietet größeren Familien oder Gästegruppen mehr Privatsphäre. Gut geeignet für Ferienanlagen und Kurzzeitvermietung.",
      "Mobiel huis van 46 m² voor 4–6 personen: drie slaapkamers, twee badkamers (elk met douche, wastafel en toilet) en een woonkamer met open keuken. Deze voor de oppervlakte zeldzame indeling geeft een groter gezin of een groep gasten meer privacy. Zeer geschikt voor vakantieparken en kortetermijnverhuur.",
    ),
  },
  {
    key: "aspen",
    name: "Aspen",
    rooms: [["living", 21], ["bedroom", 10.5], ["bedroom2", 5.5], ["bathroom", 5.5], ["hall", 4.5]],
    areaM2: 47,
    bedrooms: 2,
    bathrooms: 1,
    roof: "asym",
    photos: ["01", "05", "06", "07", "03", "08", "15", "14", "13"],
    plans: [{ file: "04", level: "parter" }],
    description: L(
      "Dom mobilny 47 m² z otwartą strefą dzienną łączącą salon i kuchnię, dwiema wydzielonymi sypialniami i łazienką z prysznicem. Ciemna zabudowa kuchni i drewniane akcenty tworzą nowoczesne wnętrze. Rozwiązanie na rodzinny wypoczynek, dłuższe pobyty lub do obiektu turystycznego.",
      "A 47 m² mobile home with an open living area combining lounge and kitchen, two separate bedrooms and a bathroom with shower. Dark kitchen units and wood accents create a modern interior. Suits family holidays, longer stays or a tourist facility.",
      "Mobiles Haus mit 47 m², offenem Wohnbereich mit Wohnzimmer und Küche, zwei separaten Schlafzimmern und Bad mit Dusche. Dunkle Küchenfronten und Holzakzente schaffen ein modernes Interieur. Für Familienurlaub, längere Aufenthalte oder eine touristische Anlage.",
      "Mobiel huis van 47 m² met een open woonruimte die zitkamer en keuken combineert, twee aparte slaapkamers en een badkamer met douche. Donkere keukenkasten en houten accenten zorgen voor een modern interieur. Geschikt voor gezinsvakanties, langere verblijven of een toeristische accommodatie.",
    ),
  },
  {
    key: "haven",
    name: "Haven",
    rooms: [["living", 27], ["bedroom", 11], ["bedroom2", 8], ["bathroom", 4]],
    areaM2: 50,
    bedrooms: 2,
    bathrooms: 1,
    roof: "flat",
    photos: ["01", "17", "11", "15", "06", "05", "10", "09"],
    plans: [{ file: "04", level: "parter" }],
    description: L(
      "Dom mobilny 50 m² z dwiema sypialniami, łazienką z prysznicem oraz salonem z dużymi przeszkleniami i wyjściem na balkon. Kuchnia jest częściowo zintegrowana z korytarzem, co daje swobodną komunikację i wyraźny podział na strefę dzienną i prywatną. Może pełnić funkcję prywatnego domu wypoczynkowego albo jednostki pod wynajem.",
      "A 50 m² mobile home with two bedrooms, a bathroom with shower, and a living room with large glazing and access to a balcony. The kitchen is partly integrated with the hallway, giving easy circulation and a clear split between the day and private zones. Works as a private holiday home or a rental unit.",
      "Mobiles Haus mit 50 m², zwei Schlafzimmern, Bad mit Dusche und Wohnzimmer mit großen Glasflächen und Zugang zum Balkon. Die Küche ist teilweise in den Flur integriert, das sorgt für freie Wege und eine klare Trennung von Wohn- und Privatbereich. Geeignet als privates Ferienhaus oder als Mieteinheit.",
      "Mobiel huis van 50 m² met twee slaapkamers, een badkamer met douche en een woonkamer met grote glaspartijen en toegang tot een balkon. De keuken is deels geïntegreerd in de gang, wat zorgt voor vrije doorloop en een duidelijke scheiding tussen woon- en privégedeelte. Geschikt als eigen vakantiehuis of als verhuurunit.",
    ),
  },
  {
    key: "edria",
    name: "Edria",
    rooms: [["living", 30], ["bedroom", 10], ["bedroom2", 10], ["bathroom", 5]],
    areaM2: 55,
    bedrooms: 2,
    bathrooms: 2,
    roof: "barn",
    photos: ["01", "04"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Dom mobilny 55 m² o bryle w stylu stodoły (barn), z dużymi przeszkleniami i jasnym wnętrzem. Mieści strefę dzienną z kuchnią, dwie sypialnie, dwie łazienki i antresolę, a taras jest integralną częścią projektu. Rozwiązanie dla rodziny potrzebującej więcej niezależnych pomieszczeń, także pod wynajem krótkoterminowy.",
      "A 55 m² mobile home with a barn-style form, large glazing and a bright interior. It holds a living area with kitchen, two bedrooms, two bathrooms and a mezzanine, with a terrace built into the design. Suits a family that needs more separate rooms, and short-term rental.",
      "Mobiles Haus mit 55 m² in Scheunenform (Barn-Stil), mit großen Glasflächen und hellem Interieur. Es bietet Wohnbereich mit Küche, zwei Schlafzimmer, zwei Bäder und eine Galerie; die Terrasse ist fester Bestandteil des Entwurfs. Für Familien, die mehr separate Räume brauchen, und für die Kurzzeitvermietung.",
      "Mobiel huis van 55 m² in schuurstijl (barn), met grote glaspartijen en een licht interieur. Het bevat een woonruimte met keuken, twee slaapkamers, twee badkamers en een vide; het terras is een vast onderdeel van het ontwerp. Voor een gezin dat meer aparte ruimtes nodig heeft, en voor kortetermijnverhuur.",
    ),
  },
  {
    key: "coral",
    name: "Coral",
    rooms: [["living", 29], ["bedroom", 11.5], ["bedroom2", 11], ["bathroom", 5.5]],
    areaM2: 57,
    bedrooms: 2,
    bathrooms: 1,
    roof: "gable",
    photos: ["01", "09", "02", "08", "07", "05", "04"],
    plans: [{ file: "03", level: "parter" }],
    description: L(
      "Dom mobilny 57 m² z przestronnym salonem i otwartym aneksem kuchennym, dwiema sypialniami, łazienką z prysznicem i praktycznymi schowkami. Duży taras stanowi przedłużenie części dziennej. Sprawdza się jako dom na działkę, dom całoroczny lub jednostka noclegowa w obiekcie turystycznym.",
      "A 57 m² mobile home with a spacious living room and open kitchenette, two bedrooms, a bathroom with shower and practical storage. A large terrace extends the living area outdoors. Suits a garden plot, year-round living or a rental unit in a tourist facility.",
      "Mobiles Haus mit 57 m², geräumigem Wohnzimmer mit offener Küchenzeile, zwei Schlafzimmern, Bad mit Dusche und praktischem Stauraum. Eine große Terrasse verlängert den Wohnbereich nach draußen. Geeignet für das Grundstück, zum ganzjährigen Wohnen oder als Mieteinheit in einer touristischen Anlage.",
      "Mobiel huis van 57 m² met een ruime woonkamer en open kitchenette, twee slaapkamers, een badkamer met douche en praktische bergruimte. Een groot terras verlengt de woonruimte naar buiten. Geschikt voor een perceel, om het hele jaar te wonen of als verhuurunit in een toeristische accommodatie.",
    ),
  },
  {
    key: "aurora",
    name: "Aurora",
    rooms: [["living", 28], ["bedroom", 9], ["bedroom2", 7.5], ["bathroom", 5.5], ["hall", 7.5], ["dressing", 1.5], ["utility", 1]],
    areaM2: 60,
    externalDimensions: "15 × 4,8 m",
    bedrooms: 2,
    bathrooms: 1,
    roof: "mono",
    photos: ["01", "07", "04", "09", "12", "13", "15", "10", "11"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Przestronny dom mobilny ok. 60 m² (ok. 15 × 4,8 m) z dużym salonem z aneksem kuchennym, dwiema sypialniami, osobną garderobą przy sypialni głównej, łazienką z prysznicem i pomieszczeniem gospodarczym z miejscem na pralkę. Centralny korytarz porządkuje układ, a wyjście na taras poszerza strefę wypoczynku. Model przeznaczony do użytkowania całorocznego, dla rodzin i do inwestycji turystycznych.",
      "A spacious mobile home of approx. 60 m² (approx. 15 × 4.8 m) with a large living room and kitchenette, two bedrooms, a separate walk-in wardrobe by the main bedroom, a bathroom with shower and a utility room with space for a washing machine. A central hallway organises the layout and a terrace door extends the living space. Designed for year-round use, for families and tourist investments alike.",
      "Geräumiges mobiles Haus mit ca. 60 m² (ca. 15 × 4,8 m), großem Wohnzimmer mit Küchenzeile, zwei Schlafzimmern, separater Ankleide am Hauptschlafzimmer, Bad mit Dusche und Hauswirtschaftsraum mit Platz für eine Waschmaschine. Ein zentraler Flur ordnet den Grundriss, ein Ausgang zur Terrasse erweitert den Wohnbereich. Für ganzjähriges Wohnen gedacht, für Familien ebenso wie für touristische Investitionen.",
      "Ruim mobiel huis van ca. 60 m² (ca. 15 × 4,8 m) met een grote woonkamer met kitchenette, twee slaapkamers, een aparte inloopkast bij de hoofdslaapkamer, een badkamer met douche en een bijkeuken met plaats voor een wasmachine. Een centrale gang ordent de indeling en een uitgang naar het terras vergroot de leefruimte. Bedoeld voor gebruik het hele jaar, voor gezinnen en toeristische investeringen.",
    ),
  },
  {
    key: "horizon",
    name: "Horizon",
    rooms: [["living", 27.5], ["bedroom", 8], ["bedroom2", 8.5], ["room", 5], ["bathroom", 3.5], ["bathroom2", 2], ["wc", 1.5], ["hall", 5.5]],
    areaM2: 61.5,
    builtUpAreaM2: 76.5,
    bedrooms: 3,
    bathrooms: 2,
    roof: "flat",
    photos: ["01", "15", "04", "09", "06", "08", "14", "12", "13"],
    plans: [{ file: "05", level: "parter" }],
    description: L(
      "Dom mobilny o powierzchni użytkowej 61,5 m² (zabudowy 76,5 m²) z trzema pokojami do spania, dwiema łazienkami i osobnym WC. Kuchnia ma wysoką lodówkę, płytę indukcyjną, mikrofalę z funkcją piekarnika, okap w zabudowie i zmywarkę 45 cm; w dwóch sypialniach są łóżka 160 cm z pojemnikiem na pościel, w trzecim pokoju łóżko i biurko. Ogrzewanie centralne, ocieplenie z wełny mineralnej 20 cm w dachu i podłodze oraz 15 cm w ścianach, przygotowanie pod bojler.",
      "A mobile home with 61.5 m² of usable floor area (76.5 m² footprint), three sleeping rooms, two bathrooms and a separate WC. The kitchen has a tall fridge, induction hob, microwave with oven function, built-in hood and a 45 cm dishwasher; two bedrooms have 160 cm beds with bedding storage, the third room has a bed and a desk. Central heating, mineral wool insulation of 20 cm in the roof and floor and 15 cm in the walls, prepared for a water heater.",
      "Mobiles Haus mit 61,5 m² Nutzfläche (76,5 m² bebaute Fläche), drei Schlafräumen, zwei Bädern und separatem WC. Die Küche hat einen hohen Kühlschrank, Induktionskochfeld, Mikrowelle mit Backofenfunktion, eingebaute Dunstabzugshaube und 45 cm Geschirrspüler; zwei Schlafzimmer haben 160 cm Betten mit Bettkasten, der dritte Raum Bett und Schreibtisch. Zentralheizung, Mineralwolldämmung mit 20 cm in Dach und Boden und 15 cm in den Wänden, Vorbereitung für einen Warmwasserspeicher.",
      "Mobiel huis met 61,5 m² gebruiksoppervlakte (76,5 m² bebouwde oppervlakte), drie slaapruimtes, twee badkamers en een apart toilet. De keuken heeft een hoge koelkast, inductiekookplaat, magnetron met ovenfunctie, ingebouwde afzuigkap en een vaatwasser van 45 cm; twee slaapkamers hebben bedden van 160 cm met beddengoedlade, de derde kamer een bed en een bureau. Centrale verwarming, isolatie van minerale wol van 20 cm in dak en vloer en 15 cm in de wanden, voorbereid voor een boiler.",
    ),
  },
];
