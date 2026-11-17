// Cocomodule (cocomodule.com, Coco Design Sp. z o.o.): pełna oferta zaktualizowana 2026-11-16.
// Źródła: strona producenta (modele, wymiary, konfigurator saun COCO z cenami brutto PLN) oraz katalog
// "_docs/COCOHOUSE - COCO_ENG_(20.04.26_.pdf" (ceny netto EUR domów COCOHOUSE, rozstrzyga przy rozbieżnościach).
// Decyzje użytkownika (2026-11-16): import wszystkich linii naraz (domy, sauny, kawiarnie, POP-UP; bez basenów,
// COCOFLOAT, pergoli i COCOFIT), pięć starych pilotażowych domów aktualizowanych w miejscu (te same id i slugi),
// zdjęcia tylko bez watermarku "COCOMODULE" (prawa do zdjęć potwierdzone). Modele bez ani jednego czystego zdjęcia
// trafiają jako szkic (status draft) z danymi i rzutami, do publikacji po otrzymaniu czystych plików.
// Zdjęcia: tmp/cocomodule-raw/_cand/<grupa>/NN__plik (pobrane z biblioteki mediów WordPress producenta),
// odwołanie "grupa:NN"; "thumbs:Nazwa" to miniatury 800x700 z tmp/cocomodule-raw/_cand/thumbs/.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const PRODUCER_ID = "251bc664-bb50-4543-b893-c9a28a926bca";
// Konto przypisane do producenta od pierwszego zasiewu (właściciel dokumentów).
export const OWNER_USER_ID = "73d11d36-1b8b-4c39-803a-8cbb1943aed0";

export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`cocomodule:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const groupId = (key: string) => detUuid(`group:${key}`);
export const optionId = (group: string, key: string) => detUuid(`option:${group}:${key}`);
export const variantIdOf = (product: string, code: string) => detUuid(`variant:${product}:${code}`);

// NBP, tabela 219/A/NBP/2026 z 2026-11-10: 1 EUR = 4,3895 PLN (ten sam kurs co import Life Polska).
export const EUR_PLN_RATE = 4.3895;
export const VAT = 1.23;
export const eurCentsFromNettoPln = (nettoPln: number): number => Math.round(nettoPln / EUR_PLN_RATE) * 100;
export const eurCentsFromBruttoPln = (bruttoPln: number): number => eurCentsFromNettoPln(bruttoPln / VAT);

// Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
export const PRODUCER_DESCRIPTION = L(
  "Polski producent architektury modułowej premium (marka COCOMODULE, Coco Design Sp. z o.o.), projektujący i budujący od 2017 roku. W ofercie są całoroczne domy modułowe COCOHOUSE (linie COCO, LOFT i CUBE), moduły hotelowe, sauny ogrodowe COCOSPA, modułowe kawiarnie i restauracje COCOCAFE oraz pawilony POP-UP. Konstrukcje powstają w technologii CLT (drewno klejone krzyżowo) lub CWP (laminat i XPS), z charakterystyczną zaokrągloną bryłą i dużymi przeszkleniami. Własne biuro projektowe przygotowuje też projekty na zamówienie.",
  "Polish producer of premium modular architecture (COCOMODULE brand, Coco Design Sp. z o.o.), designing and building since 2017. The range covers COCOHOUSE year-round modular homes (COCO, LOFT and CUBE lines), hotel modules, COCOSPA garden saunas, COCOCAFE modular cafés and restaurants, and POP-UP pavilions. Structures are built in CLT (cross-laminated timber) or CWP (laminate and XPS) technology, with a distinctive rounded shape and large glazing. An in-house design office also prepares custom projects.",
  "Polnischer Hersteller von Premium-Modularchitektur (Marke COCOMODULE, Coco Design Sp. z o.o.), der seit 2017 plant und baut. Das Angebot umfasst ganzjährig bewohnbare Modulhäuser COCOHOUSE (Linien COCO, LOFT und CUBE), Hotelmodule, Gartensaunen COCOSPA, modulare Cafés und Restaurants COCOCAFE sowie POP-UP-Pavillons. Die Konstruktionen entstehen in CLT-Technologie (Brettsperrholz) oder CWP (Laminat und XPS), mit charakteristisch abgerundetem Baukörper und großen Verglasungen. Ein eigenes Planungsbüro erstellt auch Projekte nach Maß.",
  "Poolse producent van premium modulaire architectuur (merk COCOMODULE, Coco Design Sp. z o.o.), die sinds 2017 ontwerpt en bouwt. Het aanbod omvat jaarrond bewoonbare modulaire woningen COCOHOUSE (lijnen COCO, LOFT en CUBE), hotelmodules, tuinsauna's COCOSPA, modulaire cafés en restaurants COCOCAFE en POP-UP-paviljoens. De constructies worden gebouwd in CLT (kruislaaghout) of CWP (laminaat en XPS), met een kenmerkende afgeronde vorm en grote beglazing. Een eigen ontwerpbureau maakt ook projecten op maat.",
);

export const ELIGIBILITY_REASON = L(
  "Producent krajowy, dostawa gotowego produktu",
  "Domestic producer, delivery of a finished product",
  "Inländischer Hersteller, Lieferung eines fertigen Produkts",
  "Binnenlandse producent, levering van een kant-en-klaar product",
);

export type PhotoRef = string;

export interface PhotoSpec {
  ref: PhotoRef;
  // "slide": slajd prezentacji LOFT (biała ramka z podpisami), wycinany jest sam obraz.
  crop?: "slide";
}
const P = (...refs: string[]): PhotoSpec[] => refs.map((ref) => ({ ref }));
const SLIDES = (...refs: string[]): PhotoSpec[] => refs.map((ref) => ({ ref, crop: "slide" as const }));

// ---------------------------------------------------------------- Domy

const CLT_CONSTRUCTION = L(
  "Prefabrykowane moduły CLT (drewno klejone krzyżowo), łączone na miejscu",
  "Prefabricated CLT (cross-laminated timber) modules, joined on site",
  "Vorgefertigte CLT-Module (Brettsperrholz), vor Ort verbunden",
  "Geprefabriceerde CLT-modules (kruislaaghout), ter plaatse verbonden",
);
const COCO_ROOF = L(
  "Płaski, zintegrowany z zaokrągloną bryłą modułu",
  "Flat, integrated into the rounded module shape",
  "Flach, in den abgerundeten Modulkörper integriert",
  "Plat, geïntegreerd in de afgeronde modulevorm",
);
const COCO_FOUNDATION = L(
  "Punktowe podpory lub płyta fundamentowa po analizie gruntu, przygotowane przez klienta",
  "Point supports or a foundation slab after a soil survey, prepared by the customer",
  "Punktstützen oder Bodenplatte nach Baugrunduntersuchung, vom Kunden vorbereitet",
  "Puntsteunen of een funderingsplaat na grondonderzoek, voorbereid door de klant",
);
const COCO_CUSTOM = L(
  "Układ wnętrza, wykończenie, kolor elewacji i liczba jednostek klimatyzacji; linia COCO (zaokrąglona) lub CUBE (geometryczna)",
  "Interior layout, finish, facade colour and number of air conditioning units; COCO line (rounded) or CUBE line (geometric)",
  "Grundriss, Ausbau, Fassadenfarbe und Anzahl der Klimageräte; Linie COCO (abgerundet) oder CUBE (geometrisch)",
  "Indeling, afwerking, gevelkleur en aantal airco-units; COCO-lijn (afgerond) of CUBE-lijn (geometrisch)",
);
const LOFT_CONSTRUCTION = L(
  "Prefabrykowane moduły z dachem dwuspadowym, wykończone w zakładzie i łączone na miejscu",
  "Prefabricated modules with a gable roof, finished in the factory and joined on site",
  "Vorgefertigte Module mit Satteldach, im Werk ausgebaut und vor Ort verbunden",
  "Geprefabriceerde modules met zadeldak, in de fabriek afgewerkt en ter plaatse verbonden",
);
const LOFT_ROOF = L(
  "Dwuspadowy, pokryty blachą na rąbek",
  "Gable roof with standing seam metal cladding",
  "Satteldach mit Stehfalzdeckung",
  "Zadeldak met felsnaadbekleding",
);
const LOFT_FOUNDATION = L(
  "Fundament punktowy lub płyta fundamentowa po analizie gruntu, przygotowane przez klienta",
  "Point foundations or a foundation slab after a soil survey, prepared by the customer",
  "Punktfundamente oder Bodenplatte nach Baugrunduntersuchung, vom Kunden vorbereitet",
  "Puntfunderingen of een funderingsplaat na grondonderzoek, voorbereid door de klant",
);
const LOFT_CUSTOM = L(
  "Układ wnętrza, elewacja (blacha, drewno, płyty kompozytowe) i wykończenie dopasowywane do inwestora",
  "Interior layout, facade (metal, wood, composite panels) and finish tailored to the client",
  "Grundriss, Fassade (Blech, Holz, Verbundplatten) und Ausbau nach Wunsch des Bauherrn",
  "Indeling, gevel (metaal, hout, composietpanelen) en afwerking afgestemd op de opdrachtgever",
);

export const COCO_TECH_SPECS = {
  heatTransferCoefficients: "nieznana",
  ventilation: "rekuperacja",
  heatSource: "inne",
  heatSourceOther: "Klimatyzatory (pompa ciepła powietrze-powietrze), liczba jednostek zależna od modelu",
  constructionTechnology: "inne",
  constructionTechnologyOther: "CLT (drewno klejone krzyżowo)",
  wallBuildUp: "Panele CLT z izolacją w warstwie ściany, elewacja z laminatu odpornego na wilgoć, przeszklenia panoramiczne",
} as const;
export const LOFT_TECH_SPECS = {
  heatTransferCoefficients: "nieznana",
  ventilation: "inna",
  ventilationOther: "Do potwierdzenia z producentem",
  heatSource: "inne",
  heatSourceOther: "Do potwierdzenia z producentem",
  constructionTechnology: "inne",
  constructionTechnologyOther: "Moduły prefabrykowane linii LOFT (szczegóły technologii do potwierdzenia z producentem)",
} as const;

export interface HouseVariantPrice {
  // Katalog PDF: "Developer standard (shell & core)" i "Net price (excl. VAT)", EUR netto.
  developerEur: number;
  netEur: number;
}

export interface CocoHouse {
  key: string;
  // Stary wiersz z pilotażowego zasiewu (2026-09-03), aktualizowany w miejscu; slug zostaje.
  existingId?: string;
  name: string;
  status: "published" | "draft";
  category: "caloroczny" | "rekreacyjny-caloroczny" | "wynajem-hotel";
  line: "coco" | "loft";
  floorAreaM2: number;
  builtUpAreaM2: number;
  externalDimensions: string;
  storeys: number;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  description: L10n;
  // Tylko dla nowych modeli z ceną z katalogu PDF; stare wiersze zachowują swoje warianty i ceny.
  price?: HouseVariantPrice;
  leadTimeWeeks?: [number, number];
  assemblyDays?: [number, number];
  photos: PhotoSpec[];
  floorPlans: PhotoSpec[];
}

export const HOUSES: CocoHouse[] = [
  {
    key: "ch-32",
    existingId: "0a9d6f27-6aa9-4f53-9b84-a5fe70aef205",
    name: "COCOHOUSE CH-32",
    status: "published",
    category: "rekreacyjny-caloroczny",
    line: "coco",
    floorAreaM2: 31.1,
    builtUpAreaM2: 36,
    externalDimensions: "12,0 × 3,0 × 3,0 m",
    storeys: 1,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: L(
      "Kompaktowy, jednomodułowy dom całoroczny z linii COCO, z około 12 metrami bieżącymi przeszkleń wzdłuż frontu. Na jednym poziomie mieści salon z aneksem kuchennym, sypialnię z garderobą i łazienkę z prysznicem. Sprawdza się jako dom wakacyjny, mieszkanie całoroczne lub moduł inwestycyjny pod wynajem; dostępne są dwa układy funkcjonalne.",
      "Compact single-module year-round home from the COCO line, with about 12 running metres of glazing along the front. On one level it holds a living room with kitchenette, a bedroom with wardrobe and a bathroom with shower. It works as a holiday home, a year-round residence or a rental investment module; two functional layouts are available.",
      "Kompaktes, ganzjährig bewohnbares Einmodulhaus der Linie COCO mit rund 12 laufenden Metern Verglasung entlang der Front. Auf einer Ebene bietet es Wohnzimmer mit Küchenzeile, Schlafzimmer mit Ankleide und Bad mit Dusche. Geeignet als Ferienhaus, Hauptwohnsitz oder Investitionsmodul zur Vermietung; zwei Grundrissvarianten sind verfügbar.",
      "Compacte, jaarrond bewoonbare woning van één module uit de COCO-lijn, met ongeveer 12 strekkende meter beglazing langs de voorgevel. Op één niveau bevat ze een woonkamer met kitchenette, een slaapkamer met kledingkast en een badkamer met douche. Geschikt als vakantiewoning, vaste woning of verhuurinvestering; er zijn twee indelingen beschikbaar.",
    ),
    photos: P("ch-32:01", "ch-32:03", "ch-32:02"),
    floorPlans: P("ch-32:05", "ch-32:08", "ch-32:07", "ch-32:04", "ch-32:06"),
  },
  {
    key: "ch-64-2",
    name: "COCOHOUSE CH-64-2",
    status: "draft",
    category: "caloroczny",
    line: "coco",
    floorAreaM2: 64.4,
    builtUpAreaM2: 72,
    externalDimensions: "12,0 × 6,0 × 3,0 m",
    storeys: 1,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    description: L(
      "Dwumodułowy dom całoroczny z linii COCO z dużą strefą dzienną: salon z wyspą kuchenną i jadalnią oraz dwie sypialnie po jednej stronie bryły. Panoramiczne przeszklenia otwierają wnętrze na taras. Model pomyślany zarówno jako dom stały, jak i apartament w inwestycjach hotelowych i resortowych.",
      "Two-module year-round home from the COCO line with a large day zone: a living room with kitchen island and dining area, plus two bedrooms on one side of the building. Panoramic glazing opens the interior onto the terrace. Designed both as a permanent home and as an apartment in hotel and resort developments.",
      "Ganzjährig bewohnbares Zweimodulhaus der Linie COCO mit großem Wohnbereich: Wohnzimmer mit Kochinsel und Essbereich sowie zwei Schlafzimmer auf einer Seite des Baukörpers. Panoramaverglasungen öffnen den Innenraum zur Terrasse. Gedacht als dauerhaftes Wohnhaus wie auch als Apartment in Hotel- und Resortprojekten.",
      "Jaarrond bewoonbare woning van twee modules uit de COCO-lijn met een grote leefzone: een woonkamer met kookeiland en eethoek, plus twee slaapkamers aan één kant van het gebouw. Panoramische beglazing opent het interieur naar het terras. Bedoeld als vaste woning en als appartement in hotel- en resortprojecten.",
    ),
    price: { developerEur: 88474.86, netEur: 102224.16 },
    leadTimeWeeks: [14, 18],
    assemblyDays: [2, 4],
    photos: [],
    // Rzuty CH-64 na stronie producenta mają watermark, czekają na czyste pliki.
    floorPlans: [],
  },
  {
    key: "ch-64-3",
    existingId: "b715624f-88b6-4a75-82a2-ee842582afd0",
    name: "COCOHOUSE CH-64-3",
    status: "draft",
    category: "caloroczny",
    line: "coco",
    floorAreaM2: 64.4,
    builtUpAreaM2: 72,
    externalDimensions: "12,0 × 6,0 × 3,0 m",
    storeys: 1,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 1,
    description: L(
      "Dwumodułowy dom całoroczny z linii COCO z trzema sypialniami: jedną przy wejściu i dwiema po przeciwnej stronie bryły, z otwartą strefą dzienną z kuchnią i jadalnią pośrodku. Układ dobrze sprawdza się w rodzinnym domu oraz w apartamentach pod wynajem w resortach.",
      "Two-module year-round home from the COCO line with three bedrooms: one by the entrance and two on the opposite side, with an open day zone with kitchen and dining area in the middle. The layout suits a family home as well as rental apartments in resorts.",
      "Ganzjährig bewohnbares Zweimodulhaus der Linie COCO mit drei Schlafzimmern: eines am Eingang und zwei auf der gegenüberliegenden Seite, dazwischen ein offener Wohnbereich mit Küche und Essplatz. Der Grundriss eignet sich für ein Familienhaus ebenso wie für Ferienapartments in Resorts.",
      "Jaarrond bewoonbare woning van twee modules uit de COCO-lijn met drie slaapkamers: één bij de ingang en twee aan de andere kant, met in het midden een open leefzone met keuken en eethoek. De indeling past bij een gezinswoning en bij verhuurappartementen in resorts.",
    ),
    photos: [],
    floorPlans: [],
  },
  {
    key: "ch-80",
    existingId: "2b76ab5f-9404-48fc-8000-72885c413e9d",
    name: "COCOHOUSE CH-80",
    status: "draft",
    category: "caloroczny",
    line: "coco",
    floorAreaM2: 79.2,
    builtUpAreaM2: 89.1,
    externalDimensions: "9,9 × 9,0 × 3,0 m",
    storeys: 1,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: L(
      "Trzymodułowy dom całoroczny z linii COCO na niemal kwadratowym rzucie, z rozbudowaną strefą dzienną (salon, jadalnia, kuchnia z wyspą) oraz sypialnią z łazienką z wolnostojącą wanną. Przeszklenia na całej długości frontu i szybki montaż modułów.",
      "Three-module year-round home from the COCO line on an almost square plan, with a generous day zone (living room, dining area, kitchen with island) and a bedroom with a bathroom featuring a freestanding bathtub. Full-length front glazing and fast module assembly.",
      "Ganzjährig bewohnbares Dreimodulhaus der Linie COCO auf nahezu quadratischem Grundriss, mit großzügigem Wohnbereich (Wohnzimmer, Essplatz, Küche mit Insel) und Schlafzimmer mit Bad samt freistehender Badewanne. Verglasung über die gesamte Front und schnelle Montage der Module.",
      "Jaarrond bewoonbare woning van drie modules uit de COCO-lijn op een bijna vierkante plattegrond, met een ruime leefzone (woonkamer, eethoek, keuken met eiland) en een slaapkamer met badkamer met vrijstaand bad. Beglazing over de volle voorgevel en snelle montage van de modules.",
    ),
    photos: [],
    floorPlans: P("ch-80:01"),
  },
  {
    key: "ch-120",
    existingId: "cb3e9b51-5262-419a-bffb-4b2932a8b2e6",
    name: "COCOHOUSE CH-120",
    status: "published",
    category: "caloroczny",
    line: "coco",
    floorAreaM2: 128.8,
    builtUpAreaM2: 144,
    externalDimensions: "12,0 × 6,0 × 3,0 m na kondygnację",
    storeys: 2,
    rooms: 6,
    bedrooms: 2,
    bathrooms: 3,
    description: L(
      "Flagowy, dwukondygnacyjny dom z linii COCO: górna bryła wysunięta wspornikowo nad taras i basen, oparta na skrzyżowanych stalowych podporach. Parter mieści salon z kuchnią i jadalnią, hol z pomieszczeniem technicznym i łazienkę, a piętro dwie sypialnie z łazienkami, garderobę i gabinet (dwa warianty układu piętra).",
      "Flagship two-storey home from the COCO line: the upper volume cantilevers over the terrace and pool on crossed steel supports. The ground floor holds a living room with kitchen and dining area, a hall with technical room and a bathroom; the upper floor has two bedrooms with bathrooms, a walk-in wardrobe and a study (two upper floor layouts).",
      "Zweigeschossiges Flaggschiff der Linie COCO: Der obere Baukörper kragt auf gekreuzten Stahlstützen über Terrasse und Pool aus. Im Erdgeschoss liegen Wohnzimmer mit Küche und Essplatz, Flur mit Technikraum und ein Bad, im Obergeschoss zwei Schlafzimmer mit Bädern, Ankleide und Arbeitszimmer (zwei Grundrissvarianten für das Obergeschoss).",
      "Vlaggenschip met twee verdiepingen uit de COCO-lijn: het bovenste volume kraagt op gekruiste stalen steunen uit boven het terras en het zwembad. Op de begane grond liggen een woonkamer met keuken en eethoek, een hal met technische ruimte en een badkamer; boven twee slaapkamers met badkamers, een inloopkast en een werkkamer (twee indelingen voor de verdieping).",
    ),
    photos: P("ch-120:17", "ch-120:06", "ch-120:07", "ch-120:16", "ch-120:04", "ch-120:09", "ch-120:10", "ch-120:12", "ch-120:14", "ch-120:15"),
    floorPlans: P("ch-120:03", "ch-120:01", "ch-120:02"),
  },
  {
    key: "cocoboat-406",
    existingId: "aa5a578f-4a0b-415c-bc63-6eb2b28dfc8b",
    name: "COCOBOAT 406",
    status: "published",
    category: "wynajem-hotel",
    line: "coco",
    floorAreaM2: 19.4,
    builtUpAreaM2: 24,
    externalDimensions: "6,0 × 4,0 × 3,0 m",
    storeys: 1,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: L(
      "Moduł apartamentu hotelowego do ustawiania w szeregu nad wodą, na platformie pływającej (betonowej lub stalowej) albo na podporach lądowych. Panoramiczne przeszklenie na całej szerokości, sypialnia, strefa dzienna z aneksem i łazienka w jednej bryle, a przed wejściem drewniany pomost-taras. Model pomyślany pod resorty i hotele na wodzie.",
      "Hotel apartment module designed to be placed in a row over water, on a floating platform (concrete or steel) or on land supports. Full-width panoramic glazing, a bedroom, a day zone with kitchenette and a bathroom in one volume, with a wooden deck terrace in front of the entrance. Designed for resorts and floating hotels.",
      "Hotelapartment-Modul zur Aufstellung in Reihe am Wasser, auf einer schwimmenden Plattform (Beton oder Stahl) oder auf Landstützen. Panoramaverglasung über die ganze Breite, Schlafbereich, Wohnbereich mit Küchenzeile und Bad in einem Baukörper, vor dem Eingang eine Holzsteg-Terrasse. Gedacht für Resorts und schwimmende Hotels.",
      "Hotelappartementmodule om in een rij aan het water te plaatsen, op een drijvend platform (beton of staal) of op steunen op het land. Panoramische beglazing over de volle breedte, een slaapgedeelte, een leefzone met kitchenette en een badkamer in één volume, met een houten steigerterras voor de ingang. Bedoeld voor resorts en drijvende hotels.",
    ),
    photos: P("float:01", "float:02"),
    floorPlans: [],
  },
  {
    key: "lh-35-dv",
    name: "LOFT LH-35-DV",
    status: "published",
    category: "caloroczny",
    line: "loft",
    floorAreaM2: 27,
    builtUpAreaM2: 35,
    externalDimensions: "9,6 × 3,6 × 3,9 m",
    storeys: 1,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: L(
      "Jednomodułowy dom całoroczny z linii LOFT z dachem dwuspadowym i antresolą. Wysokie wnętrze z przeszklonym szczytem łączy salon z aneksem kuchennym otwierany na taras, sypialnię i łazienkę z prysznicem. Dobry wybór na domek rekreacyjny lub kameralny dom pod wynajem.",
      "Single-module year-round home from the LOFT line with a gable roof and a mezzanine. The tall interior with a glazed gable combines a living room with kitchenette opening onto the terrace, a bedroom and a bathroom with shower. A good choice for a leisure cabin or a small rental home.",
      "Ganzjährig bewohnbares Einmodulhaus der Linie LOFT mit Satteldach und Galerie. Der hohe Innenraum mit verglastem Giebel verbindet ein Wohnzimmer mit Küchenzeile und Zugang zur Terrasse, ein Schlafzimmer und ein Bad mit Dusche. Eine gute Wahl als Freizeithaus oder kleines Mietobjekt.",
      "Jaarrond bewoonbare woning van één module uit de LOFT-lijn met zadeldak en vide. Het hoge interieur met beglaasde topgevel combineert een woonkamer met kitchenette en toegang tot het terras, een slaapkamer en een badkamer met douche. Een goede keuze als recreatiewoning of kleine huurwoning.",
    ),
    photos: P("lh-35-dv:03", "lh-35-dv:09", "lh-35-dv:10", "lh-35-dv:08", "lh-35-dv:05", "lh-35-dv:06", "lh-35-dv:07", "lh-35-dv:04"),
    floorPlans: [...SLIDES("lh-35-dv:11"), ...P("lh-35-dv:02", "lh-35-dv:01"), ...SLIDES("lh-35-dv:12")],
  },
  {
    key: "lh-75-av",
    name: "LOFT LH-75-AV",
    status: "published",
    category: "caloroczny",
    line: "loft",
    floorAreaM2: 52,
    builtUpAreaM2: 74.5,
    externalDimensions: "10,36 × 3,66 × 6,20 m",
    storeys: 2,
    rooms: null,
    bedrooms: 2,
    bathrooms: null,
    description: L(
      "Dwukondygnacyjny dom z linii LOFT złożony z dwóch modułów ustawionych jeden na drugim, z wysokim dachem dwuspadowym i przeszklonymi szczytami. Parter mieści strefę dzienną z kuchnią, a piętro dwie sypialnie. Elewacja łączy blachę na rąbek z jasnymi płytami drewnopodobnymi; moduły są wykańczane w zakładzie.",
      "Two-storey home from the LOFT line made of two stacked modules, with a tall gable roof and glazed gables. The ground floor holds the day zone with kitchen, the upper floor two bedrooms. The facade combines standing seam metal with light wood-look panels; the modules are finished in the factory.",
      "Zweigeschossiges Haus der Linie LOFT aus zwei übereinander gestellten Modulen, mit hohem Satteldach und verglasten Giebeln. Im Erdgeschoss liegt der Wohnbereich mit Küche, im Obergeschoss zwei Schlafzimmer. Die Fassade verbindet Stehfalzblech mit hellen Platten in Holzoptik; die Module werden im Werk ausgebaut.",
      "Woning met twee verdiepingen uit de LOFT-lijn, opgebouwd uit twee gestapelde modules, met een hoog zadeldak en beglaasde topgevels. Beneden ligt de leefzone met keuken, boven twee slaapkamers. De gevel combineert felsnaadmetaal met lichte panelen in houtlook; de modules worden in de fabriek afgewerkt.",
    ),
    photos: SLIDES("loft:05", "loft:06", "loft:08", "loft:07"),
    floorPlans: SLIDES("loft:13", "loft:12"),
  },
  {
    key: "lh-79-cw",
    name: "LOFT LH-79-CW",
    status: "published",
    category: "caloroczny",
    line: "loft",
    floorAreaM2: 62.7,
    builtUpAreaM2: 78.6,
    externalDimensions: "11,96 × 8,18 × 4,04 m",
    storeys: 1,
    rooms: null,
    bedrooms: 2,
    bathrooms: null,
    description: L(
      "Parterowy dom z linii LOFT z dwóch modułów o dachach dwuspadowych, ustawionych równolegle z przesunięciem. Jedna bryła mieści dwie sypialnie, druga strefę dzienną z kuchnią i jadalnią otwartą na zadaszony taras. Ciemna elewacja z blachy łączona z drewnem.",
      "Single-storey home from the LOFT line made of two gable-roofed modules placed side by side with an offset. One volume holds two bedrooms, the other the day zone with kitchen and dining area opening onto a covered terrace. Dark metal facade combined with wood.",
      "Eingeschossiges Haus der Linie LOFT aus zwei Modulen mit Satteldach, versetzt nebeneinander gestellt. Ein Baukörper enthält zwei Schlafzimmer, der andere den Wohnbereich mit Küche und Essplatz, offen zur überdachten Terrasse. Dunkle Blechfassade kombiniert mit Holz.",
      "Gelijkvloerse woning uit de LOFT-lijn van twee modules met zadeldak, verspringend naast elkaar geplaatst. Het ene volume bevat twee slaapkamers, het andere de leefzone met keuken en eethoek die uitkomt op een overdekt terras. Donkere metalen gevel gecombineerd met hout.",
    ),
    photos: SLIDES("loft:01", "loft:02", "loft:03", "loft:04"),
    floorPlans: SLIDES("loft:11"),
  },
  ...loftDraft("lh-28", "LOFT LH-28", 20, 28, "6,98 × 3,98 × 3,93 m", "loft:24"),
  ...loftDraft("lh-35-bv", "LOFT LH-35-BV", 27, 35, "9,6 × 3,9 × 3,7 m", "loft:23", "loft:22"),
  ...loftDraft("lh-46-bv", "LOFT LH-46-BV", 35, 45.5, "12,27 × 3,71 × 3,72 m", "loft:21", "loft:20"),
  ...loftDraft("lh-50-bt", "LOFT LH-50-BT", 40, 50, "12,27 × 4,04 × 3,14 m", "loft:18", "loft:19"),
  ...loftDraft("lh-65-av", "LOFT LH-65-AV", 63.6, 65, "15,70 × 4,13 × 4,16 m", "loft:17", "loft:16"),
  ...loftDraft("lh-95-bm", "LOFT LH-95-BM", 76.87, 94.46, "14,43 × 7,96 × 4,16 m", "loft:10"),
  ...loftDraft("lh-115-bm", "LOFT LH-115-BM", 91.88, 114.86, "14,43 × 7,96 × 4,16 m", "loft:09"),
];

// Modele LOFT z samymi rzutami (bez wizualizacji na stronie producenta): szkice do czasu otrzymania zdjęć.
function loftDraft(key: string, name: string, floor: number, built: number, dims: string, ...plans: string[]): CocoHouse[] {
  const m2 = String(floor).replace(".", ",");
  return [
    {
      key,
      name,
      status: "draft",
      category: "caloroczny",
      line: "loft",
      floorAreaM2: floor,
      builtUpAreaM2: built,
      externalDimensions: dims,
      storeys: 1,
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      description: L(
        `Dom całoroczny z linii LOFT z dachem dwuspadowym, o powierzchni użytkowej ${m2} m². Prefabrykowane moduły są wykańczane w zakładzie, a układ wnętrza i elewację można dopasować do inwestora.`,
        `Year-round home from the LOFT line with a gable roof and ${floor} m² of usable floor area. The prefabricated modules are finished in the factory, and the interior layout and facade can be tailored to the client.`,
        `Ganzjährig bewohnbares Haus der Linie LOFT mit Satteldach und ${m2} m² Nutzfläche. Die vorgefertigten Module werden im Werk ausgebaut; Grundriss und Fassade lassen sich an den Bauherrn anpassen.`,
        `Jaarrond bewoonbare woning uit de LOFT-lijn met zadeldak en ${m2} m² gebruiksoppervlak. De geprefabriceerde modules worden in de fabriek afgewerkt; indeling en gevel zijn af te stemmen op de opdrachtgever.`,
      ),
      photos: [],
      floorPlans: SLIDES(...plans),
    },
  ];
}

export const houseTexts = (house: CocoHouse) =>
  house.line === "coco"
    ? { construction: CLT_CONSTRUCTION, roof: COCO_ROOF, foundation: COCO_FOUNDATION, custom: COCO_CUSTOM, specs: COCO_TECH_SPECS }
    : { construction: LOFT_CONSTRUCTION, roof: LOFT_ROOF, foundation: LOFT_FOUNDATION, custom: LOFT_CUSTOM, specs: LOFT_TECH_SPECS };

// Wiersze wariantów domów (jak stare zasiane produkty): cena platformy = cena katalogowa EUR netto × 1,10,
// zaokrąglona do 100 EUR (ta sama konwencja co pięć pilotażowych wierszy z 2026-09-03).
export const platformCents = (eur: number): number => Math.round((eur * 1.1) / 100) * 100 * 100;

// ---------------------------------------------------------------- Sauny

export const SAUNA_FOUNDATION = L(
  "Równe, utwardzone podłoże o nośności min. 250 kg/m², przygotowane przez klienta",
  "Level, hardened base with a load capacity of at least 250 kg/m², prepared by the customer",
  "Ebener, befestigter Untergrund mit mindestens 250 kg/m² Tragfähigkeit, vom Kunden vorbereitet",
  "Vlakke, verharde ondergrond met een draagvermogen van minimaal 250 kg/m², voorbereid door de klant",
);

export interface SaunaSpecsText {
  claddingMaterial: L10n;
  interiorWoodType: L10n;
  benchMaterial: L10n;
  insulationType: L10n;
  glazingType: L10n;
  electricalRequirement: L10n;
  changingAreaDescription?: L10n;
}

const COCO_SAUNA_SPECS: Omit<SaunaSpecsText, "changingAreaDescription"> = {
  claddingMaterial: L(
    "Laminat GFK (kompozyt), biały żelkot, bez konserwacji",
    "GFK laminate (composite), white gelcoat, maintenance-free",
    "GFK-Laminat (Verbundwerkstoff), weißes Gelcoat, wartungsfrei",
    "GFK-laminaat (composiet), witte gelcoat, onderhoudsvrij",
  ),
  interiorWoodType: L(
    "Ryflowane lamele z termo osiki na ścianach i suficie, gięte po promieniu",
    "Ribbed thermo aspen slats on walls and ceiling, bent to a radius",
    "Geriffelte Thermo-Espe-Lamellen an Wänden und Decke, im Radius gebogen",
    "Geribbelde thermo-espen lamellen op wanden en plafond, in een radius gebogen",
  ),
  benchMaterial: L(
    "Drewno abachi (opcjonalnie thermo abachi), ławki z podświetleniem LED",
    "Abachi wood (thermo abachi optional), benches with LED lighting",
    "Abachi-Holz (optional Thermo-Abachi), Bänke mit LED-Beleuchtung",
    "Abachihout (optioneel thermo-abachi), banken met ledverlichting",
  ),
  insulationType: L(
    "Konstrukcja CWP (laminat, XPS, laminat), izolacja XPS 80 mm",
    "CWP structure (laminate, XPS, laminate), 80 mm XPS insulation",
    "CWP-Konstruktion (Laminat, XPS, Laminat), 80 mm XPS-Dämmung",
    "CWP-constructie (laminaat, XPS, laminaat), 80 mm XPS-isolatie",
  ),
  glazingType: L(
    "Panoramiczny front 220 × 220 cm bez ramy, szkło hartowane zespolone z zaokrąglonymi narożnikami; drzwi ze szkła hartowanego brązowego z drewnianą ościeżnicą",
    "Frameless 220 × 220 cm panoramic front, tempered insulated glass with rounded corners; door in bronze tempered glass with a wooden frame",
    "Rahmenlose Panoramafront 220 × 220 cm aus gehärtetem Isolierglas mit abgerundeten Ecken; Tür aus bronzefarbenem Sicherheitsglas mit Holzzarge",
    "Kaderloze panoramische voorkant van 220 × 220 cm in gehard isolatieglas met afgeronde hoeken; deur van brons gehard glas met houten kozijn",
  ),
  electricalRequirement: L(
    "Zasilanie 400 V (trójfazowe) dla pieców elektrycznych",
    "400 V (three-phase) supply for electric heaters",
    "400-V-Anschluss (Drehstrom) für Elektroöfen",
    "400 V-aansluiting (krachtstroom) voor elektrische kachels",
  ),
};

const CUBE_SAUNA_SPECS: Omit<SaunaSpecsText, "changingAreaDescription"> = {
  claddingMaterial: L(
    "Elewacja do wyboru: kompozyt, lamele lub drewno",
    "Facade to choose: composite, slats or wood",
    "Fassade nach Wahl: Verbundwerkstoff, Lamellen oder Holz",
    "Gevel naar keuze: composiet, lamellen of hout",
  ),
  interiorWoodType: L(
    "Lite drewno klejone krzyżowo (CLT)",
    "Solid cross-laminated timber (CLT)",
    "Massives Brettsperrholz (CLT)",
    "Massief kruislaaghout (CLT)",
  ),
  benchMaterial: L("Drewno abachi", "Abachi wood", "Abachi-Holz", "Abachihout"),
  insulationType: L(
    "Konstrukcja z litego drewna CLT",
    "Solid CLT timber structure",
    "Konstruktion aus massivem CLT-Holz",
    "Constructie van massief CLT-hout",
  ),
  glazingType: L(
    "Duże przeszklenia ze szkła hartowanego",
    "Large tempered glass glazing",
    "Große Verglasungen aus Sicherheitsglas",
    "Grote beglazing van gehard glas",
  ),
  electricalRequirement: L(
    "Piec elektryczny (zasilanie 400 V) lub piec opalany drewnem",
    "Electric heater (400 V supply) or wood-fired stove",
    "Elektroofen (400-V-Anschluss) oder Holzofen",
    "Elektrische kachel (400 V-aansluiting) of houtgestookte kachel",
  ),
};

export interface CocoSauna {
  key: string;
  name: string;
  status: "published" | "draft";
  line: "coco" | "cube";
  externalDimensions: string;
  seatingCapacity: number;
  description: L10n;
  changingArea?: L10n;
  // Cena brutto PLN z konfiguratora producenta (zawiera pakiet START); brak = wycena indywidualna.
  bruttoPln?: number;
  photos: PhotoSpec[];
}

const PACKAGE_START = L(
  "W cenie pakiet START (wartość 4 650 zł brutto): podświetlenie ławek LED w ciepłej barwie, nagłośnienie Bluetooth z wodoodpornym głośnikiem, kamienie do pieca, zestaw olejków COCOSPA z dwiema poduszkami oraz 12 miesięcy aplikacji COCOSPA. Piec wybierany w konfiguratorze.",
  "Includes the START package (worth PLN 4,650 gross): warm white LED bench lighting, Bluetooth audio with a waterproof speaker, heater stones, a COCOSPA oil set with two cushions and 12 months of the COCOSPA app. Heater chosen in the configurator.",
  "Inklusive START-Paket (Wert 4.650 PLN brutto): warmweiße LED-Bankbeleuchtung, Bluetooth-Audio mit wasserdichtem Lautsprecher, Saunasteine, COCOSPA-Ölset mit zwei Kissen und 12 Monate COCOSPA-App. Ofen wird im Konfigurator gewählt.",
  "Inclusief START-pakket (waarde PLN 4.650 bruto): ledverlichting van de banken in warm wit, Bluetooth-audio met waterdichte luidspreker, saunastenen, een COCOSPA-olieset met twee kussens en 12 maanden COCOSPA-app. Kachel te kiezen in de configurator.",
);
export const SAUNA_EXCLUDED = L(
  "Transport i montaż wyceniane osobno (montaż u klienta dostępny w konfiguratorze)",
  "Transport and installation priced separately (on-site installation available in the configurator)",
  "Transport und Montage werden separat berechnet (Montage vor Ort im Konfigurator wählbar)",
  "Transport en montage worden apart geprijsd (montage ter plaatse beschikbaar in de configurator)",
);
export const CUBE_SCOPE = L(
  "Wycena indywidualna; piec elektryczny lub opalany drewnem, elewacja i wyposażenie ustalane z producentem.",
  "Individual quote; electric or wood-fired heater, facade and equipment agreed with the producer.",
  "Individuelles Angebot; Elektro- oder Holzofen, Fassade und Ausstattung werden mit dem Hersteller abgestimmt.",
  "Offerte op maat; elektrische of houtgestookte kachel, gevel en uitrusting in overleg met de producent.",
);
export const saunaScope = (sauna: CocoSauna): L10n => (sauna.bruttoPln ? PACKAGE_START : CUBE_SCOPE);
export const saunaSpecsText = (sauna: CocoSauna): SaunaSpecsText => ({
  ...(sauna.line === "coco" ? COCO_SAUNA_SPECS : CUBE_SAUNA_SPECS),
  ...(sauna.changingArea ? { changingAreaDescription: sauna.changingArea } : {}),
});

export const SAUNA_CONSTRUCTION = {
  coco: L(
    "Gotowa kabina z linii COCO w technologii CWP, dostarczana w całości",
    "Ready-made COCO line cabin in CWP technology, delivered in one piece",
    "Fertige Kabine der Linie COCO in CWP-Technologie, in einem Stück geliefert",
    "Kant-en-klare cabine uit de COCO-lijn in CWP-technologie, in één stuk geleverd",
  ),
  cube: L(
    "Gotowa kabina z linii CUBE z litego drewna CLT, dostarczana w całości",
    "Ready-made CUBE line cabin in solid CLT timber, delivered in one piece",
    "Fertige Kabine der Linie CUBE aus massivem CLT-Holz, in einem Stück geliefert",
    "Kant-en-klare cabine uit de CUBE-lijn van massief CLT-hout, in één stuk geleverd",
  ),
};
export const SAUNA_ROOF = {
  coco: L(
    "Zaokrąglona bryła z laminatu GFK, bez osobnego pokrycia dachu",
    "Rounded GFK laminate shell, no separate roof covering",
    "Abgerundeter Baukörper aus GFK-Laminat, ohne separate Dachdeckung",
    "Afgeronde schaal van GFK-laminaat, zonder aparte dakbedekking",
  ),
  cube: L("Płaski dach", "Flat roof", "Flachdach", "Plat dak"),
};
export const SAUNA_CUSTOM = L(
  "Piec, rodzaj szkła frontu i drzwi, ławki, podświetlenie, panele podczerwieni i nagłośnienie; możliwa sauna na wymiar",
  "Heater, front and door glass type, benches, lighting, infrared panels and audio; custom-size saunas possible",
  "Ofen, Glasart von Front und Tür, Bänke, Beleuchtung, Infrarotpaneele und Audio; Saunen nach Maß möglich",
  "Kachel, glassoort van voorkant en deur, banken, verlichting, infraroodpanelen en audio; sauna op maat mogelijk",
);

export const SAUNAS: CocoSauna[] = [
  {
    key: "oslo-220",
    name: "COCOSPA Oslo 220",
    status: "published",
    line: "coco",
    externalDimensions: "220 × 220 × 220 cm",
    seatingCapacity: 4,
    bruttoPln: 68600,
    description: L(
      "Kompaktowa sauna ogrodowa z linii COCO: zaokrąglona, biała bryła z laminatu GFK z panoramicznym frontem 220 × 220 cm bez ramy i podświetleniem LED. Wnętrze wyłożone ryflowanymi lamelami z termo osiki, ławki z drewna abachi, miejsce dla 2-4 osób. Sauna współpracuje z aplikacją COCOSPA (prowadzenie rytuałów, timer rund, muzyka) i powstaje w 6-10 tygodni.",
      "Compact garden sauna from the COCO line: a rounded white GFK laminate shell with a frameless 220 × 220 cm panoramic front and LED lighting. The interior is lined with ribbed thermo aspen slats, with abachi wood benches and room for 2-4 people. The sauna works with the COCOSPA app (guided rituals, round timer, music) and is made in 6-10 weeks.",
      "Kompakte Gartensauna der Linie COCO: abgerundeter, weißer Baukörper aus GFK-Laminat mit rahmenloser Panoramafront 220 × 220 cm und LED-Beleuchtung. Innen geriffelte Thermo-Espe-Lamellen, Bänke aus Abachi-Holz, Platz für 2-4 Personen. Die Sauna arbeitet mit der COCOSPA-App (geführte Rituale, Rundentimer, Musik) und entsteht in 6-10 Wochen.",
      "Compacte tuinsauna uit de COCO-lijn: een afgeronde witte schaal van GFK-laminaat met een kaderloze panoramische voorkant van 220 × 220 cm en ledverlichting. Het interieur is bekleed met geribbelde thermo-espen lamellen, met banken van abachihout en plaats voor 2-4 personen. De sauna werkt met de COCOSPA-app (begeleide rituelen, rondetimer, muziek) en wordt in 6-10 weken gemaakt.",
    ),
    photos: P("sauna-coco:23", "sauna-coco:03", "sauna-coco:31", "sauna-coco:30", "sauna-coco:29", "sauna-coco:26", "sauna-coco:28", "sauna-coco:18", "sauna-coco:19", "sauna-coco:20", "sauna-coco:01"),
  },
  {
    key: "bergen-300",
    name: "COCOSPA Bergen 300",
    status: "published",
    line: "coco",
    externalDimensions: "300 × 220 × 220 cm",
    seatingCapacity: 4,
    bruttoPln: 94300,
    changingArea: L(
      "Przedsionek 90 cm oddzielony drugimi szklanymi drzwiami (kabina 200 cm)",
      "90 cm vestibule separated by a second glass door (200 cm cabin)",
      "Vorraum 90 cm, durch eine zweite Glastür getrennt (Kabine 200 cm)",
      "Voorruimte van 90 cm, gescheiden door een tweede glazen deur (cabine 200 cm)",
    ),
    description: L(
      "Sauna ogrodowa z linii COCO z przedsionkiem: kabina 200 cm i strefa wejściowa 90 cm, oddzielone szklanymi drzwiami. Biała bryła z laminatu GFK, panoramiczny front 220 × 220 cm, wnętrze z lamel z termo osiki i ławki z drewna abachi dla 2-4 osób. Współpracuje z aplikacją COCOSPA; realizacja 6-10 tygodni.",
      "Garden sauna from the COCO line with a vestibule: a 200 cm cabin and a 90 cm entrance zone separated by a glass door. White GFK laminate shell, 220 × 220 cm panoramic front, thermo aspen slat interior and abachi benches for 2-4 people. Works with the COCOSPA app; lead time 6-10 weeks.",
      "Gartensauna der Linie COCO mit Vorraum: Kabine 200 cm und Eingangsbereich 90 cm, durch eine Glastür getrennt. Weißer Baukörper aus GFK-Laminat, Panoramafront 220 × 220 cm, Innenraum mit Thermo-Espe-Lamellen und Abachi-Bänken für 2-4 Personen. Arbeitet mit der COCOSPA-App; Lieferzeit 6-10 Wochen.",
      "Tuinsauna uit de COCO-lijn met voorruimte: een cabine van 200 cm en een entreezone van 90 cm, gescheiden door een glazen deur. Witte schaal van GFK-laminaat, panoramische voorkant van 220 × 220 cm, interieur met thermo-espen lamellen en abachibanken voor 2-4 personen. Werkt met de COCOSPA-app; levertijd 6-10 weken.",
    ),
    photos: P("sauna-coco:22", "sauna-coco:21", "sauna-coco:19", "sauna-coco:20"),
  },
  {
    key: "sztokholm-500",
    name: "COCOSPA Sztokholm 500",
    status: "published",
    line: "coco",
    externalDimensions: "500 × 220 × 220 cm",
    seatingCapacity: 4,
    bruttoPln: 141700,
    changingArea: L(
      "Strefa relaksu 200 × 280 cm z ławką, oddzielona od kabiny 200 × 200 cm szklanymi drzwiami",
      "200 × 280 cm relaxation zone with a bench, separated from the 200 × 200 cm cabin by a glass door",
      "Ruhezone 200 × 280 cm mit Bank, durch eine Glastür von der Kabine 200 × 200 cm getrennt",
      "Relaxzone van 200 × 280 cm met bank, door een glazen deur gescheiden van de cabine van 200 × 200 cm",
    ),
    description: L(
      "Największa sauna ogrodowa z linii COCO, ze strefą relaksu: kabina 200 × 200 cm i pomieszczenie wypoczynkowe 200 × 280 cm, oba z wejściem przez szklane drzwi. Biała bryła z laminatu GFK, panoramiczny front, lamele z termo osiki i ławki z drewna abachi z oparciami. Sprawdza się jako domowe spa i strefa wellness w hotelach; realizacja 6-10 tygodni.",
      "The largest garden sauna from the COCO line, with a relaxation zone: a 200 × 200 cm cabin and a 200 × 280 cm lounge, both entered through glass doors. White GFK laminate shell, panoramic front, thermo aspen slats and abachi benches with backrests. Works as a home spa and as a wellness zone in hotels; lead time 6-10 weeks.",
      "Die größte Gartensauna der Linie COCO, mit Ruhezone: Kabine 200 × 200 cm und Ruheraum 200 × 280 cm, beide über Glastüren zugänglich. Weißer Baukörper aus GFK-Laminat, Panoramafront, Thermo-Espe-Lamellen und Abachi-Bänke mit Rückenlehnen. Geeignet als Spa zu Hause und als Wellnessbereich im Hotel; Lieferzeit 6-10 Wochen.",
      "De grootste tuinsauna uit de COCO-lijn, met relaxzone: een cabine van 200 × 200 cm en een rustruimte van 200 × 280 cm, beide via glazen deuren bereikbaar. Witte schaal van GFK-laminaat, panoramische voorkant, thermo-espen lamellen en abachibanken met rugleuning. Geschikt als spa thuis en als wellnesszone in hotels; levertijd 6-10 weken.",
    ),
    photos: P("sauna-coco:13", "sauna-coco:16", "sauna-coco:14", "sauna-coco:15", "sauna-coco:19", "sauna-coco:20"),
  },
  cube("milan-220", "COCOSPA Milan 220", "published", "2,20 × 2,20 × 2,20 m", 4, undefined, P("sauna-cube:05"),
    L("Kompaktowa sauna kostka", "Compact cube sauna", "Kompakte Würfelsauna", "Compacte kubussauna")),
  cube("roma-310", "COCOSPA Roma 310", "published", "3,10 × 2,20 × 2,20 m", 4,
    L("Przedsionek przed kabiną", "Vestibule in front of the cabin", "Vorraum vor der Kabine", "Voorruimte voor de cabine"),
    P("thumbs:Roma"), L("Sauna z przedsionkiem", "Sauna with a vestibule", "Sauna mit Vorraum", "Sauna met voorruimte")),
  cube("berlin-500", "COCOSPA Berlin 500", "published", "5,0 × 2,2 × 2,2 m", 4,
    L("Strefa relaksu obok kabiny", "Relaxation zone next to the cabin", "Ruhezone neben der Kabine", "Relaxzone naast de cabine"),
    P("thumbs:Berlin"), L("Sauna ze strefą relaksu", "Sauna with a relaxation zone", "Sauna mit Ruhezone", "Sauna met relaxzone")),
  cube("zurich-600", "COCOSPA Zurich 600", "published", "6,00 × 2,50 × 2,20 m", 4,
    L("Strefa relaksu obok kabiny", "Relaxation zone next to the cabin", "Ruhezone neben der Kabine", "Relaxzone naast de cabine"),
    P("thumbs:Zurich"), L("Szersza sauna ze strefą relaksu", "Wider sauna with a relaxation zone", "Breitere Sauna mit Ruhezone", "Bredere sauna met relaxzone")),
  cube("vienna-600", "COCOSPA Vienna 600", "published", "6,0 × 3,0 × 3,0 m", 4,
    L("Strefa relaksu obok kabiny", "Relaxation zone next to the cabin", "Ruhezone neben der Kabine", "Relaxzone naast de cabine"),
    P("sauna-cube:01", "sauna-cube:03", "sauna-cube:04"),
    L("Pawilon saunowy ze strefą relaksu, także na taras dachowy", "Sauna pavilion with a relaxation zone, also for roof terraces", "Saunapavillon mit Ruhezone, auch für Dachterrassen", "Saunapaviljoen met relaxzone, ook voor dakterrassen")),
  cube("geneva-900", "COCOSPA Geneva 900", "draft", "9,0 × 3,0 × 3,0 m", 6,
    L("Strefa relaksu obok kabiny", "Relaxation zone next to the cabin", "Ruhezone neben der Kabine", "Relaxzone naast de cabine"),
    [], L("Duży pawilon wellness ze strefą relaksu", "Large wellness pavilion with a relaxation zone", "Großer Wellnesspavillon mit Ruhezone", "Groot wellnesspaviljoen met relaxzone")),
  laponia("laponia-900", "COCOSPA Laponia 900", "published", P("sauna-misc:01")),
  laponia("laponia-900-f", "COCOSPA Laponia 900 F", "draft", []),
];

function cube(
  key: string,
  name: string,
  status: "published" | "draft",
  externalDimensions: string,
  seatingCapacity: number,
  changingArea: L10n | undefined,
  photos: PhotoSpec[],
  kind: L10n,
): CocoSauna {
  const d = externalDimensions;
  return {
    key,
    name,
    status,
    line: "cube",
    externalDimensions,
    seatingCapacity,
    changingArea,
    description: L(
      `${kind.pl} z linii CUBE (${d}): geometryczna bryła z litego drewna CLT z dużymi przeszkleniami, dla ${seatingCapacity} osób. Piec elektryczny lub opalany drewnem, moc dobierana do kubatury. Elewację, rodzaj drewna, okna i wyposażenie producent dopasowuje do potrzeb klienta.`,
      `${kind.en} from the CUBE line (${d}): a geometric solid CLT timber body with large glazing, for ${seatingCapacity} people. Electric or wood-fired heater, sized to the cabin volume. The producer tailors the facade, wood type, windows and equipment to the customer.`,
      `${kind.de} der Linie CUBE (${d}): geometrischer Baukörper aus massivem CLT-Holz mit großen Verglasungen, für ${seatingCapacity} Personen. Elektro- oder Holzofen, Leistung passend zum Raumvolumen. Fassade, Holzart, Fenster und Ausstattung passt der Hersteller an den Kunden an.`,
      `${kind.nl} uit de CUBE-lijn (${d}): een geometrisch volume van massief CLT-hout met grote beglazing, voor ${seatingCapacity} personen. Elektrische of houtgestookte kachel, afgestemd op het volume. Gevel, houtsoort, ramen en uitrusting stemt de producent af op de klant.`,
    ),
    photos,
  };
}

function laponia(key: string, name: string, status: "published" | "draft", photos: PhotoSpec[]): CocoSauna {
  return {
    key,
    name,
    status,
    line: "coco",
    externalDimensions: "9,9 × 3,0 × 3,0 m",
    seatingCapacity: 4,
    changingArea: L(
      "Strefa relaksu z prysznicem i jacuzzi w jednej bryle z sauną",
      "Relaxation zone with shower and hot tub in one body with the sauna",
      "Ruhezone mit Dusche und Whirlpool im selben Baukörper wie die Sauna",
      "Relaxzone met douche en jacuzzi in hetzelfde volume als de sauna",
    ),
    description: L(
      "Luksusowy pawilon spa z linii COCO o długości 9,9 m: sauna dla 4 osób, prysznic, strefa relaksu i jacuzzi pod jednym dachem. Zaokrąglona bryła z dużymi przeszkleniami, pomyślana jako prywatne spa przy domu lub strefa wellness w hotelu. Wycena indywidualna.",
      "Luxury 9.9 m spa pavilion from the COCO line: a sauna for 4 people, a shower, a relaxation zone and a hot tub under one roof. Rounded body with large glazing, designed as a private spa next to a home or a wellness zone in a hotel. Individual quote.",
      "Luxuriöser Spa-Pavillon der Linie COCO mit 9,9 m Länge: Sauna für 4 Personen, Dusche, Ruhezone und Whirlpool unter einem Dach. Abgerundeter Baukörper mit großen Verglasungen, gedacht als privates Spa am Haus oder Wellnessbereich im Hotel. Individuelles Angebot.",
      "Luxe spapaviljoen uit de COCO-lijn van 9,9 m: een sauna voor 4 personen, een douche, een relaxzone en een jacuzzi onder één dak. Afgerond volume met grote beglazing, bedoeld als privéspa bij de woning of wellnesszone in een hotel. Offerte op maat.",
    ),
    photos,
  };
}

// Konfigurator saun COCO (wspólny dla Oslo 220, Bergen 300, Sztokholm 500): ceny brutto PLN ze strony producenta.
// Pierwsza opcja każdej grupy jest domyślna i w cenie (0 zł). `null` = wycena indywidualna.
export interface SaunaOption {
  key: string;
  label: L10n;
  bruttoPln: number | null;
  note?: L10n;
}
export interface SaunaOptionGroup {
  key: string;
  name: L10n;
  options: SaunaOption[];
}
const inStart = L("w pakiecie START", "in the START package", "im START-Paket", "in het START-pakket");
const glass = (key: string, pl: string, en: string, de: string, nl: string, price: number | null = 1500): SaunaOption => ({ key, label: L(pl, en, de, nl), bruttoPln: price });

export const OPTION_GROUPS: SaunaOptionGroup[] = [
  {
    key: "piec",
    name: L("Piec", "Heater", "Saunaofen", "Saunakachel"),
    options: [
      { key: "brak", label: L("Bez pieca", "No heater", "Ohne Ofen", "Zonder kachel"), bruttoPln: 0 },
      { key: "harvia-pc90", label: L("Harvia Cilindro PC90, sterowanie w piecu, 9 kW", "Harvia Cilindro PC90, built-in control, 9 kW", "Harvia Cilindro PC90, Steuerung am Ofen, 9 kW", "Harvia Cilindro PC90, bediening in de kachel, 9 kW"), bruttoPln: 2600 },
      { key: "harvia-pc90xe", label: L("Harvia Cilindro PC90XE, 9 kW", "Harvia Cilindro PC90XE, 9 kW", "Harvia Cilindro PC90XE, 9 kW", "Harvia Cilindro PC90XE, 9 kW"), bruttoPln: 4533 },
      { key: "harvia-pc90xw", label: L("Harvia Cilindro PC90XW, sterownik Xenio Wi-Fi, 9 kW", "Harvia Cilindro PC90XW, Xenio Wi-Fi control, 9 kW", "Harvia Cilindro PC90XW, Xenio-WLAN-Steuerung, 9 kW", "Harvia Cilindro PC90XW, Xenio-wifibediening, 9 kW"), bruttoPln: 5590 },
      { key: "harvia-sp90xw", label: L("Harvia Spirit SP90XW, sterownik Xenio Wi-Fi, 9 kW", "Harvia Spirit SP90XW, Xenio Wi-Fi control, 9 kW", "Harvia Spirit SP90XW, Xenio-WLAN-Steuerung, 9 kW", "Harvia Spirit SP90XW, Xenio-wifibediening, 9 kW"), bruttoPln: 5900 },
      { key: "huum-drop", label: L("HUUM Drop, sterownik UKU Wi-Fi, 9 kW", "HUUM Drop, UKU Wi-Fi control, 9 kW", "HUUM Drop, UKU-WLAN-Steuerung, 9 kW", "HUUM Drop, UKU-wifibediening, 9 kW"), bruttoPln: 7500 },
      { key: "huum-hive-mini", label: L("HUUM Hive Mini, sterownik UKU Wi-Fi, 9 kW", "HUUM Hive Mini, UKU Wi-Fi control, 9 kW", "HUUM Hive Mini, UKU-WLAN-Steuerung, 9 kW", "HUUM Hive Mini, UKU-wifibediening, 9 kW"), bruttoPln: 9000 },
      { key: "tulikivi-huurre", label: L("Tulikivi Huurre, biały, 9 kW", "Tulikivi Huurre, white, 9 kW", "Tulikivi Huurre, weiß, 9 kW", "Tulikivi Huurre, wit, 9 kW"), bruttoPln: 15700 },
      { key: "tulikivi-riite", label: L("Tulikivi Riite, biały, 9 kW", "Tulikivi Riite, white, 9 kW", "Tulikivi Riite, weiß, 9 kW", "Tulikivi Riite, wit, 9 kW"), bruttoPln: 16500 },
    ],
  },
  {
    key: "okladzina",
    name: L("Okładzina wewnętrzna", "Interior lining", "Innenverkleidung", "Binnenbekleding"),
    options: [
      { key: "termo-osika", label: L("Lamele z termo osiki, ściany i sufit", "Thermo aspen slats, walls and ceiling", "Thermo-Espe-Lamellen, Wände und Decke", "Thermo-espen lamellen, wanden en plafond"), bruttoPln: 0 },
      { key: "sklejka", label: L("Gładka sklejka saunowa", "Smooth sauna plywood", "Glattes Saunasperrholz", "Glad saunamultiplex"), bruttoPln: null },
    ],
  },
  {
    key: "drzwi",
    name: L("Szkło drzwi", "Door glass", "Türglas", "Deurglas"),
    options: [
      glass("braz", "Szkło hartowane brązowe, drewniana ościeżnica i klamka", "Bronze tempered glass, wooden frame and handle", "Bronzefarbenes Sicherheitsglas, Holzzarge und -griff", "Brons gehard glas, houten kozijn en greep", 0),
      glass("bezbarwne", "Szkło bezbarwne", "Clear glass", "Klarglas", "Helder glas", null),
      glass("stopsol", "Lustro weneckie Stopsol", "Stopsol one-way mirror glass", "Stopsol-Spiegelglas", "Stopsol-spionglas"),
      glass("czarne", "Szkło czarne", "Black glass", "Schwarzes Glas", "Zwart glas"),
    ],
  },
  {
    key: "front",
    name: L("Szkło frontu 220 × 220 cm", "Front glass 220 × 220 cm", "Frontglas 220 × 220 cm", "Frontglas 220 × 220 cm"),
    options: [
      glass("bezbarwne", "Bezbarwne, hartowane, zespolone", "Clear, tempered, insulated", "Klar, gehärtet, Isolierglas", "Helder, gehard, isolatieglas", 0),
      glass("grafit", "Przyciemniane grafitowe", "Graphite tinted", "Graphitgrau getönt", "Grafiet getint"),
      glass("stopsol", "Lustro weneckie Stopsol", "Stopsol one-way mirror glass", "Stopsol-Spiegelglas", "Stopsol-spionglas"),
      glass("braz", "Szkło brązowe", "Bronze glass", "Bronzeglas", "Brons glas"),
      glass("czarne", "Szkło czarne", "Black glass", "Schwarzes Glas", "Zwart glas"),
    ],
  },
  {
    key: "lawki",
    name: L("Ławki", "Benches", "Bänke", "Banken"),
    options: [
      { key: "abachi", label: L("Abachi naturalne", "Natural abachi", "Natur-Abachi", "Natuurlijk abachi"), bruttoPln: 0 },
      { key: "thermo-abachi", label: L("Thermo abachi", "Thermo abachi", "Thermo-Abachi", "Thermo-abachi"), bruttoPln: 1000 },
    ],
  },
  {
    key: "led",
    name: L("Podświetlenie ławek", "Bench lighting", "Bankbeleuchtung", "Bankverlichting"),
    options: [
      { key: "ciepla", label: L("LED w ciepłej białej barwie", "Warm white LED", "LED warmweiß", "Led warm wit"), bruttoPln: 0, note: inStart },
      { key: "rgb", label: L("LED RGB ze sterowaniem", "RGB LED with control", "RGB-LED mit Steuerung", "RGB-led met bediening"), bruttoPln: 600 },
    ],
  },
  {
    key: "ir",
    name: L("Panele na podczerwień", "Infrared panels", "Infrarotpaneele", "Infraroodpanelen"),
    options: [
      { key: "brak", label: L("Bez paneli", "No panels", "Ohne Paneele", "Zonder panelen"), bruttoPln: 0 },
      { key: "1", label: L("1 panel", "1 panel", "1 Paneel", "1 paneel"), bruttoPln: 1700 },
      { key: "2", label: L("2 panele", "2 panels", "2 Paneele", "2 panelen"), bruttoPln: 3400 },
      { key: "3", label: L("3 panele", "3 panels", "3 Paneele", "3 panelen"), bruttoPln: 6800 },
      { key: "4", label: L("4 panele", "4 panels", "4 Paneele", "4 panelen"), bruttoPln: 8500 },
    ],
  },
  {
    key: "audio",
    name: L("Nagłośnienie", "Audio", "Audio", "Audio"),
    options: [
      { key: "bt", label: L("Wzmacniacz Bluetooth z głośnikiem 30 W", "Bluetooth amplifier with 30 W speaker", "Bluetooth-Verstärker mit 30-W-Lautsprecher", "Bluetooth-versterker met 30 W-luidspreker"), bruttoPln: 0, note: inStart },
      { key: "panel", label: L("Dotykowy panel ścienny Bluetooth z głośnikami 30 W", "Touch Bluetooth wall panel with 30 W speakers", "Bluetooth-Touch-Wandpanel mit 30-W-Lautsprechern", "Bluetooth-wandpaneel met touchbediening en 30 W-luidsprekers"), bruttoPln: 1300 },
    ],
  },
  {
    key: "montaz",
    name: L("Montaż", "Installation", "Montage", "Montage"),
    options: [
      { key: "nie", label: L("Bez montażu", "No installation", "Ohne Montage", "Zonder montage"), bruttoPln: 0 },
      {
        key: "tak",
        label: L("Montaż sauny u klienta", "Sauna installation at the customer's site", "Montage der Sauna beim Kunden", "Montage van de sauna bij de klant"),
        bruttoPln: 4000,
        note: L("Klient zapewnia sprzęt do rozładunku", "The customer provides unloading equipment", "Der Kunde stellt das Entladegerät", "De klant zorgt voor losmaterieel"),
      },
    ],
  },
];

// ---------------------------------------------------------------- Kontenery (kawiarnie, POP-UP)

export interface ContainerVariant {
  code: string;
  label: string;
  scope: L10n;
}
export interface CocoContainer {
  key: string;
  name: string;
  subcategory: "gastronomiczne" | "uslugowe";
  floorAreaM2: number;
  builtUpAreaM2: number;
  description: L10n;
  variants: ContainerVariant[];
  photos: PhotoSpec[];
}

const cafe = (code: string, floors: number, built: string, net: string, dims: string, modules: number): ContainerVariant => {
  const fl = { pl: floors === 1 ? "1 kondygnacja" : `${floors} kondygnacje`, en: floors === 1 ? "1 storey" : `${floors} storeys`, de: floors === 1 ? "1 Geschoss" : `${floors} Geschosse`, nl: floors === 1 ? "1 bouwlaag" : `${floors} bouwlagen` };
  const md = { pl: modules === 1 ? "1 moduł" : modules < 5 ? `${modules} moduły` : `${modules} modułów`, en: modules === 1 ? "1 module" : `${modules} modules`, de: modules === 1 ? "1 Modul" : `${modules} Module`, nl: modules === 1 ? "1 module" : `${modules} modules` };
  return {
    code,
    label: `COCOCAFE ${code}`,
    scope: L(
      `${fl.pl}, ${md.pl}, powierzchnia zabudowy ${built} m², użytkowa ${net} m², wymiary ${dims}. Wycena indywidualna.`,
      `${fl.en}, ${md.en}, footprint ${built} m², usable area ${net} m², dimensions ${dims}. Individual quote.`,
      `${fl.de}, ${md.de}, bebaute Fläche ${built} m², Nutzfläche ${net} m², Maße ${dims}. Individuelles Angebot.`,
      `${fl.nl}, ${md.nl}, bebouwde oppervlakte ${built} m², gebruiksoppervlak ${net} m², afmetingen ${dims}. Offerte op maat.`,
    ),
  };
};
const popup = (line: "COCO" | "CUBE", len: number): ContainerVariant => {
  const area = 3 * len;
  return {
    code: `${line.toLowerCase()}-3x${len}`,
    label: `${line} 3 × ${len} m`,
    scope: L(
      `Linia ${line}, 1 moduł ${len},0 × 3,0 × 3,0 m, powierzchnia ${area} m². Wycena indywidualna.`,
      `${line} line, 1 module ${len}.0 × 3.0 × 3.0 m, area ${area} m². Individual quote.`,
      `Linie ${line}, 1 Modul ${len},0 × 3,0 × 3,0 m, Fläche ${area} m². Individuelles Angebot.`,
      `${line}-lijn, 1 module ${len},0 × 3,0 × 3,0 m, oppervlakte ${area} m². Offerte op maat.`,
    ),
  };
};

const CONTAINER_CONSTRUCTION = L(
  "Prefabrykowane moduły linii COCO lub CUBE na ramie stalowej, wykańczane w zakładzie i łączone na miejscu",
  "Prefabricated COCO or CUBE line modules on a steel frame, finished in the factory and joined on site",
  "Vorgefertigte Module der Linie COCO oder CUBE auf Stahlrahmen, im Werk ausgebaut und vor Ort verbunden",
  "Geprefabriceerde modules uit de COCO- of CUBE-lijn op een stalen frame, in de fabriek afgewerkt en ter plaatse verbonden",
);
const CONTAINER_FOUNDATION = L(
  "Punktowe podpory lub płyta, przygotowane przez klienta; moduł można później przenieść",
  "Point supports or a slab, prepared by the customer; the module can be relocated later",
  "Punktstützen oder Platte, vom Kunden vorbereitet; das Modul lässt sich später versetzen",
  "Puntsteunen of een plaat, voorbereid door de klant; de module kan later worden verplaatst",
);
const CONTAINER_CUSTOM = L(
  "Układ, przeszklenia (warianty drzwi i okien), elewacja, branding i wyposażenie; biuro projektowe producenta przygotowuje też projekty na zamówienie",
  "Layout, glazing (door and window variants), facade, branding and fit-out; the producer's design office also prepares custom projects",
  "Grundriss, Verglasung (Tür- und Fenstervarianten), Fassade, Branding und Ausstattung; das Planungsbüro des Herstellers erstellt auch Sonderprojekte",
  "Indeling, beglazing (deur- en raamvarianten), gevel, branding en inrichting; het ontwerpbureau van de producent maakt ook projecten op maat",
);
export const containerTexts = { construction: CONTAINER_CONSTRUCTION, foundation: CONTAINER_FOUNDATION, custom: CONTAINER_CUSTOM };

export const CONTAINERS: CocoContainer[] = [
  {
    key: "cococafe-1f",
    name: "COCOCAFE kawiarnia modułowa",
    subcategory: "gastronomiczne",
    floorAreaM2: 21,
    builtUpAreaM2: 23.7,
    description: L(
      "Parterowa kawiarnia, bistro lub restauracja z modułów linii COCO, w trzech wielkościach: od pojedynczego modułu 24 m² po lokal 71 m² z trzech modułów. Duże przeszklenia, zaokrąglona bryła i możliwość dostawienia pergoli lub tarasu. Lokal montuje się szybko i można go później przenieść lub rozbudować.",
      "Single-storey café, bistro or restaurant built from COCO line modules, in three sizes: from a single 24 m² module up to a 71 m² venue of three modules. Large glazing, a rounded body and the option to add a pergola or terrace. The venue is quick to assemble and can later be moved or extended.",
      "Eingeschossiges Café, Bistro oder Restaurant aus Modulen der Linie COCO, in drei Größen: vom Einzelmodul mit 24 m² bis zum Lokal mit 71 m² aus drei Modulen. Große Verglasungen, abgerundeter Baukörper und die Möglichkeit, Pergola oder Terrasse anzubauen. Das Lokal ist schnell montiert und lässt sich später versetzen oder erweitern.",
      "Gelijkvloers café, bistro of restaurant van modules uit de COCO-lijn, in drie maten: van één module van 24 m² tot een zaak van 71 m² uit drie modules. Grote beglazing, een afgerond volume en de mogelijkheid om een pergola of terras toe te voegen. De zaak is snel gemonteerd en kan later worden verplaatst of uitgebreid.",
    ),
    variants: [cafe("24", 1, "23,7", "21", "7,9 × 3,0 × 3,0 m", 1), cafe("50", 1, "47,5", "42", "7,9 × 6,0 × 3,0 m", 2), cafe("70", 1, "71", "63", "7,9 × 9,0 × 3,0 m", 3)],
    photos: P("cafe:01", "cafe:02"),
  },
  {
    key: "cococafe-2f",
    name: "COCOCAFE restauracja dwukondygnacyjna",
    subcategory: "gastronomiczne",
    floorAreaM2: 108,
    builtUpAreaM2: 90,
    description: L(
      "Dwukondygnacyjna restauracja lub kawiarnia z czterech modułów linii COCO: górna kondygnacja wysunięta wspornikowo na skrzyżowanych stalowych podporach tworzy zadaszony taras. Przeszklenia na obu poziomach, miejsce na salę, bar i taras. Trzy warianty, od 90 do 144 m² zabudowy.",
      "Two-storey restaurant or café of four COCO line modules: the upper storey cantilevers on crossed steel supports, creating a covered terrace. Glazing on both levels, room for a dining hall, bar and terrace. Three variants, from 90 to 144 m² footprint.",
      "Zweigeschossiges Restaurant oder Café aus vier Modulen der Linie COCO: Das Obergeschoss kragt auf gekreuzten Stahlstützen aus und bildet eine überdachte Terrasse. Verglasungen auf beiden Ebenen, Platz für Gastraum, Bar und Terrasse. Drei Varianten mit 90 bis 144 m² bebauter Fläche.",
      "Restaurant of café met twee bouwlagen van vier modules uit de COCO-lijn: de bovenverdieping kraagt uit op gekruiste stalen steunen en vormt een overdekt terras. Beglazing op beide niveaus, ruimte voor zaal, bar en terras. Drie varianten, van 90 tot 144 m² bebouwde oppervlakte.",
    ),
    variants: [
      cafe("90-2F", 2, "90", "108", "9,9 × 6,0 × 3,0 m na kondygnację", 4),
      cafe("144-L-2F", 2, "144", "134", "12,0 × 6,0 × 3,0 m na kondygnację", 4),
      cafe("144-Z-2F", 2, "144", "134", "12,0 × 6,0 × 3,0 m na kondygnację", 4),
    ],
    photos: P("cafe:03", "cafe:05", "cafe:04"),
  },
  {
    key: "pop-up",
    name: "Pawilon POP-UP",
    subcategory: "uslugowe",
    floorAreaM2: 18,
    builtUpAreaM2: 18,
    description: L(
      "Mobilny pawilon handlowo-usługowy z jednego modułu: sklep, butik, kiosk, punkt gastronomiczny, biuro sprzedaży lub showroom. Dostępny w zaokrąglonej linii COCO i geometrycznej CUBE, w długościach od 6 do 9 m przy szerokości i wysokości 3 m. Przeszklenia i drzwi w kilku układach, elewacja gotowa pod branding marki; moduł przewozi się w całości i ustawia w jeden dzień.",
      "Mobile retail and service pavilion of a single module: a shop, boutique, kiosk, food outlet, sales office or showroom. Available in the rounded COCO line and the geometric CUBE line, 6 to 9 m long with a width and height of 3 m. Glazing and doors in several layouts, a facade ready for brand graphics; the module is transported in one piece and set up in a day.",
      "Mobiler Verkaufs- und Servicepavillon aus einem Modul: Laden, Boutique, Kiosk, Imbiss, Verkaufsbüro oder Showroom. Erhältlich in der abgerundeten Linie COCO und der geometrischen Linie CUBE, 6 bis 9 m lang bei 3 m Breite und Höhe. Verglasung und Türen in mehreren Anordnungen, Fassade bereit für Markenbranding; das Modul wird am Stück transportiert und an einem Tag aufgestellt.",
      "Mobiel winkel- en dienstenpaviljoen van één module: winkel, boetiek, kiosk, foodpunt, verkoopkantoor of showroom. Verkrijgbaar in de afgeronde COCO-lijn en de geometrische CUBE-lijn, 6 tot 9 m lang bij 3 m breed en hoog. Beglazing en deuren in meerdere indelingen, gevel klaar voor merkbranding; de module wordt in één stuk vervoerd en in een dag geplaatst.",
    ),
    variants: [popup("COCO", 6), popup("COCO", 7), popup("COCO", 8), popup("COCO", 9), popup("CUBE", 6), popup("CUBE", 7), popup("CUBE", 8), popup("CUBE", 9)],
    photos: P("popup:01", "popup:02"),
  },
];

export const productIdOf = (key: string, existingId?: string) => existingId ?? detUuid(`product:${key}`);
