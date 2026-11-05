// Letniskowo sp. z o.o. (Białystok): 17 domów mobilnych, spec 0081. Źródła w _docs/letniskowo/ (poza repozytorium):
// ceny z oferty (EUR netto), wymiary i pomieszczenia z kart modeli. Dane handlowca nie wchodzą do kodu ani bazy.
// Każdy tekst widoczny dla klienta ma cztery wersje językowe (pl jest źródłem, en/de/nl idą do tabel tłumaczeń, spec 0067).
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:letniskowo";
export const PRODUCER_ID = "e0030000-0000-4000-8000-000000000110";
export const TECHNICAL_ACCOUNT_EMAIL = "catalog-import+letniskowo@modularhub.invalid";

export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`letniskowo:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// NIP roboczy (AC-1): prawdziwy z rejestru potwierdza Stanisław przed produkcją; do tego czasu dev ma wartość techniczną.
export const NIP_PLACEHOLDER = "CATALOG-LETNISKOWO";

export const LETNISKOWO_PRODUCER = {
  name: "Letniskowo sp. z o.o.",
  nip: NIP_PLACEHOLDER,
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent całorocznych domów mobilnych z Białegostoku. Konstrukcja ze stali z izolacją PUR, na podwoziu stałym (FF) albo mobilnym (MP). Ponad 2000 dostarczonych domów w Europie. Firma ma certyfikaty ISO 9001 i ISO 14001.",
    "Producer of year-round mobile homes from Białystok, Poland. Steel construction with PUR insulation, on a fixed (FF) or mobile (MP) chassis. More than 2000 homes delivered across Europe. The company holds ISO 9001 and ISO 14001 certificates.",
    "Hersteller ganzjährig nutzbarer mobiler Häuser aus Białystok, Polen. Stahlkonstruktion mit PUR-Dämmung, auf festem (FF) oder mobilem (MP) Fahrgestell. Mehr als 2000 gelieferte Häuser in ganz Europa. Das Unternehmen besitzt die Zertifikate ISO 9001 und ISO 14001.",
    "Producent van mobiele huizen voor het hele jaar uit Białystok, Polen. Staalconstructie met PUR-isolatie, op een vast (FF) of mobiel (MP) onderstel. Meer dan 2000 geleverde huizen in heel Europa. Het bedrijf heeft de certificaten ISO 9001 en ISO 14001.",
  ),
};

export const CERTIFICATIONS = [
  { key: "iso-9001", name: L("ISO 9001 (ważny do 07.12.2028)", "ISO 9001 (valid until 07.12.2028)", "ISO 9001 (gültig bis 07.12.2028)", "ISO 9001 (geldig tot 07.12.2028)") },
  { key: "iso-14001", name: L("ISO 14001 (ważny do 07.12.2028)", "ISO 14001 (valid until 07.12.2028)", "ISO 14001 (gültig bis 07.12.2028)", "ISO 14001 (geldig tot 07.12.2028)") },
] as const;

export const ELIGIBILITY_REASON = L(
  "Dom mobilny jest dostarczany w całości z fabryki. Wymagania lokalne (zgłoszenie, podłączenia, posadowienie) zależą od kraju i działki.",
  "The mobile home is delivered complete from the factory. Local requirements (notification, connections, foundation) depend on the country and the plot.",
  "Das mobile Haus wird komplett ab Werk geliefert. Lokale Anforderungen (Anzeige, Anschlüsse, Aufstellung) hängen vom Land und vom Grundstück ab.",
  "Het mobiele huis wordt compleet vanuit de fabriek geleverd. Lokale eisen (melding, aansluitingen, fundering) hangen af van het land en het perceel.",
);

export const CONSTRUCTION_SYSTEM = L(
  "Konstrukcja stalowa z izolacją PUR, na podwoziu typu FF (płaskim).",
  "Steel construction with PUR insulation, on an FF type (flat) chassis.",
  "Stahlkonstruktion mit PUR-Dämmung auf einem Fahrgestell vom Typ FF (flach).",
  "Staalconstructie met PUR-isolatie, op een onderstel van het type FF (vlak).",
);

export const CUSTOMIZATION_SCOPE = L(
  "Wybór opcji płatnych z cennika producenta (podwozie, izolacja, instalacje, wyposażenie) oraz stylistyki wnętrza. Projekt indywidualny jako osobna opcja.",
  "A choice of paid options from the producer's price list (chassis, insulation, installations, equipment) and an interior style. A custom design is available as a separate option.",
  "Auswahl kostenpflichtiger Optionen aus der Preisliste des Herstellers (Fahrgestell, Dämmung, Installationen, Ausstattung) sowie eines Innenstils. Ein individueller Entwurf ist als eigene Option möglich.",
  "Keuze uit betaalde opties uit de prijslijst van de producent (onderstel, isolatie, installaties, uitrusting) en een interieurstijl. Een eigen ontwerp is als aparte optie mogelijk.",
);

export const SCOPE_SUMMARY = L(
  "Dom mobilny gotowy do użytkowania, z wyposażeniem kuchni i łazienki wg karty modelu. Cena z oferty producenta, EUR netto.",
  "A ready to use mobile home with kitchen and bathroom equipment as listed on the model card. Price from the producer's offer, EUR net.",
  "Gebrauchsfertiges mobiles Haus mit Küchen- und Badausstattung laut Modellkarte. Preis aus dem Angebot des Herstellers, EUR netto.",
  "Gebruiksklaar mobiel huis met keuken- en badkameruitrusting volgens de modelkaart. Prijs uit het aanbod van de producent, EUR netto.",
);

export const EXCLUDED_SCOPE = L(
  "Transport, przyłącza na działce i posadowienie nie wchodzą w cenę domu.",
  "Transport, connections on the plot and foundation are not included in the price of the home.",
  "Transport, Anschlüsse auf dem Grundstück und Aufstellung sind im Hauspreis nicht enthalten.",
  "Transport, aansluitingen op het perceel en fundering zijn niet inbegrepen in de prijs van het huis.",
);

export type Line = "comfort" | "premium" | "vario";
export type RoomKind =
  | "living"
  | "kitchenDining"
  | "bedroom"
  | "bathroom"
  | "bathroom2"
  | "room"
  | "room2"
  | "wardrobe"
  | "dressing"
  | "mezzanine"
  | "entry";

export const ROOM_NAMES: Record<RoomKind, L10n> = {
  living: L("Salon z kuchnią", "Living room with kitchen", "Wohnzimmer mit Küche", "Woonkamer met keuken"),
  kitchenDining: L("Kuchnia z jadalnią", "Kitchen with dining area", "Küche mit Essbereich", "Keuken met eethoek"),
  bedroom: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
  bathroom: L("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
  bathroom2: L("Łazienka 2", "Bathroom 2", "Badezimmer 2", "Badkamer 2"),
  room: L("Pokój", "Room", "Zimmer", "Kamer"),
  room2: L("Pokój 2", "Room 2", "Zimmer 2", "Kamer 2"),
  wardrobe: L("Garderoba", "Wardrobe", "Ankleide", "Garderobe"),
  dressing: L("Garderoba", "Dressing room", "Ankleidezimmer", "Kleedkamer"),
  mezzanine: L("Antresola", "Mezzanine", "Zwischengeschoss", "Tussenverdieping"),
  entry: L("Wiatrołap", "Entryway", "Eingangsbereich", "Entree"),
};

export interface ModelSource {
  name: string;
  line: Line;
  priceEur: number;
  // Powierzchnia zabudowy z karty (m²), podstawa klas rozmiaru opcji.
  areaM2: number;
  lengthM: number;
  widthM: number;
  capacity: string;
  insulationCm: 13 | 18;
  weightT: number | null;
  roofAngle: number;
  wallHeightCm: number;
  rooms: ReadonlyArray<[RoomKind, number]>;
  // Pokój z łóżkiem pojedynczym (opcje "pokój", łóżko piętrowe). Bremen, Zen i Sky Light go nie mają.
  hasRoom: boolean;
  // Wartości graniczne klas rozmiaru do potwierdzenia u klienta (AC-15).
  borderline?: string;
  /** Pliki w tmp/letniskowo/<key>/ (wyciągnięte z karty skryptem prepare). */
  key: string;
}

export const MODELS: readonly ModelSource[] = [
  { key: "zen", name: "Zen", line: "comfort", priceEur: 46100, areaM2: 35, lengthM: 9.85, widthM: 3.55, capacity: "4-6", insulationCm: 13, weightT: 8.5, roofAngle: 20, wallHeightCm: 243, hasRoom: false, rooms: [["living", 16.76], ["bedroom", 7.06], ["bathroom", 3.23], ["mezzanine", 3], ["entry", 1.79]] },
  { key: "bali", name: "Bali", line: "comfort", priceEur: 43900, areaM2: 34.88, lengthM: 9.88, widthM: 3.53, capacity: "3-5", insulationCm: 13, weightT: 8.5, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 11.19], ["bedroom", 6.42], ["bathroom", 3.11], ["room", 6.42], ["entry", 1.55]] },
  { key: "malibu", name: "Malibu", line: "comfort", priceEur: 43900, areaM2: 34.88, lengthM: 9.88, widthM: 3.53, capacity: "3-5", insulationCm: 13, weightT: 8.5, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 11.97], ["bedroom", 7.14], ["bathroom", 3.11], ["room", 3.77], ["entry", 2.62]] },
  { key: "bremen", name: "Bremen", line: "comfort", priceEur: 49100, areaM2: 39.98, lengthM: 9.68, widthM: 4.13, capacity: "2-4", insulationCm: 13, weightT: 9, roofAngle: 20, wallHeightCm: 235, hasRoom: false, rooms: [["living", 19.86], ["bedroom", 8.95], ["bathroom", 3.93], ["entry", 1.93]], borderline: "Opcja izolacji 18 cm: Bremen (39,98 m²) nie jest 'tylko 13 cm PUR', klasa 50 do potwierdzenia." },
  { key: "palermo", name: "Palermo", line: "comfort", priceEur: 49800, areaM2: 50, lengthM: 12.13, widthM: 4.13, capacity: "3-5", insulationCm: 18, weightT: 10, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 18.69], ["bedroom", 8.94], ["bathroom", 4.06], ["room", 5.07], ["entry", 3.29]] },
  { key: "riviera", name: "Riviera", line: "comfort", priceEur: 49800, areaM2: 50, lengthM: 12.13, widthM: 4.13, capacity: "3-5", insulationCm: 13, weightT: 10, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 18.08], ["bedroom", 8.86], ["bathroom", 4.06], ["room", 7.34], ["entry", 1.84]] },
  { key: "nicea", name: "Nicea", line: "comfort", priceEur: 51900, areaM2: 50.95, lengthM: 11.5, widthM: 4.43, capacity: "3-5", insulationCm: 13, weightT: 10, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 16.15], ["bedroom", 9.71], ["bathroom", 3.58], ["room", 5.2], ["entry", 6.52]], borderline: "Nicea (50,95 m²) wpada do klasy 70 podwozia, ogrzewania, paneli, izolacji i podwyższenia ściany; do potwierdzenia." },
  { key: "elba", name: "Elba", line: "comfort", priceEur: 57700, areaM2: 55, lengthM: 13.33, widthM: 4.13, capacity: "4-6", insulationCm: 13, weightT: 10, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 18.62], ["bedroom", 10.16], ["bathroom", 5.1], ["room", 6.09], ["entry", 4.72]] },
  { key: "malta", name: "Malta", line: "comfort", priceEur: 60990, areaM2: 59.05, lengthM: 13.33, widthM: 4.43, capacity: "4-6", insulationCm: 13, weightT: 12, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 18.1], ["bedroom", 7.06], ["bathroom", 5.73], ["bathroom2", 3.49], ["room", 4.4], ["room2", 5.73], ["entry", 4.85]] },
  { key: "madera", name: "Madera", line: "comfort", priceEur: 60990, areaM2: 59.05, lengthM: 13.33, widthM: 4.43, capacity: "3-5", insulationCm: 13, weightT: 12, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 19.4], ["bedroom", 7.79], ["bathroom", 4.31], ["room", 6.96], ["wardrobe", 3.5], ["entry", 5.77]] },
  { key: "sylt", name: "Sylt", line: "comfort", priceEur: 62300, areaM2: 62.28, lengthM: 13.81, widthM: 4.51, capacity: "4-6", insulationCm: 13, weightT: 12, roofAngle: 20, wallHeightCm: 235, hasRoom: true, rooms: [["living", 20.48], ["bedroom", 11.54], ["bathroom", 4.01], ["room", 5.63], ["room2", 5.63], ["entry", 3.29]] },
  { key: "sky-light", name: "Sky Light", line: "premium", priceEur: 71428, areaM2: 40.34, lengthM: 9.36, widthM: 4.31, capacity: "2-4", insulationCm: 18, weightT: 11, roofAngle: 20, wallHeightCm: 210, hasRoom: false, rooms: [["kitchenDining", 15.32], ["bedroom", 9.21], ["bathroom", 4.78], ["entry", 2.7]], borderline: "Sky Light (40,34 m²) wpada do klasy 50 paneli winylowych; do potwierdzenia." },
  { key: "silver-moon", name: "Silver Moon", line: "premium", priceEur: 84523, areaM2: 57, lengthM: 13.4, widthM: 4.3, capacity: "4-6", insulationCm: 18, weightT: 13, roofAngle: 20, wallHeightCm: 210, hasRoom: true, rooms: [["kitchenDining", 21.61], ["bedroom", 9.76], ["room", 5.58], ["bathroom", 4.6], ["entry", 4.76]] },
  { key: "black-stone", name: "Black Stone", line: "premium", priceEur: 84523, areaM2: 57.75, lengthM: 13.4, widthM: 4.31, capacity: "3-5", insulationCm: 18, weightT: 13, roofAngle: 20, wallHeightCm: 210, hasRoom: true, rooms: [["living", 17.46], ["bedroom", 10.15], ["room", 5.8], ["bathroom", 4.85], ["entry", 8.73]] },
  { key: "moon-light", name: "Moon Light", line: "premium", priceEur: 95238, areaM2: 57.75, lengthM: 13.4, widthM: 4.31, capacity: "4-6", insulationCm: 18, weightT: 13, roofAngle: 20, wallHeightCm: 210, hasRoom: true, rooms: [["kitchenDining", 15.49], ["bedroom", 8.28], ["room", 5.77], ["room2", 4.89], ["bathroom", 3.46], ["entry", 8.58]] },
  { key: "vario-3br", name: "Vario 3BR", line: "vario", priceEur: 156900, areaM2: 116.81, lengthM: 13.84, widthM: 8.44, capacity: "5-7", insulationCm: 18, weightT: null, roofAngle: 13, wallHeightCm: 250, hasRoom: false, rooms: [["living", 15.58], ["kitchenDining", 26.15], ["bedroom", 13.6], ["room", 5.96], ["room2", 11.47], ["bathroom", 4.45], ["bathroom2", 3.04], ["entry", 3.42]] },
  { key: "vario-2br", name: "Vario 2BR", line: "vario", priceEur: 156900, areaM2: 116.81, lengthM: 13.84, widthM: 8.44, capacity: "4-6", insulationCm: 18, weightT: null, roofAngle: 13, wallHeightCm: 250, hasRoom: false, rooms: [["living", 16.81], ["kitchenDining", 26.34], ["bedroom", 13.6], ["room", 11.47], ["bathroom", 4.45], ["bathroom2", 3.04], ["dressing", 5.04], ["entry", 3.42]] },
];

export const productId = (model: ModelSource): string => detUuid(`product:${model.key}`);
export const variantId = (model: ModelSource): string => detUuid(`variant:${model.key}`);
export const roomId = (model: ModelSource, index: number): string => `${model.key}-room-${index}`;

const num = (n: number, locale: "pl" | "en" | "de" | "nl"): string => String(n).replace(".", locale === "en" ? "." : ",");

const LINE_NAME: Record<Line, L10n> = {
  comfort: L("Comfort", "Comfort", "Comfort", "Comfort"),
  premium: L("Premium", "Premium", "Premium", "Premium"),
  vario: L("Premium Vario", "Premium Vario", "Premium Vario", "Premium Vario"),
};

export function descriptionOf(model: ModelSource): L10n {
  const dims = (loc: "pl" | "en" | "de" | "nl") => `${num(model.lengthM, loc)} × ${num(model.widthM, loc)} m`;
  const area = (loc: "pl" | "en" | "de" | "nl") => num(model.areaM2, loc);
  const floorHeating = model.line !== "comfort";
  return L(
    `${model.name} to dom mobilny z linii ${LINE_NAME[model.line].pl}: ${dims("pl")}, powierzchnia zabudowy ${area("pl")} m², dla ${model.capacity} osób. Izolacja PUR ${model.insulationCm} cm, dach dwuspadowy ${model.roofAngle}°, wysokość ścian ${model.wallHeightCm} cm${floorHeating ? ", ogrzewanie podłogowe w standardzie" : ""}.`,
    `${model.name} is a mobile home from the ${LINE_NAME[model.line].en} line: ${dims("en")}, footprint ${area("en")} m², for ${model.capacity} people. ${model.insulationCm} cm PUR insulation, gable roof ${model.roofAngle}°, wall height ${model.wallHeightCm} cm${floorHeating ? ", underfloor heating as standard" : ""}.`,
    `${model.name} ist ein mobiles Haus der Linie ${LINE_NAME[model.line].de}: ${dims("de")}, Grundfläche ${area("de")} m², für ${model.capacity} Personen. ${model.insulationCm} cm PUR-Dämmung, Satteldach ${model.roofAngle}°, Wandhöhe ${model.wallHeightCm} cm${floorHeating ? ", Fußbodenheizung serienmäßig" : ""}.`,
    `${model.name} is een mobiel huis uit de lijn ${LINE_NAME[model.line].nl}: ${dims("nl")}, bebouwde oppervlakte ${area("nl")} m², voor ${model.capacity} personen. ${model.insulationCm} cm PUR-isolatie, zadeldak ${model.roofAngle}°, wandhoogte ${model.wallHeightCm} cm${floorHeating ? ", vloerverwarming standaard" : ""}.`,
  );
}

export const ROOF_TYPE = L("Dach dwuspadowy", "Gable roof", "Satteldach", "Zadeldak");

export function roofTypeOf(model: ModelSource): L10n {
  return L(
    `${ROOF_TYPE.pl}, ${model.roofAngle}°`,
    `${ROOF_TYPE.en}, ${model.roofAngle}°`,
    `${ROOF_TYPE.de}, ${model.roofAngle}°`,
    `${ROOF_TYPE.nl}, ${model.roofAngle}°`,
  );
}

// Dane techniczne rodziny dom; pola, których dokumenty nie podają (liczby U, status posadowienia), zostają puste.
export function technicalSpecsOf(model: ModelSource) {
  const comfort = model.line === "comfort";
  return {
    wallBuildUp: `Konstrukcja stalowa, izolacja PUR ${model.insulationCm} cm.`,
    insulation: `${model.insulationCm} cm PUR${model.line === "vario" ? " (ściany), 23 cm (dach)" : ""}`,
    windowClass: comfort ? "Okna dwuszybowe" : "Okna trójszybowe",
    heatTransferCoefficients: "nieznana" as const,
    ventilation: model.line === "vario" ? ("rekuperacja" as const) : ("inna" as const),
    ...(model.line === "vario" ? {} : { ventilationOther: "Mechaniczna wentylacja wyciągowa." }),
    heatSource: "elektryczne" as const,
    constructionTechnology: "modulowa-stal-lekka" as const,
  };
}

// Oferta podaje tylko nazwy kroków i jedno zdanie opisu współpracy; treść poniżej nie zawiera terminów ani obietnic spoza oferty.
export const COLLABORATION_STEPS = [
  { key: "needs", title: L("Analiza potrzeb", "Needs analysis", "Bedarfsanalyse", "Behoefteanalyse"), body: L("Zaczynamy od szczegółowej analizy Twoich potrzeb.", "We start with a detailed analysis of your needs.", "Wir beginnen mit einer detaillierten Bedarfsanalyse.", "We beginnen met een gedetailleerde analyse van uw behoeften.") },
  { key: "planning", title: L("Planowanie i dopasowanie", "Planning and customization", "Planung und Anpassung", "Planning en aanpassing"), body: L("Tworzymy projekty szyte na miarę.", "We create tailor-made designs.", "Wir erstellen maßgeschneiderte Entwürfe.", "We maken ontwerpen op maat.") },
  { key: "production", title: L("Produkcja", "Production", "Produktion", "Productie"), body: L("Produkcją zajmuje się nasz doświadczony zespół.", "Our experienced team takes care of production.", "Unser erfahrenes Team übernimmt die Produktion.", "Ons ervaren team zorgt voor de productie.") },
  { key: "transport", title: L("Transport", "Transport", "Transport", "Transport"), body: L("Bezpieczny transport prosto na Twoje miejsce.", "Safe transport directly to your site.", "Sicherer Transport direkt zu Ihrem Standort.", "Veilig transport rechtstreeks naar uw locatie.") },
  { key: "service", title: L("Serwis i wsparcie po zakupie", "Service and support after purchase", "Service und Support nach dem Kauf", "Service en ondersteuning na aankoop"), body: L("Kompleksowy serwis i stałe wsparcie także po przekazaniu domu.", "Comprehensive service and ongoing support even after handover.", "Umfassender Service und laufende Unterstützung auch nach der Übergabe.", "Uitgebreide service en doorlopende ondersteuning, ook na de oplevering.") },
] as const;

// Osiem zastosowań komercyjnych z oferty (tylko tytuły, oferta nie opisuje ich szerzej).
export const COMMERCIAL_USES = [
  { key: "hotel", title: L("Rozbudowa hotelu", "Hotel extensions", "Hotelerweiterungen", "Hoteluitbreidingen") },
  { key: "workers", title: L("Kwatery pracownicze", "Staff accommodation", "Mitarbeiterunterkünfte", "Personeelshuisvesting") },
  { key: "glamping", title: L("Glamping premium", "Premium glamping", "Premium-Glamping", "Premium glamping") },
  { key: "salon", title: L("Salon fryzjerski i kosmetyczny", "Hair and beauty salon", "Friseur- und Kosmetiksalon", "Kapsalon en schoonheidssalon") },
  { key: "shop", title: L("Punkt handlowy lub usługowy", "Retail or service point", "Verkaufs- oder Servicepunkt", "Verkoop- of servicepunt") },
  { key: "school", title: L("Przedszkole", "Kindergarten", "Kindergarten", "Kleuterschool") },
  { key: "office", title: L("Biuro lub showroom", "Office or showroom", "Büro oder Showroom", "Kantoor of showroom") },
  { key: "technical", title: L("Pomieszczenia techniczne i magazynowe, także mobilne warsztaty", "Technical and storage rooms, including mobile workshops", "Technik- und Lagerräume, auch mobile Werkstätten", "Technische en opslagruimtes, ook mobiele werkplaatsen") },
] as const;
