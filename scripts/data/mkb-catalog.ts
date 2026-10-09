// MKB Inwestycje (mkb-inwestycje.pl, stan 2026-10-09): 7 modeli domów SIP ze strony producenta.
// Źródło to publiczne strony modeli, nie katalog PDF. Producent potwierdził zgodę na użycie grafik.
// Każdy tekst widoczny dla klienta ma tu cztery wersje językowe (pl jest źródłem, en/de/nl idą do
// tabel tłumaczeń, spec 0067). Strona nie podaje cen, terminów ani wymiarów zewnętrznych, więc
// te pola zostają puste celowo.
//
// Rozbieżności między stroną a listingiem, rozstrzygnięte tak: liczba pokoi i łazienek z tabeli
// "Parametry" na stronie modelu (nie z listingu "Nasze domy"); opis HARMONY 90 na stronie jest
// kopią opisu PULSE 52 (antresola), więc opis i układ zostały oparte na rzucie (parter, 2 sypialnie).
export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:mkb";
export const PRODUCER_ID = "e0030000-0000-4000-8000-0000000000ff";

export const MKB_PRODUCER = {
  name: "MKB Inwestycje",
  nip: "CATALOG-MKB",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent prefabrykowanych domów modułowych w technologii SIP: panele konstrukcyjne z rdzeniem izolacyjnym z pianki PIR, produkowane fabrycznie i montowane na działce. Oferta obejmuje siedem gotowych projektów od 52 do 175 m², od kompaktowych domów rekreacyjnych po duże domy rodzinne z garażem. Każdy projekt jest punktem wyjścia: elewację, okna, taras, układ i standard wykończenia można dopasować do inwestora.",
    "Producer of prefabricated modular houses in SIP technology: structural panels with a PIR foam insulating core, made in a factory and assembled on site. The range covers seven ready-made designs from 52 to 175 m², from compact leisure houses to large family homes with a garage. Each design is a starting point: the facade, windows, terrace, layout and finishing standard can be adapted to the investor.",
    "Hersteller vorgefertigter Modulhäuser in SIP-Bauweise: tragende Paneele mit Dämmkern aus PIR-Schaum, im Werk gefertigt und auf dem Grundstück montiert. Das Angebot umfasst sieben fertige Entwürfe von 52 bis 175 m², von kompakten Freizeithäusern bis zu großen Familienhäusern mit Garage. Jeder Entwurf ist ein Ausgangspunkt: Fassade, Fenster, Terrasse, Grundriss und Ausbaustandard lassen sich an den Bauherrn anpassen.",
    "Producent van geprefabriceerde modulaire huizen in SIP-technologie: constructiepanelen met een isolatiekern van PIR-schuim, in de fabriek gemaakt en op de bouwplaats gemonteerd. Het aanbod omvat zeven kant-en-klare ontwerpen van 52 tot 175 m², van compacte recreatiehuizen tot grote gezinswoningen met garage. Elk ontwerp is een uitgangspunt: gevel, ramen, terras, indeling en afwerkingsniveau kunnen op de bouwheer worden afgestemd.",
  ),
} as const;

export const ELIGIBILITY_REASON = L(
  "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
  "Feasibility and formal requirements depend on the specific plot and local regulations.",
  "Machbarkeit und formale Anforderungen hängen vom konkreten Grundstück und den örtlichen Vorgaben ab.",
  "De haalbaarheid en de formele vereisten hangen af van de specifieke kavel en de lokale regels.",
);

export const CONSTRUCTION_SYSTEM = L(
  "Panele SIP: dwie płyty konstrukcyjne z rdzeniem z pianki PIR.",
  "SIP panels: two structural boards with a PIR foam core.",
  "SIP-Paneele: zwei tragende Platten mit Kern aus PIR-Schaum.",
  "SIP-panelen: twee constructieplaten met een kern van PIR-schuim.",
);

export const CUSTOMIZATION_SCOPE = L(
  "Projekt jest punktem wyjścia: można dopasować elewację (kolor i materiał), okna, taras, układ pomieszczeń oraz standard wykończenia.",
  "The design is a starting point: the facade (colour and material), windows, terrace, room layout and finishing standard can be adapted.",
  "Der Entwurf ist ein Ausgangspunkt: Fassade (Farbe und Material), Fenster, Terrasse, Raumaufteilung und Ausbaustandard lassen sich anpassen.",
  "Het ontwerp is een uitgangspunt: gevel (kleur en materiaal), ramen, terras, indeling en afwerkingsniveau kunnen worden aangepast.",
);

export const ROOF_DUO_35 = L("Dwuspadowy, 35°", "Gable roof, 35°", "Satteldach, 35°", "Zadeldak, 35°");
export const ROOF_DUO = L("Dwuspadowy", "Gable roof", "Satteldach", "Zadeldak");

// Katalog aplikacji dopuszcza tylko te dwie kategorie dla domów całorocznych/rekreacyjnych.
export interface MkbProjectSource {
  id: string;
  name: string;
  floorAreaM2: number;
  category: "caloroczny" | "rekreacyjny-caloroczny";
  rooms: number;
  bedrooms: number | null;
  bathrooms: number;
  storeys: number;
  roofType: L10n;
  description: L10n;
  // Ścieżki względem katalogu głównego repo (tmp/ jest w .gitignore).
  coverPhoto: string;
  galleryPhotos: string[];
  // Rzuty pierwsze, potem elewacje i przekroje (wszystkie jako product_floor_plan).
  floorPlans: string[];
  sourceUrl: string;
}

const D = "tmp/mkb-catalog";
const id = (n: number) => `e0030000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const MKB_PROJECTS: MkbProjectSource[] = [
  {
    id: id(1),
    name: "PULSE 52",
    floorAreaM2: 52,
    category: "rekreacyjny-caloroczny",
    rooms: 3,
    bedrooms: 1,
    bathrooms: 1,
    storeys: 1,
    roofType: ROOF_DUO_35,
    description: L(
      "Kompaktowy dom rekreacyjny lub całoroczny dla pary, małej rodziny albo działki rekreacyjnej. Otwarta strefa dzienna, antresola i wydzielona sypialnia tworzą komfortową strefę prywatną, a duże przeszklenia wpuszczają dużo światła. Układ można dopasować do potrzeb inwestora.",
      "A compact leisure or year-round house for a couple, a small family or a recreational plot. An open living area, a mezzanine and a separate bedroom form a comfortable private zone, and large windows let in plenty of light. The layout can be adapted to the investor's needs.",
      "Ein kompaktes Freizeit- oder Ganzjahreshaus für ein Paar, eine kleine Familie oder ein Erholungsgrundstück. Ein offener Wohnbereich, eine Galerie und ein separates Schlafzimmer bilden einen komfortablen privaten Bereich, große Fenster lassen viel Licht herein. Der Grundriss lässt sich an die Wünsche des Bauherrn anpassen.",
      "Een compact recreatie- of jaarrondhuis voor een stel, een klein gezin of een recreatiekavel. Een open woonruimte, een mezzanine en een aparte slaapkamer vormen een comfortabele privézone, en grote ramen laten veel licht binnen. De indeling kan worden aangepast aan de wensen van de bouwheer.",
    ),
    coverPhoto: `${D}/pulse-52/PULSE_52-4.jpg`,
    galleryPhotos: [
      "PULSE_52-3.jpg",
      "PULSE_52-7.jpg",
      "PULSE_52-5.jpg",
      "PULSE_52-6.jpg",
      "PULSE_52-8.jpg",
      "PULSE_52-12.jpg",
      "PULSE_52-13.jpg",
      "PULSE_52-11.jpg",
      "PULSE_52-18.jpg",
      "PULSE_52-16.jpg",
      "PULSE_52-14.jpg",
    ].map((file) => `${D}/pulse-52/${file}`),
    floorPlans: ["PULSE_52_1.jpg", "PULSE_52_2.jpg", "PULSE_52_3.jpg", "PULSE_52_4.jpg"].map((file) => `${D}/pulse-52/${file}`),
    sourceUrl: "https://mkb-inwestycje.pl/pulse-52/",
  },
  {
    id: id(2),
    name: "NEST 53",
    floorAreaM2: 53,
    category: "caloroczny",
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    storeys: 1,
    roofType: ROOF_DUO,
    description: L(
      "Kompaktowy, parterowy dom całoroczny dla par i małych rodzin. Dwie niezależne sypialnie i otwarta strefa dzienna łącząca salon, kuchnię i jadalnię, a nad częścią dzienną katedralny sufit otwarty aż po dach. Duże przeszklenie i bezpośrednie wyjście na taras łączą salon z ogrodem.",
      "A compact single-storey year-round house for couples and small families. Two separate bedrooms and an open living area combining lounge, kitchen and dining, with a cathedral ceiling open up to the roof above the living part. Large glazing and direct access to the terrace connect the living room with the garden.",
      "Ein kompaktes, eingeschossiges Ganzjahreshaus für Paare und kleine Familien. Zwei getrennte Schlafzimmer und ein offener Wohnbereich mit Wohnzimmer, Küche und Esszimmer; über dem Wohnbereich eine Kathedralendecke bis unter das Dach. Große Verglasung und der direkte Ausgang zur Terrasse verbinden das Wohnzimmer mit dem Garten.",
      "Een compact huis van één bouwlaag voor het hele jaar, voor stellen en kleine gezinnen. Twee aparte slaapkamers en een open woonruimte met woonkamer, keuken en eetkamer, met boven het woongedeelte een kathedraalplafond tot aan het dak. Een grote beglazing en directe toegang tot het terras verbinden de woonkamer met de tuin.",
    ),
    coverPhoto: `${D}/nest-53/image1-1.jpg`,
    galleryPhotos: ["image2-1.jpg", "image3-1.jpg"].map((file) => `${D}/nest-53/${file}`),
    floorPlans: [`${D}/nest-53/image0-1.jpg`],
    sourceUrl: "https://mkb-inwestycje.pl/nest-53/",
  },
  {
    id: id(3),
    name: "HARMONY 90",
    floorAreaM2: 90,
    category: "caloroczny",
    rooms: 2,
    bedrooms: 2,
    bathrooms: 2,
    storeys: 1,
    roofType: ROOF_DUO_35,
    description: L(
      "Parterowy dom całoroczny dla małej rodziny. Przestronna, otwarta strefa dzienna łączy salon, jadalnię i kuchnię z wyjściem na taras, a dwie sypialnie, łazienka i osobne WC tworzą strefę prywatną. Duże przeszklenia, kompaktowa bryła i możliwość dopasowania układu do inwestora.",
      "A single-storey year-round house for a small family. A spacious, open living area combines lounge, dining and kitchen with access to the terrace, while two bedrooms, a bathroom and a separate WC form the private zone. Large windows, a compact shape and a layout that can be adapted to the investor.",
      "Ein eingeschossiges Ganzjahreshaus für eine kleine Familie. Ein großzügiger, offener Wohnbereich verbindet Wohnzimmer, Esszimmer und Küche mit dem Ausgang zur Terrasse, zwei Schlafzimmer, ein Bad und ein separates WC bilden den privaten Bereich. Große Fenster, ein kompakter Baukörper und ein an den Bauherrn anpassbarer Grundriss.",
      "Een huis van één bouwlaag voor het hele jaar, voor een klein gezin. Een ruime, open woonruimte verbindt woonkamer, eetkamer en keuken met toegang tot het terras, terwijl twee slaapkamers, een badkamer en een apart toilet de privézone vormen. Grote ramen, een compact volume en een indeling die op de bouwheer kan worden afgestemd.",
    ),
    coverPhoto: `${D}/harmony-90/HArmony_90_1.jpg`,
    galleryPhotos: ["HArmony_90_2.jpg", "HArmony_90_3.jpg"].map((file) => `${D}/harmony-90/${file}`),
    floorPlans: [`${D}/harmony-90/rozklad-HARMONY-90.jpg`],
    sourceUrl: "https://mkb-inwestycje.pl/harmony-90/",
  },
  {
    id: id(4),
    name: "VISION 103",
    floorAreaM2: 103,
    category: "caloroczny",
    rooms: 4,
    bedrooms: 3,
    bathrooms: 1,
    storeys: 2,
    roofType: ROOF_DUO_35,
    description: L(
      "Nowoczesny dom rodzinny z użytkowym poddaszem. Na parterze salon z jadalnią (ponad 30 m²) i duża kuchnia (blisko 18 m²) tworzą prawie 48 m² otwartej strefy dziennej. Na poddaszu są trzy niezależne pokoje, łazienka z osobnym WC, garderoba i pomieszczenie techniczne. Bryła inspirowana stodołą, balkon i duże przeszklenia.",
      "A modern family house with a usable attic. On the ground floor the living room with dining (over 30 m²) and a large kitchen (almost 18 m²) form nearly 48 m² of open living space. The attic has three separate rooms, a bathroom with a separate WC, a dressing room and a utility room. Barn-inspired shape, a balcony and large windows.",
      "Ein modernes Familienhaus mit ausgebautem Dachgeschoss. Im Erdgeschoss bilden das Wohnzimmer mit Essbereich (über 30 m²) und eine große Küche (knapp 18 m²) fast 48 m² offenen Wohnbereich. Im Dachgeschoss liegen drei getrennte Zimmer, ein Bad mit separatem WC, ein Ankleidezimmer und ein Technikraum. Scheunenartiger Baukörper, Balkon und große Fenster.",
      "Een modern gezinshuis met een bruikbare zolder. Op de begane grond vormen de woonkamer met eetruimte (meer dan 30 m²) en een grote keuken (bijna 18 m²) samen bijna 48 m² open leefruimte. Op zolder liggen drie aparte kamers, een badkamer met apart toilet, een kleedkamer en een technische ruimte. Een schuurachtig volume, een balkon en grote ramen.",
    ),
    coverPhoto: `${D}/vision-103/image0.jpg`,
    galleryPhotos: ["image1.jpg", "image2.jpg"].map((file) => `${D}/vision-103/${file}`),
    floorPlans: ["image4.jpg", "image3.jpg"].map((file) => `${D}/vision-103/${file}`),
    sourceUrl: "https://mkb-inwestycje.pl/vision-103/",
  },
  {
    id: id(5),
    name: "LEGACY 107",
    floorAreaM2: 107,
    category: "caloroczny",
    rooms: 4,
    bedrooms: null,
    bathrooms: 2,
    storeys: 2,
    roofType: ROOF_DUO_35,
    description: L(
      "Przestronny dom całoroczny o nowoczesnej, drewniano-grafitowej bryle. Otwarta strefa dzienna integruje salon, kuchnię i jadalnię z wyjściem na taras, a piętro zajmuje prywatna strefa z przestronnymi sypialniami, dwiema łazienkami i garderobą. Układ, przeszklenia, elewację i standard wykończenia można dopasować do inwestora.",
      "A spacious year-round house with a modern timber-and-graphite shape. An open living area combines lounge, kitchen and dining with access to the terrace, while the upper floor holds the private zone with spacious bedrooms, two bathrooms and a dressing room. The layout, glazing, facade and finishing standard can be adapted to the investor.",
      "Ein geräumiges Ganzjahreshaus mit moderner Holz-Graphit-Optik. Ein offener Wohnbereich verbindet Wohnzimmer, Küche und Essbereich mit dem Ausgang zur Terrasse, im Obergeschoss liegt der private Bereich mit großzügigen Schlafzimmern, zwei Bädern und einem Ankleidezimmer. Grundriss, Verglasung, Fassade und Ausbaustandard lassen sich an den Bauherrn anpassen.",
      "Een ruim huis voor het hele jaar met een modern hout-grafietvolume. Een open woonruimte verbindt woonkamer, keuken en eetkamer met toegang tot het terras, terwijl op de verdieping de privézone ligt met ruime slaapkamers, twee badkamers en een kleedkamer. Indeling, beglazing, gevel en afwerkingsniveau kunnen op de bouwheer worden afgestemd.",
    ),
    coverPhoto: `${D}/legacy-107/Legacy_107-2.jpg`,
    galleryPhotos: [
      "Legacy_107-3.jpg",
      "Legacy_107-4.jpg",
      "Legacy_107-6.jpg",
      "Legacy_107-8.jpg",
      "Legacy_107.jpg",
      "Legacy_107-7.jpg",
      "Legacy_107-5.jpg",
    ].map((file) => `${D}/legacy-107/${file}`),
    floorPlans: ["IMG_5635.jpg", "IMG_5636.jpg", "Caban-20-1.jpg"].map((file) => `${D}/legacy-107/${file}`),
    sourceUrl: "https://mkb-inwestycje.pl/legacy-107/",
  },
  {
    id: id(6),
    name: "IMPERIAL 150",
    floorAreaM2: 150,
    category: "caloroczny",
    rooms: 6,
    bedrooms: 3,
    bathrooms: 2,
    storeys: 2,
    roofType: ROOF_DUO_35,
    description: L(
      "Duży dom całoroczny dla inwestorów oczekujących przestrzeni i nowoczesnej architektury. Rozbudowana strefa dzienna z wysokim salonem otwartym na poddasze i otwartą kuchnią jest reprezentacyjnym centrum domu, a poddasze zajmują trzy sypialnie. Dwie łazienki, pomieszczenie techniczne, duże przeszklenia i możliwość wykonania przestronnego tarasu.",
      "A large year-round house for investors who expect space and modern architecture. An extensive living area with a high living room open to the attic and an open kitchen is the showpiece of the house, while the attic holds three bedrooms. Two bathrooms, a utility room, large windows and the option of a spacious terrace.",
      "Ein großes Ganzjahreshaus für Bauherren, die Platz und moderne Architektur erwarten. Ein weitläufiger Wohnbereich mit hohem, zum Dachgeschoss offenem Wohnzimmer und offener Küche ist das repräsentative Zentrum des Hauses, im Dachgeschoss liegen drei Schlafzimmer. Zwei Bäder, ein Technikraum, große Fenster und die Möglichkeit einer großzügigen Terrasse.",
      "Een groot huis voor het hele jaar voor bouwheren die ruimte en moderne architectuur verwachten. Een uitgebreide leefruimte met een hoge woonkamer die open is naar de zolder en een open keuken vormt het representatieve hart van het huis, terwijl op zolder drie slaapkamers liggen. Twee badkamers, een technische ruimte, grote ramen en de mogelijkheid van een ruim terras.",
    ),
    coverPhoto: `${D}/imperial-150/imperial_1.jpeg`,
    galleryPhotos: ["imperial_3.jpeg", "imperial_4.jpeg"].map((file) => `${D}/imperial-150/${file}`),
    floorPlans: ["Imperial_1.jpg", "Imperial_2.jpg", "Imperail-150a.jpg", "Imperial-150b.jpg", "Imperial-150c.jpg"].map(
      (file) => `${D}/imperial-150/${file}`,
    ),
    sourceUrl: "https://mkb-inwestycje.pl/imperial-150/",
  },
  {
    id: id(7),
    name: "MAJESTIC 175",
    floorAreaM2: 175,
    category: "caloroczny",
    rooms: 5,
    bedrooms: null,
    bathrooms: 2,
    storeys: 2,
    roofType: ROOF_DUO,
    description: L(
      "Reprezentacyjny dom rodzinny o wyrazistej architekturze inspirowanej nowoczesną stodołą. Część mieszkalna o powierzchni 128 m² powstała wokół przestronnej strefy dziennej z dużymi przeszkleniami i częściowo zadaszonym tarasem. Integralną częścią bryły jest dwustanowiskowy garaż (36 m²) z pomieszczeniem technicznym (11 m²), łącznie 175 m² powierzchni użytkowej.",
      "A showpiece family house with distinctive architecture inspired by the modern barn. The 128 m² living part is built around a spacious living area with large windows and a partly covered terrace. A double garage (36 m²) with a utility room (11 m²) is an integral part of the building, 175 m² of usable floor area in total.",
      "Ein repräsentatives Familienhaus mit markanter, von der modernen Scheune inspirierter Architektur. Der 128 m² große Wohnteil entstand rund um einen großzügigen Wohnbereich mit großen Fenstern und einer teilweise überdachten Terrasse. Eine Doppelgarage (36 m²) mit Technikraum (11 m²) ist fester Bestandteil des Baukörpers, insgesamt 175 m² Nutzfläche.",
      "Een representatief gezinshuis met een uitgesproken architectuur geïnspireerd op de moderne schuur. Het woongedeelte van 128 m² is gebouwd rond een ruime leefruimte met grote ramen en een gedeeltelijk overdekt terras. Een dubbele garage (36 m²) met technische ruimte (11 m²) maakt integraal deel uit van het volume, samen 175 m² bruikbare oppervlakte.",
    ),
    coverPhoto: `${D}/majestic-175/image0.jpeg`,
    galleryPhotos: ["image1.jpeg", "image2.jpeg", "image3.jpeg"].map((file) => `${D}/majestic-175/${file}`),
    floorPlans: ["image5.jpeg", "image4-1.jpg"].map((file) => `${D}/majestic-175/${file}`),
    sourceUrl: "https://mkb-inwestycje.pl/majestic-175/",
  },
];

// ---------------------------------------------------------------------------
// Układ pomieszczeń odczytany z rzutów (nazwy i metraże podane na rysunkach producenta).
// Pomijamy pomieszczenia bez czytelnego metrażu lub nazwy. IMPERIAL 150: rzut nie podaje metraży, więc pomieszczenia są bez areaM2.
// VISION 103: rzut poddasza nie podaje metraży (tylko parter). PULSE 52: metraż pokoju dziennego
// to nakładające się napisy na rysunku, odczytany jako 19,58 (suma zgadza się z ok. 52 m²).
// HARMONY 90: rzut bez nazw pomieszczeń, nazwy dopisane z wyposażenia na rysunku (łóżko, wanna, kuchnia).
// ---------------------------------------------------------------------------
export type FloorLevel = "parter" | "pietro" | "poddasze";

export interface RoomSource {
  name: L10n;
  // Brak = rzut producenta nie podaje metrażu (UI pokazuje wtedy "—").
  areaM2?: number;
  floorLevel: FloorLevel;
}

const N = {
  kitchen: L("Kuchnia", "Kitchen", "Küche", "Keuken"),
  livingRoom: L("Pokój dzienny", "Living room", "Wohnzimmer", "Woonkamer"),
  livingKitchen: L("Salon z aneksem", "Living room with kitchenette", "Wohnzimmer mit Küchenzeile", "Woonkamer met keukenhoek"),
  livingDining: L("Salon i jadalnia", "Living and dining room", "Wohn- und Esszimmer", "Woon- en eetkamer"),
  living: L("Salon", "Living room", "Wohnzimmer", "Woonkamer"),
  bathroom: L("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
  wc: L("Toaleta", "WC", "WC", "Toilet"),
  bedroom: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
  room: L("Pokój", "Room", "Zimmer", "Kamer"),
  hall: L("Hol", "Hall", "Flur", "Hal"),
  corridor: L("Komunikacja", "Circulation", "Verkehrsfläche", "Verkeersruimte"),
  porch: L("Wiatrołap", "Entrance lobby", "Windfang", "Portaal"),
  utility: L("Pomieszczenie techniczne", "Utility room", "Technikraum", "Technische ruimte"),
  household: L("Pomieszczenie gospodarcze", "Storage room", "Hauswirtschaftsraum", "Bijkeuken"),
  wardrobe: L("Garderoba", "Dressing room", "Ankleidezimmer", "Kleedkamer"),
  pantry: L("Spiżarka", "Pantry", "Speisekammer", "Voorraadkast"),
  boiler: L("Kotłownia", "Boiler room", "Heizraum", "Ketelruimte"),
  garage: L("Garaż", "Garage", "Garage", "Garage"),
  laundry: L("Pralnia", "Laundry room", "Waschraum", "Wasruimte"),
  mezzanine: L("Antresola", "Mezzanine", "Galerie", "Mezzanine"),
};

const r = (name: L10n, areaM2: number | undefined, floorLevel: FloorLevel = "parter"): RoomSource => ({ name, areaM2, floorLevel });

export const MKB_ROOMS: Record<string, RoomSource[]> = {
  "PULSE 52": [
    r(N.kitchen, 7.74),
    r(N.livingRoom, 19.58),
    r(N.bathroom, 2.95),
    r(N.bedroom, 10.98, "pietro"),
    r(N.mezzanine, 11.77, "pietro"),
  ],
  "NEST 53": [
    r(N.bedroom, 9.18),
    r(N.bedroom, 7.94),
    r(N.bathroom, 4.26),
    r(N.hall, 6.68),
    r(N.utility, 2.56),
    r(N.livingKitchen, 22.48),
  ],
  "HARMONY 90": [
    r(N.bedroom, 13.7),
    r(N.room, 9.12),
    r(N.kitchen, 8.67),
    r(N.living, 28.26),
    r(N.bathroom, 5.59),
    r(N.wc, 1.37),
    r(N.corridor, 5.75),
    r(N.porch, 4.19),
    r(N.utility, 4.87),
    r(N.wardrobe, 3.74),
  ],
  "VISION 103": [
    r(N.livingDining, 30.04),
    r(N.kitchen, 17.85),
    r(N.corridor, 7.96),
    r(N.porch, 4.14),
    r(N.utility, 3.23),
    r(N.wc, 2.09),
  ],
  "LEGACY 107": [
    r(N.kitchen, 8.12),
    r(N.livingRoom, 15.55),
    r(N.room, 10.61),
    r(N.bathroom, 6.47),
    r(N.porch, 3.5),
    r(N.household, 3.65),
    r(N.corridor, 8.96),
    r(N.bedroom, 13.01, "pietro"),
    r(N.room, 18.95, "pietro"),
    r(N.wardrobe, 4.29, "pietro"),
    r(N.bathroom, 3.24, "pietro"),
    r(N.hall, 2.9, "pietro"),
  ],
  "IMPERIAL 150": [
    r(N.livingRoom, undefined),
    r(N.kitchen, undefined),
    r(N.porch, undefined),
    r(N.utility, undefined),
    r(N.room, undefined),
    r(N.room, undefined),
    r(N.bathroom, undefined),
    r(N.corridor, undefined),
    r(N.bedroom, undefined, "poddasze"),
    r(N.bedroom, undefined, "poddasze"),
    r(N.wc, undefined, "poddasze"),
    r(N.corridor, undefined, "poddasze"),
  ],
  "MAJESTIC 175": [
    r(N.living, 28.24),
    r(N.room, 10.5),
    r(N.pantry, 3.53),
    r(N.boiler, 3.83),
    r(N.bathroom, 2.9),
    r(N.wardrobe, 3.2),
    r(N.corridor, 6.87),
    r(N.garage, 36),
    r(N.room, 13.19, "poddasze"),
    r(N.room, 11.72, "poddasze"),
    r(N.room, 10.39, "poddasze"),
    r(N.wardrobe, 4.65, "poddasze"),
    r(N.bathroom, 6.88, "poddasze"),
    r(N.laundry, 3.7, "poddasze"),
    r(N.corridor, 7.02, "poddasze"),
  ],
};
