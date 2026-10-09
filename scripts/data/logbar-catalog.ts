// Logbar Domy: dane 8 ofert PDF (_docs/logbar/Oferta *.pdf, stan 2026-10-09) przepisane ręcznie
// ze stron ofert, bo warstwa tekstowa tych PDF jest uszkodzona (nakładające się glify, ceny i
// opcje w poplątanych kolumnach). Każdy tekst widoczny dla klienta ma tu od razu cztery wersje
// językowe (pl jest źródłem, en/de/nl idą do tabel tłumaczeń, spec 0067).
//
// Podział na produkty: jedna elewacja = jeden produkt (18 produktów). Układy wnętrz Bingo
// (wersje 1-3) to opcja z dopłatą, nie osobne produkty. Ceny w ofertach to PLN netto.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

// NBP, tabela 196/A/NBP/2026 z 2026-10-08: 1 EUR = 4,3789 PLN.
export const EUR_PLN_RATE = 4.3789;
export const EUR_PLN_RATE_DATE = "2026-10-08";
export const EUR_PLN_RATE_TABLE = "196/A/NBP/2026";

export function plnToEurCents(amountPln: number): number {
  return Math.round(amountPln / EUR_PLN_RATE) * 100;
}

// Deterministyczny UUID (v5-podobny, sha1 z przestrzenią nazw): ten sam klucz zawsze daje ten
// sam id, więc import jest idempotentny, a SQL na prod ma identyczne identyfikatory.
const NAMESPACE = "modularhub:logbar-catalog:v1";
export function stableUuid(key: string): string {
  const hash = createHash("sha1").update(`${NAMESPACE}:${key}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const IMPORT_USER_ID = "catalog-import:logbar";
export const PRODUCER_ID = stableUuid("producer:logbar-domy");

export const LOGBAR_PRODUCER = {
  name: "Logbar Domy",
  nip: "CATALOG-LOGBAR",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent domów całorocznych z drewna konstrukcyjnego klasy C24 w technologii szkieletowej, z wnętrzami wykończonymi deską boazeryjną lub płytą G-K. Oferta obejmuje domy parterowe, z poddaszem lub antresolą o powierzchni zabudowy od 35 do 110 m², także z tarasem lub patio. Na całość domu producent udziela gwarancji 24 miesiące, a na konstrukcję 10 lat.",
    "Producer of year-round houses built from C24 structural timber in a timber-frame technology, with interiors finished in tongue-and-groove boards or plasterboard. The range covers single-storey houses and houses with an attic or mezzanine, with a footprint from 35 to 110 m², some with a terrace or patio. The producer gives a 24-month warranty on the whole house and 10 years on the structure.",
    "Hersteller von Ganzjahreshäusern aus Konstruktionsholz der Klasse C24 in Holzrahmenbauweise, mit Innenräumen aus Profilholz oder Gipskartonplatten. Das Angebot umfasst eingeschossige Häuser sowie Häuser mit Dachgeschoss oder Galerie mit einer Grundfläche von 35 bis 110 m², teils mit Terrasse oder Patio. Der Hersteller gibt 24 Monate Garantie auf das gesamte Haus und 10 Jahre auf die Konstruktion.",
    "Producent van huizen voor het hele jaar van constructiehout klasse C24 in houtskeletbouw, met een interieur afgewerkt met profielplanken of gipsplaten. Het aanbod omvat huizen van één bouwlaag en huizen met zolder of mezzanine met een bebouwde oppervlakte van 35 tot 110 m², deels met terras of patio. De producent geeft 24 maanden garantie op het hele huis en 10 jaar op de constructie.",
  ),
} as const;

export const ELIGIBILITY_REASON = L(
  "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
  "Feasibility and formal requirements depend on the specific plot and local regulations.",
  "Machbarkeit und formale Anforderungen hängen vom konkreten Grundstück und den örtlichen Vorgaben ab.",
  "De haalbaarheid en de formele vereisten hangen af van de specifieke kavel en de lokale regels.",
);

export type FloorLevel = "parter" | "pietro" | "poddasze";
export type CostStatus = "w-cenie" | "obowiazkowa-doplata" | "opcja" | "po-stronie-klienta" | "do-wyceny";
export type CompletionStandard = "surowy-zamkniety" | "deweloperski";

export interface RoomSource {
  name: L10n;
  areaM2: number;
  floorLevel: FloorLevel;
}

// Wersja układu wnętrz przypięta do opcji (spec 0069): własne pomieszczenia, metraż, opis i rzuty
// z piętrem. Pusta lista `rooms` znaczy: pomieszczenia produktu. Liczby pokoi, sypialni i łazienek
// zostają z produktu, bo w ofercie Bingo wszystkie wersje mają je takie same (4 pokoje, 2 łazienki).
export interface OptionLayoutSource {
  // Stabilny klucz do id pomieszczeń i nazw plików rzutów, np. "bingo-wersja-2".
  key: string;
  floorAreaM2: number;
  description: L10n | null;
  rooms: RoomSource[];
  plans: { file: string; floorLevel: FloorLevel }[];
}

export interface OptionSource {
  label: L10n;
  pricePln: number;
  layout?: OptionLayoutSource;
  // Wycena indywidualna zamiast liczby (cena nie wynika wprost z oferty); wtedy pricePln = 0 i jest ignorowane.
  priceOnRequest?: boolean;
  isDefault?: boolean;
}

export interface OptionGroupSource {
  name: L10n;
  selectionType: "single" | "multi";
  options: OptionSource[];
}

export interface CostItemSource {
  label: L10n;
  status: CostStatus;
}

export interface VariantSource {
  standard: CompletionStandard;
  pricePln: number;
  isDefault: boolean;
  scopeSummary: L10n;
  excludedScope: L10n;
  costItems: CostItemSource[];
}

export interface FaqSource {
  question: L10n;
  answer: L10n;
}

export interface ClientRequirementSource {
  key: "dojazd-dla-transportu" | "miejsce-dla-dzwigu" | "formalnosci" | "przygotowanie-dzialki" | "przylacza";
  // Pozycja własna (custom: true) ma własną etykietę i tłumaczenie.
  custom?: L10n;
}

export interface TechnicalSpecsSource {
  wallBuildUp: string;
  insulation: string;
  windowClass: string;
  ventilation: "grawitacyjna" | "inna";
  ventilationOther?: string;
  heatSource: "inne";
  heatSourceOther: string;
}

export interface LogbarProjectSource {
  key: string;
  id: string;
  name: string;
  builtUpAreaM2: number;
  floorAreaM2: number;
  externalDimensions: string;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  storeys: number;
  description: L10n;
  roofType: L10n;
  constructionSystem: L10n;
  foundationOptions: L10n;
  customizationScope: L10n;
  serviceScopeDescription: L10n;
  technicalSpecs: TechnicalSpecsSource;
  roomLayout: RoomSource[];
  faq: FaqSource[];
  clientRequirements: ClientRequirementSource[];
  variants: VariantSource[];
  optionGroups: OptionGroupSource[];
  // Ścieżki względem katalogu głównego repozytorium, cover pierwszy.
  photos: string[];
  floorPlans: string[];
  sourcePages: string;
}

const RAW = "tmp/logbar-catalog/raw";
const PLANS = "tmp/logbar-catalog/plans";
const raw = (dir: string, id: string) => `${RAW}/${dir}/img-${id}.jpg`;
const plan = (name: string) => `${PLANS}/${name}.png`;

// ---------------------------------------------------------------------------
// Nazwy pomieszczeń
// ---------------------------------------------------------------------------

const ROOM = {
  wiatrolap: L("Wiatrołap", "Entrance vestibule", "Windfang", "Portaal"),
  korytarz: L("Korytarz", "Hallway", "Flur", "Gang"),
  pokoj: L("Pokój", "Room", "Zimmer", "Kamer"),
  sypialnia: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
  lazienka: L("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
  wc: L("WC", "WC", "WC", "Toilet"),
  garderoba: L("Garderoba", "Walk-in wardrobe", "Ankleidezimmer", "Inloopkast"),
  gospodarcze: L("Pomieszczenie gospodarcze", "Utility room", "Hauswirtschaftsraum", "Bijkeuken"),
  techniczne: L("Pomieszczenie techniczne", "Technical room", "Technikraum", "Technische ruimte"),
  salonAneks: L("Salon z aneksem kuchennym", "Living room with kitchenette", "Wohnzimmer mit Küchenzeile", "Woonkamer met keukenhoek"),
  salon: L("Salon", "Living room", "Wohnzimmer", "Woonkamer"),
  kuchnia: L("Kuchnia", "Kitchen", "Küche", "Keuken"),
  kuchniaSalon: L("Kuchnia, salon, jadalnia", "Kitchen, living and dining room", "Küche, Wohn- und Esszimmer", "Keuken, woon- en eetkamer"),
  antresola: L("Antresola", "Mezzanine", "Galerie", "Mezzanine"),
  przestrzenAntresoli: L("Przestrzeń antresoli", "Mezzanine space", "Galeriefläche", "Mezzaninegedeelte"),
  schody: L("Schody", "Staircase", "Treppe", "Trap"),
} as const;

const room = (name: L10n, areaM2: number, floorLevel: FloorLevel): RoomSource => ({ name, areaM2, floorLevel });

// ---------------------------------------------------------------------------
// Pozycje kosztowe (porównanie wariantów) i wspólne teksty
// ---------------------------------------------------------------------------

const CL = {
  feet: L("Stopy fundamentowe", "Foundation pads", "Punktfundamente", "Funderingspoeren"),
  coldSlab: L("Płyta fundamentowa zimna", "Uninsulated foundation slab", "Kalte Fundamentplatte", "Niet-geïsoleerde funderingsplaat"),
  insulatedSlab: L(
    "Płyta fundamentowa zbrojona 200 mm, izolowana poziomo i pionowo XPS, z instalacjami",
    "Reinforced 200 mm foundation slab, insulated horizontally and vertically with XPS, with utility lines",
    "Bewehrte Fundamentplatte 200 mm, horizontal und vertikal mit XPS gedämmt, mit Installationen",
    "Gewapende funderingsplaat van 200 mm, horizontaal en verticaal met XPS geïsoleerd, inclusief leidingen",
  ),
  structure: L(
    "Konstrukcja szkieletowa z drewna C24 z izolacją ścian, podłogi i dachu wełną mineralną",
    "C24 timber-frame structure with mineral wool insulation of the walls, floor and roof",
    "Holzrahmenkonstruktion aus C24 mit Mineralwolldämmung von Wänden, Boden und Dach",
    "Houtskeletconstructie van C24 met minerale wol isolatie van wanden, vloer en dak",
  ),
  facade: L(
    "Elewacja wykonana w wybranym wariancie",
    "Façade finished in the chosen variant",
    "Fassade in der gewählten Ausführung",
    "Gevel afgewerkt in de gekozen uitvoering",
  ),
  roofCover: L(
    "Pokrycie dachu: panel na rąbek stojący lub blachodachówka",
    "Roof covering: standing-seam panels or metal roof tiles",
    "Dachdeckung: Stehfalzpaneele oder Blechdachziegel",
    "Dakbedekking: liggende-felspanelen of metalen dakpannen",
  ),
  gutters: L(
    "Orynnowanie ze stali ocynkowanej powlekanej w kolorze antracytowym (RAL 7016)",
    "Gutters made of coated galvanised steel in anthracite (RAL 7016)",
    "Dachrinnensystem aus beschichtetem verzinktem Stahl in Anthrazit (RAL 7016)",
    "Dakgoten van gecoate verzinkte staal in antraciet (RAL 7016)",
  ),
  windowsWhite: L(
    "Stolarka okienna trzyszybowa w kolorze białym i stalowe drzwi zewnętrzne w kolorze grafitowym",
    "Triple-glazed windows in white and steel external door in graphite",
    "Dreifachverglaste Fenster in Weiß und Stahl-Außentür in Graphit",
    "Driedubbele ramen in wit en stalen buitendeur in grafiet",
  ),
  windowsGraphite: L(
    "Stolarka okienna trzyszybowa i stalowe drzwi zewnętrzne w kolorze grafitowym",
    "Triple-glazed windows and steel external door in graphite",
    "Dreifachverglaste Fenster und Stahl-Außentür in Graphit",
    "Driedubbele ramen en stalen buitendeur in grafiet",
  ),
  windowsResidential: L(
    "Stolarka okienna trzyszybowa w kolorze białym i drzwi zewnętrzne spełniające parametry budynku mieszkalnego",
    "Triple-glazed windows in white and an external door meeting residential building requirements",
    "Dreifachverglaste Fenster in Weiß und Außentür, die die Anforderungen an Wohngebäude erfüllt",
    "Driedubbele ramen in wit en een buitendeur die voldoet aan de eisen voor woongebouwen",
  ),
  windowsViking: L(
    "Stolarka okienna trzyszybowa sześciokomorowa (antracytowa na zewnątrz, biała wewnątrz) i drzwi zewnętrzne Gerda lub Wikęd",
    "Triple-glazed six-chamber windows (anthracite outside, white inside) and a Gerda or Wikęd external door",
    "Dreifachverglaste Sechskammer-Fenster (außen anthrazit, innen weiß) und eine Außentür von Gerda oder Wikęd",
    "Driedubbele ramen met zes kamers (buiten antraciet, binnen wit) en een buitendeur van Gerda of Wikęd",
  ),
  electrical: L("Instalacja elektryczna", "Electrical installation", "Elektroinstallation", "Elektrische installatie"),
  plumbing: L(
    "Instalacja wodno-kanalizacyjna",
    "Water and sewage installation",
    "Wasser- und Abwasserinstallation",
    "Water- en rioolinstallatie",
  ),
  ventilation: L(
    "Wentylacja grawitacyjna z kominkami wentylacyjnymi",
    "Natural ventilation with ventilation chimneys",
    "Schwerkraftlüftung mit Lüftungskaminen",
    "Natuurlijke ventilatie met ventilatieschoorstenen",
  ),
  ceilingDeadening: L("Wygłuszenie stropu", "Sound-deadening of the ceiling", "Schalldämmung der Decke", "Geluiddemping van het plafond"),
  screed: L(
    "Podłoga pokryta suchym jastrychem",
    "Floor covered with dry screed",
    "Boden mit Trockenestrich",
    "Vloer met droge dekvloer",
  ),
  interiorFinish: L(
    "Wykończenie ścian oraz stropu deską boazeryjną lub płytą G-K",
    "Walls and ceiling finished with tongue-and-groove boards or plasterboard",
    "Wände und Decke mit Profilholz oder Gipskartonplatten verkleidet",
    "Wanden en plafond afgewerkt met profielplanken of gipsplaten",
  ),
  tempStairs: L("Schody tymczasowe", "Temporary stairs", "Provisorische Treppe", "Tijdelijke trap"),
  roofWindows2: L("Dwa okna połaciowe", "Two roof windows", "Zwei Dachfenster", "Twee dakramen"),
  roofWindowBath: L(
    "Okno połaciowe w łazience na poddaszu",
    "Roof window in the attic bathroom",
    "Dachfenster im Bad im Dachgeschoss",
    "Dakraam in de badkamer op zolder",
  ),
  entranceCanopy: L("Zadaszenie wejścia", "Entrance canopy", "Eingangsüberdachung", "Overkapping van de ingang"),
  terracePergola: L(
    "Taras (22,92 m²) z pergolą",
    "Terrace (22.92 m²) with a pergola",
    "Terrasse (22,92 m²) mit Pergola",
    "Terras (22,92 m²) met pergola",
  ),
  warranty: L(
    "Gwarancja 24 miesiące na całość i 10 lat na konstrukcję",
    "24-month warranty on the whole house and 10 years on the structure",
    "24 Monate Garantie auf das gesamte Haus und 10 Jahre auf die Konstruktion",
    "24 maanden garantie op het hele huis en 10 jaar op de constructie",
  ),
  transport: L(
    "Transport do miejsca montażu",
    "Transport to the assembly site",
    "Transport zum Montageort",
    "Transport naar de montagelocatie",
  ),
  crane: L("Dźwig do miejsca montażu", "Crane at the assembly site", "Kran am Montageort", "Kraan op de montagelocatie"),
  design: L(
    "Projekt architektoniczno-budowlany",
    "Architectural and building design",
    "Architektur- und Bauplanung",
    "Architectonisch en bouwkundig ontwerp",
  ),
  impregnation: L(
    "Impregnacja zewnętrzna budynku we własnym zakresie lub zlecona firmie",
    "External impregnation of the building, done by the investor or commissioned from a company",
    "Außenimprägnierung des Gebäudes in Eigenleistung oder durch eine beauftragte Firma",
    "Externe impregnering van het gebouw, door de opdrachtgever zelf of door een ingeschakeld bedrijf",
  ),
  windowColour: L(
    "Dopłata do ram okiennych w innym kolorze",
    "Surcharge for window frames in a different colour",
    "Aufpreis für Fensterrahmen in einer anderen Farbe",
    "Toeslag voor raamkozijnen in een andere kleur",
  ),
} as const;

const item = (label: L10n, status: CostStatus): CostItemSource => ({ label, status });

// Dla standardu z wykończeniem: pozycje, których nie ma w stanie surowym zamkniętym, mają tu
// status "w-cenie", a w wariancie SSZ "po-stronie-klienta" (ta sama etykieta w obu, żeby tabela
// porównania wariantów pokazała różnicę).
function buildCostItems(args: {
  standard: CompletionStandard;
  foundation: L10n;
  envelope: L10n[];
  extras?: L10n[];
  finishing?: boolean;
  impregnation?: boolean;
  windowColour?: boolean;
}): CostItemSource[] {
  const { standard, foundation, envelope, extras = [], finishing = true, impregnation = false, windowColour = true } = args;
  const items: CostItemSource[] = [
    item(foundation, "w-cenie"),
    item(CL.structure, "w-cenie"),
    item(CL.facade, "w-cenie"),
    ...envelope.map((label) => item(label, "w-cenie")),
    item(CL.electrical, "w-cenie"),
    item(CL.plumbing, "w-cenie"),
    ...extras.map((label) => item(label, "w-cenie")),
  ];
  if (finishing) {
    const finishingStatus: CostStatus = standard === "deweloperski" ? "w-cenie" : "po-stronie-klienta";
    items.push(item(CL.screed, finishingStatus), item(CL.interiorFinish, finishingStatus));
  }
  items.push(item(CL.warranty, "w-cenie"), item(CL.transport, "po-stronie-klienta"), item(CL.crane, "po-stronie-klienta"));
  items.push(item(CL.design, "po-stronie-klienta"));
  if (impregnation) items.push(item(CL.impregnation, "po-stronie-klienta"));
  if (windowColour) items.push(item(CL.windowColour, "do-wyceny"));
  return items;
}

// ---------------------------------------------------------------------------
// FAQ (wspólne pytania z ofert) i wymagania wobec klienta
// ---------------------------------------------------------------------------

const FAQ_TRANSPORT: FaqSource = {
  question: L(
    "Czy cena zawiera transport, dźwig i projekt budowlany?",
    "Does the price include transport, a crane and the building design?",
    "Sind Transport, Kran und Bauplanung im Preis enthalten?",
    "Zijn transport, een kraan en het bouwkundig ontwerp bij de prijs inbegrepen?",
  ),
  answer: L(
    "Nie. Do ceny należy doliczyć koszt transportu oraz dźwigu do miejsca montażu. W cenę nie jest wliczony projekt architektoniczno-budowlany.",
    "No. The cost of transport and of a crane at the assembly site must be added to the price. The architectural and building design is not included.",
    "Nein. Zum Preis kommen die Kosten für den Transport und für einen Kran am Montageort hinzu. Die Architektur- und Bauplanung ist nicht im Preis enthalten.",
    "Nee. De kosten van transport en van een kraan op de montagelocatie komen bovenop de prijs. Het architectonisch en bouwkundig ontwerp is niet inbegrepen.",
  ),
};

const FAQ_NET: FaqSource = {
  question: L(
    "Czy podane ceny są cenami netto?",
    "Are the prices net prices?",
    "Sind die angegebenen Preise Nettopreise?",
    "Zijn de genoemde prijzen nettoprijzen?",
  ),
  answer: L(
    "Tak, wszystkie ceny z oferty producenta są cenami netto. Stawka VAT zależy od przeznaczenia budynku.",
    "Yes, all prices in the producer's offer are net prices. The VAT rate depends on the intended use of the building.",
    "Ja, alle Preise im Angebot des Herstellers sind Nettopreise. Der Mehrwertsteuersatz hängt von der Nutzung des Gebäudes ab.",
    "Ja, alle prijzen in het aanbod van de producent zijn nettoprijzen. Het btw-tarief hangt af van de bestemming van het gebouw.",
  ),
};

const FAQ_WARRANTY: FaqSource = {
  question: L("Jaka jest gwarancja?", "What is the warranty?", "Welche Garantie gibt es?", "Welke garantie geldt er?"),
  answer: L(
    "Producent udziela gwarancji na 24 miesiące na całość domu oraz na 10 lat na konstrukcję.",
    "The producer gives a 24-month warranty on the whole house and a 10-year warranty on the structure.",
    "Der Hersteller gibt 24 Monate Garantie auf das gesamte Haus und 10 Jahre auf die Konstruktion.",
    "De producent geeft 24 maanden garantie op het hele huis en 10 jaar op de constructie.",
  ),
};

const FAQ_WINDOW_COLOUR: FaqSource = {
  question: L(
    "Czy ramy okienne mogą mieć inny kolor?",
    "Can the window frames have a different colour?",
    "Können die Fensterrahmen eine andere Farbe haben?",
    "Kunnen de raamkozijnen een andere kleur hebben?",
  ),
  answer: L(
    "Tak, za dopłatą. Producent podaje jej wysokość w indywidualnej wycenie.",
    "Yes, for a surcharge. The producer states its amount in an individual quotation.",
    "Ja, gegen Aufpreis. Die Höhe nennt der Hersteller im individuellen Angebot.",
    "Ja, tegen toeslag. De producent noemt het bedrag in een individuele offerte.",
  ),
};

const FAQ_FINISH_STANDARD: FaqSource = {
  question: L(
    "Czy po montażu trzeba wykańczać wnętrza?",
    "Do the interiors need finishing after assembly?",
    "Muss der Innenraum nach der Montage noch ausgebaut werden?",
    "Moet het interieur na de montage nog worden afgewerkt?",
  ),
  answer: L(
    "W standardzie z wykończeniem wnętrz ściany i strop są wykończone deską boazeryjną lub płytą G-K, a podłoga ma suchy jastrych, więc nie trzeba ich wykańczać. W stanie surowym zamkniętym (SSZ) tych prac nie ma w cenie.",
    "In the finished-interior standard the walls and ceiling are finished with tongue-and-groove boards or plasterboard and the floor has a dry screed, so they need no further finishing. In the closed-shell state (SSZ) this work is not included in the price.",
    "Beim Standard mit Innenausbau sind Wände und Decke mit Profilholz oder Gipskartonplatten verkleidet und der Boden hat einen Trockenestrich, sodass kein weiterer Ausbau nötig ist. Beim Rohbau geschlossen (SSZ) sind diese Arbeiten nicht im Preis enthalten.",
    "Bij de afbouwstandaard zijn wanden en plafond afgewerkt met profielplanken of gipsplaten en heeft de vloer een droge dekvloer, zodat verdere afwerking niet nodig is. Bij casco dicht (SSZ) zijn deze werkzaamheden niet in de prijs inbegrepen.",
  ),
};

const FAQ_FINISH_LOG: FaqSource = {
  question: FAQ_FINISH_STANDARD.question,
  answer: L(
    "W technologii producenta nie ma potrzeby wykańczania ścian, podłóg ani sufitów. Wygłuszenie stropu jest dostępne jako opcja.",
    "In the producer's technology there is no need to finish the walls, floors or ceilings. Sound-deadening of the ceiling is available as an option.",
    "In der Technologie des Herstellers müssen Wände, Böden und Decken nicht ausgebaut werden. Die Schalldämmung der Decke ist als Option erhältlich.",
    "Met de technologie van de producent hoeven wanden, vloeren en plafonds niet te worden afgewerkt. Geluiddemping van het plafond is als optie beschikbaar.",
  ),
};

const FAQ_FINISH_VIKING: FaqSource = {
  question: FAQ_FINISH_STANDARD.question,
  answer: L(
    "W stanie deweloperskim podłoga ma suchy jastrych, a ściany i sufity są wykończone płytą G-K Riduro (bez szpachlowania). W stanie surowym zamkniętym wnętrza wykańcza inwestor.",
    "In the developer standard the floor has a dry screed and the walls and ceilings are finished with G-K Riduro plasterboard (without skim coat). In the closed-shell state the investor finishes the interior.",
    "Im Bauträgerstandard hat der Boden einen Trockenestrich, und Wände und Decken sind mit G-K-Riduro-Gipskartonplatten (ohne Spachtelung) verkleidet. Beim Rohbau geschlossen baut der Bauherr den Innenraum selbst aus.",
    "In de ontwikkelaarsstandaard heeft de vloer een droge dekvloer en zijn wanden en plafonds afgewerkt met G-K Riduro-gipsplaten (zonder stucwerk). Bij casco dicht werkt de opdrachtgever het interieur zelf af.",
  ),
};

function faqScope(serviceScope: L10n): FaqSource {
  return {
    question: L(
      "Co obejmuje zakres prac producenta?",
      "What does the producer's scope of work cover?",
      "Was umfasst der Leistungsumfang des Herstellers?",
      "Wat omvat het werkpakket van de producent?",
    ),
    answer: serviceScope,
  };
}

const REQ_STANDARD: ClientRequirementSource[] = [
  { key: "dojazd-dla-transportu" },
  { key: "miejsce-dla-dzwigu" },
  { key: "formalnosci" },
];

const REQ_IMPREGNATION: ClientRequirementSource = {
  key: "formalnosci",
  custom: L(
    "Impregnacja zewnętrzna budynku we własnym zakresie lub zlecona firmie",
    "External impregnation of the building, done by the investor or commissioned from a company",
    "Außenimprägnierung des Gebäudes in Eigenleistung oder durch eine beauftragte Firma",
    "Externe impregnering van het gebouw, door de opdrachtgever zelf of door een ingeschakeld bedrijf",
  ),
};

// ---------------------------------------------------------------------------
// Opcje (dopłaty) wspólne dla serii
// ---------------------------------------------------------------------------

const OPT = {
  canopy: (price: number): OptionSource => ({
    label: L("Zadaszenie nad wejściem", "Canopy over the entrance", "Überdachung über dem Eingang", "Overkapping boven de ingang"),
    pricePln: price,
  }),
  windingStairs: (price: number): OptionSource => ({
    label: L("Schody zabiegowe", "Winder stairs", "Gewendelte Treppe", "Trap met kwartslagen"),
    pricePln: price,
  }),
  straightStairs: (price: number): OptionSource => ({
    label: L("Schody proste (techniczne), dla wersji Lord Plus", "Straight (technical) stairs, for the Lord Plus version", "Gerade (technische) Treppe, für die Version Lord Plus", "Rechte (technische) trap, voor de versie Lord Plus"),
    pricePln: price,
  }),
  rodentNet: (price: number): OptionSource => ({
    label: L("Siatka przeciw gryzoniom", "Anti-rodent mesh", "Nagetierschutzgitter", "Knaagdierenbestendig gaas"),
    pricePln: price,
  }),
  roofTiles: (price: number): OptionSource => ({
    label: L(
      "Dachówka ceramiczna w kolorze antracyt mat",
      "Ceramic roof tiles in matt anthracite",
      "Keramische Dachziegel in Anthrazit matt",
      "Keramische dakpannen in mat antraciet",
    ),
    pricePln: price,
  }),
  shouSugiBan: (price: number): OptionSource => ({
    label: L(
      "Deska elewacyjna opalana japońską metodą Shou Sugi Ban",
      "Cladding boards charred with the Japanese Shou Sugi Ban method",
      "Fassadenbretter, nach der japanischen Shou-Sugi-Ban-Methode verkohlt",
      "Gevelplanken verkoold volgens de Japanse Shou Sugi Ban-methode",
    ),
    pricePln: price,
  }),
  deadening: (price: number): OptionSource => ({
    label: L("Wygłuszenie stropu", "Sound-deadening of the ceiling", "Schalldämmung der Decke", "Geluiddemping van het plafond"),
    pricePln: price,
  }),
};

const GRP = {
  entrance: (options: OptionSource[]): OptionGroupSource => ({
    name: L("Wejście i schody", "Entrance and stairs", "Eingang und Treppen", "Ingang en trappen"),
    selectionType: "multi",
    options,
  }),
  foundationMulti: (options: OptionSource[]): OptionGroupSource => ({
    name: L("Fundament i zabezpieczenie", "Foundation and protection", "Fundament und Schutz", "Fundering en bescherming"),
    selectionType: "multi",
    options,
  }),
  roof: (options: OptionSource[]): OptionGroupSource => ({
    name: L("Pokrycie dachu", "Roof covering", "Dachdeckung", "Dakbedekking"),
    selectionType: "multi",
    options,
  }),
  facade: (options: OptionSource[]): OptionGroupSource => ({
    name: L("Elewacja", "Façade", "Fassade", "Gevel"),
    selectionType: "multi",
    options,
  }),
  recuperation: (pricePln: number, set: L10n): OptionGroupSource => ({
    name: L("Rekuperacja", "Heat recovery ventilation", "Wärmerückgewinnungslüftung", "Warmteterugwinning"),
    selectionType: "multi",
    options: [{ label: set, pricePln }],
  }),
  terrace: (options: OptionSource[]): OptionGroupSource => ({
    name: L("Taras", "Terrace", "Terrasse", "Terras"),
    selectionType: "single",
    options: [
      {
        label: L("Bez tarasu", "No terrace", "Ohne Terrasse", "Geen terras"),
        pricePln: 0,
        isDefault: true,
      },
      ...options,
    ],
  }),
};

const facadePaintLabel = (pl: string, en: string, de: string, nl: string): OptionSource["label"] => L(pl, en, de, nl);

const REKUP_SET_BINGO = L(
  "Rekuperacja decentralna: 2 × VENTO Expert DUO A30-1 S10 W V.2, 4 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentralised heat recovery ventilation: 2 × VENTO Expert DUO A30-1 S10 W V.2, 4 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Dezentrale Wärmerückgewinnung: 2 × VENTO Expert DUO A30-1 S10 W V.2, 4 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentrale warmteterugwinning: 2 × VENTO Expert DUO A30-1 S10 W V.2, 4 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
);
const REKUP_SET_M67 = L(
  "Rekuperacja decentralna: 1 × VENTO Expert DUO A30-1 S10 W V.2, 2 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentralised heat recovery ventilation: 1 × VENTO Expert DUO A30-1 S10 W V.2, 2 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Dezentrale Wärmerückgewinnung: 1 × VENTO Expert DUO A30-1 S10 W V.2, 2 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentrale warmteterugwinning: 1 × VENTO Expert DUO A30-1 S10 W V.2, 2 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
);
const REKUP_SET_M84 = L(
  "Rekuperacja decentralna: 1 × VENTO Expert DUO A30-1 S10 W V.2, 3 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentralised heat recovery ventilation: 1 × VENTO Expert DUO A30-1 S10 W V.2, 3 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Dezentrale Wärmerückgewinnung: 1 × VENTO Expert DUO A30-1 S10 W V.2, 3 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
  "Decentrale warmteterugwinning: 1 × VENTO Expert DUO A30-1 S10 W V.2, 3 × VENTO Expert A100-1 S10 W V.2, 1 × Freshpoint 200-E Pro",
);

// ---------------------------------------------------------------------------
// Zakres prac (wspólne zdania per seria)
// ---------------------------------------------------------------------------

const SCOPE_FEET = L(
  "Zakres prac obejmuje montaż domu, montaż stóp fundamentowych, wykonanie izolacji termicznej ścian zewnętrznych, podłogi i dachu, położenie paneli dachowych na rąbek lub blachodachówki, orynnowanie, montaż stolarki okiennej i drzwi zewnętrznych, rozprowadzenie instalacji elektrycznej i wodno-kanalizacyjnej oraz wykonanie elewacji.",
  "The scope of work includes assembling the house, installing the foundation pads, insulating the external walls, floor and roof, laying standing-seam roof panels or metal roof tiles, guttering, installing the windows and external doors, running the electrical and water and sewage installations, and finishing the façade.",
  "Der Leistungsumfang umfasst die Montage des Hauses, die Montage der Punktfundamente, die Wärmedämmung von Außenwänden, Boden und Dach, die Dachdeckung mit Stehfalzpaneelen oder Blechdachziegeln, die Dachrinnen, den Einbau von Fenstern und Außentüren, die Elektro- und die Wasser-/Abwasserinstallation sowie die Ausführung der Fassade.",
  "Het werkpakket omvat de montage van het huis, de montage van de funderingspoeren, de thermische isolatie van buitenwanden, vloer en dak, het leggen van liggende-felspanelen of metalen dakpannen, de dakgoten, de montage van ramen en buitendeuren, het aanleggen van de elektrische en de water- en rioolinstallatie en de uitvoering van de gevel.",
);

const SCOPE_FEET_BLACHA = L(
  "Zakres prac obejmuje montaż domu, montaż stóp fundamentowych, wykonanie izolacji termicznej ścian zewnętrznych, podłogi i dachu, położenie blachodachówki, orynnowanie, montaż stolarki okiennej i drzwi zewnętrznych, rozprowadzenie instalacji elektrycznej i wodno-kanalizacyjnej oraz wykonanie elewacji.",
  "The scope of work includes assembling the house, installing the foundation pads, insulating the external walls, floor and roof, laying metal roof tiles, guttering, installing the windows and external doors, running the electrical and water and sewage installations, and finishing the façade.",
  "Der Leistungsumfang umfasst die Montage des Hauses, die Montage der Punktfundamente, die Wärmedämmung von Außenwänden, Boden und Dach, die Dachdeckung mit Blechdachziegeln, die Dachrinnen, den Einbau von Fenstern und Außentüren, die Elektro- und die Wasser-/Abwasserinstallation sowie die Ausführung der Fassade.",
  "Het werkpakket omvat de montage van het huis, de montage van de funderingspoeren, de thermische isolatie van buitenwanden, vloer en dak, het leggen van metalen dakpannen, de dakgoten, de montage van ramen en buitendeuren, het aanleggen van de elektrische en de water- en rioolinstallatie en de uitvoering van de gevel.",
);

const SCOPE_COLD_SLAB = L(
  "Zakres prac obejmuje montaż domu, położenie zimnej płyty fundamentowej, wykonanie izolacji termicznej ścian zewnętrznych, podłogi i dachu, położenie paneli dachowych na rąbek lub blachodachówki, orynnowanie, montaż stolarki okiennej i drzwi zewnętrznych, rozprowadzenie instalacji elektrycznej i wodno-kanalizacyjnej oraz wykonanie elewacji.",
  "The scope of work includes assembling the house, laying the uninsulated foundation slab, insulating the external walls, floor and roof, laying standing-seam roof panels or metal roof tiles, guttering, installing the windows and external doors, running the electrical and water and sewage installations, and finishing the façade.",
  "Der Leistungsumfang umfasst die Montage des Hauses, das Verlegen der kalten Fundamentplatte, die Wärmedämmung von Außenwänden, Boden und Dach, die Dachdeckung mit Stehfalzpaneelen oder Blechdachziegeln, die Dachrinnen, den Einbau von Fenstern und Außentüren, die Elektro- und die Wasser-/Abwasserinstallation sowie die Ausführung der Fassade.",
  "Het werkpakket omvat de montage van het huis, het leggen van de niet-geïsoleerde funderingsplaat, de thermische isolatie van buitenwanden, vloer en dak, het leggen van liggende-felspanelen of metalen dakpannen, de dakgoten, de montage van ramen en buitendeuren, het aanleggen van de elektrische en de water- en rioolinstallatie en de uitvoering van de gevel.",
);

const SCOPE_FINEZJA = L(
  "Zakres prac obejmuje montaż domu, montaż stóp fundamentowych, wykonanie izolacji termicznej ścian zewnętrznych, podłogi i dachu, położenie paneli dachowych na rąbek, montaż stolarki okiennej i drzwi zewnętrznych, rozprowadzenie instalacji elektrycznej i wodno-kanalizacyjnej oraz wykonanie elewacji.",
  "The scope of work includes assembling the house, installing the foundation pads, insulating the external walls, floor and roof, laying standing-seam roof panels, installing the windows and external doors, running the electrical and water and sewage installations, and finishing the façade.",
  "Der Leistungsumfang umfasst die Montage des Hauses, die Montage der Punktfundamente, die Wärmedämmung von Außenwänden, Boden und Dach, die Dachdeckung mit Stehfalzpaneelen, den Einbau von Fenstern und Außentüren, die Elektro- und die Wasser-/Abwasserinstallation sowie die Ausführung der Fassade.",
  "Het werkpakket omvat de montage van het huis, de montage van de funderingspoeren, de thermische isolatie van buitenwanden, vloer en dak, het leggen van liggende-felspanelen, de montage van ramen en buitendeuren, het aanleggen van de elektrische en de water- en rioolinstallatie en de uitvoering van de gevel.",
);

const SCOPE_VIKING = L(
  "Cena obejmuje płytę fundamentową izolowaną poziomo i pionowo płytami XPS, zbrojoną, z instalacjami, w pełni wykończony dom z zewnątrz, instalacje elektryczne i wodno-kanalizacyjne oraz zadaszenie wejścia.",
  "The price covers a reinforced foundation slab insulated horizontally and vertically with XPS boards and fitted with utility lines, a house fully finished on the outside, the electrical and the water and sewage installations, and a canopy over the entrance.",
  "Der Preis umfasst eine bewehrte, horizontal und vertikal mit XPS-Platten gedämmte Fundamentplatte mit Installationen, ein außen komplett fertiggestelltes Haus, die Elektro- sowie die Wasser-/Abwasserinstallation und eine Eingangsüberdachung.",
  "De prijs omvat een gewapende funderingsplaat, horizontaal en verticaal met XPS-platen geïsoleerd en voorzien van leidingen, een aan de buitenzijde volledig afgewerkt huis, de elektrische en de water- en rioolinstallatie en een overkapping van de ingang.",
);

// ---------------------------------------------------------------------------
// Konstrukcja, dach, fundament (opisy techniczne)
// ---------------------------------------------------------------------------

const CONSTRUCTION_C24 = L(
  "Szkielet drewniany z drewna konstrukcyjnego klasy C24 (słupy 45 × 145 mm), ściany ocieplone wełną mineralną 150 + 50 mm, dach 200 + 50 mm",
  "Timber frame of C24 structural timber (45 × 145 mm studs), walls insulated with 150 + 50 mm mineral wool, roof 200 + 50 mm",
  "Holzrahmen aus Konstruktionsholz der Klasse C24 (Ständer 45 × 145 mm), Wände mit 150 + 50 mm Mineralwolle gedämmt, Dach 200 + 50 mm",
  "Houtskelet van constructiehout klasse C24 (stijlen 45 × 145 mm), wanden geïsoleerd met 150 + 50 mm minerale wol, dak 200 + 50 mm",
);
const CONSTRUCTION_LOG = L(
  "Szkielet drewniany z drewna konstrukcyjnego klasy C24 (baliki 42 × 135 mm, ruszt 42 × 150 mm), ściany ocieplone wełną mineralną 150 mm, dach 200 mm",
  "Timber frame of C24 structural timber (42 × 135 mm joists, 42 × 150 mm battens), walls insulated with 150 mm mineral wool, roof 200 mm",
  "Holzrahmen aus Konstruktionsholz der Klasse C24 (Balken 42 × 135 mm, Lattung 42 × 150 mm), Wände mit 150 mm Mineralwolle gedämmt, Dach 200 mm",
  "Houtskelet van constructiehout klasse C24 (balken 42 × 135 mm, regelwerk 42 × 150 mm), wanden geïsoleerd met 150 mm minerale wol, dak 200 mm",
);
const CONSTRUCTION_VIKING = L(
  "Szkielet drewniany z drewna konstrukcyjnego KVH / klasy C24 (45 × 145 mm), ściany ocieplone wełną 150 + 50 mm, dach 200 + 50 mm",
  "Timber frame of KVH / C24 structural timber (45 × 145 mm), walls insulated with 150 + 50 mm wool, roof 200 + 50 mm",
  "Holzrahmen aus Konstruktionsholz KVH / Klasse C24 (45 × 145 mm), Wände mit 150 + 50 mm Wolle gedämmt, Dach 200 + 50 mm",
  "Houtskelet van constructiehout KVH / klasse C24 (45 × 145 mm), wanden geïsoleerd met 150 + 50 mm wol, dak 200 + 50 mm",
);

const FOUNDATION_STANDARD = L(
  "W cenie stopy fundamentowe (podłoga na fundamencie punktowym, U = 0,184 W/(m²·K)). Opcjonalnie płyta fundamentowa w pełni izolowana (U = 0,180 W/(m²·K)) lub płyta przy posadzce betonowej po stronie inwestora.",
  "Foundation pads are included in the price (floor on a point foundation, U = 0.184 W/(m²·K)). A fully insulated foundation slab (U = 0.180 W/(m²·K)) or a slab with a concrete floor provided by the investor is optional.",
  "Punktfundamente sind im Preis enthalten (Boden auf Punktfundament, U = 0,184 W/(m²·K)). Optional ist eine voll gedämmte Fundamentplatte (U = 0,180 W/(m²·K)) oder eine Platte mit Betonboden durch den Bauherrn.",
  "Funderingspoeren zijn bij de prijs inbegrepen (vloer op puntfundering, U = 0,184 W/(m²·K)). Optioneel is een volledig geïsoleerde funderingsplaat (U = 0,180 W/(m²·K)) of een plaat met betonvloer door de opdrachtgever.",
);
const FOUNDATION_COLD_SLAB = L(
  "W cenie zimna płyta fundamentowa. Dopłata do płyty fundamentowej w pełni izolowanej (U = 0,180 W/(m²·K)); podłoga na fundamencie punktowym ma U = 0,184 W/(m²·K).",
  "An uninsulated foundation slab is included in the price. A surcharge applies for a fully insulated slab (U = 0.180 W/(m²·K)); a floor on a point foundation has U = 0.184 W/(m²·K).",
  "Eine kalte Fundamentplatte ist im Preis enthalten. Für eine voll gedämmte Platte (U = 0,180 W/(m²·K)) fällt ein Aufpreis an; ein Boden auf Punktfundament hat U = 0,184 W/(m²·K).",
  "Een niet-geïsoleerde funderingsplaat is bij de prijs inbegrepen. Voor een volledig geïsoleerde plaat (U = 0,180 W/(m²·K)) geldt een toeslag; een vloer op puntfundering heeft U = 0,184 W/(m²·K).",
);
const FOUNDATION_LOG = L(
  "W cenie stopy fundamentowe. Opcjonalnie płyta fundamentowa zimna lub w pełni izolowana.",
  "Foundation pads are included in the price. An uninsulated or a fully insulated foundation slab is optional.",
  "Punktfundamente sind im Preis enthalten. Optional ist eine kalte oder eine voll gedämmte Fundamentplatte.",
  "Funderingspoeren zijn bij de prijs inbegrepen. Optioneel is een niet-geïsoleerde of een volledig geïsoleerde funderingsplaat.",
);
const FOUNDATION_VIKING = L(
  "Płyta fundamentowa zbrojona 200 mm, izolowana poziomo i pionowo XPS 100 mm, z instalacjami, na piasku zagęszczonym warstwami 300–400 mm, w cenie. Dopłata za podłogę z suchym jastrychem w stanie deweloperskim jest już uwzględniona w cenie tego standardu.",
  "A reinforced 200 mm foundation slab, insulated horizontally and vertically with 100 mm XPS and fitted with utility lines, on sand compacted in layers of 300–400 mm, is included in the price. The dry-screed floor in the developer standard is already included in the price of that standard.",
  "Eine bewehrte Fundamentplatte von 200 mm, horizontal und vertikal mit 100 mm XPS gedämmt und mit Installationen, auf in Lagen von 300–400 mm verdichtetem Sand, ist im Preis enthalten. Der Trockenestrich im Bauträgerstandard ist im Preis dieses Standards bereits berücksichtigt.",
  "Een gewapende funderingsplaat van 200 mm, horizontaal en verticaal geïsoleerd met 100 mm XPS en voorzien van leidingen, op in lagen van 300–400 mm verdicht zand, is bij de prijs inbegrepen. De droge dekvloer in de ontwikkelaarsstandaard is al in de prijs van die standaard opgenomen.",
);

function roofText(args: { slope: number; ridge?: string }): L10n {
  const { slope, ridge } = args;
  const extraPl = ridge ? `, wysokość do kalenicy ${ridge}` : "";
  const extraEn = ridge ? `, ridge height ${ridge.replace(",", ".")}` : "";
  const extraDe = ridge ? `, Firsthöhe ${ridge}` : "";
  const extraNl = ridge ? `, nokhoogte ${ridge}` : "";
  return L(
    `Dwuspadowy, nachylenie ${slope}°${extraPl}; pokrycie: panel na rąbek stojący lub blachodachówka`,
    `Gable roof, ${slope}° pitch${extraEn}; covering: standing-seam panels or metal roof tiles`,
    `Satteldach, ${slope}° Neigung${extraDe}; Deckung: Stehfalzpaneele oder Blechdachziegel`,
    `Zadeldak, ${slope}° helling${extraNl}; dekking: liggende-felspanelen of metalen dakpannen`,
  );
}

// ---------------------------------------------------------------------------
// Zakres wariantów (cena) per seria
// ---------------------------------------------------------------------------

function devScope(args: {
  foundation: [string, string, string, string];
  roofWindows?: [string, string, string, string];
  electric: number;
  plumbing: number;
}): L10n {
  const { foundation, roofWindows, electric, plumbing } = args;
  const win = roofWindows ?? ["", "", "", ""];
  return L(
    `Standard z wykończeniem wnętrz: dom w pełni wykonany z zewnątrz, ${foundation[0]}, wygłuszenie stropu, podłoga pokryta suchym jastrychem, ściany i strop wykończone deską boazeryjną lub płytą G-K, schody tymczasowe, ${win[0] ? `${win[0]}, ` : ""}instalacja elektryczna (${electric} punktów) i wodno-kanalizacyjna (${plumbing} punktów).`,
    `Finished-interior standard: the house is fully completed on the outside, with ${foundation[1]}, sound-deadening of the ceiling, a floor covered with dry screed, walls and ceiling finished with tongue-and-groove boards or plasterboard, temporary stairs, ${win[1] ? `${win[1]}, ` : ""}and electrical (${electric} points) and water and sewage (${plumbing} points) installations.`,
    `Standard mit Innenausbau: Das Haus ist außen komplett fertiggestellt, mit ${foundation[2]}, Schalldämmung der Decke, Trockenestrich im Boden, Wänden und Decke aus Profilholz oder Gipskartonplatten, provisorischer Treppe, ${win[2] ? `${win[2]}, ` : ""}sowie Elektro- (${electric} Punkte) und Wasser-/Abwasserinstallation (${plumbing} Punkte).`,
    `Afbouwstandaard met afgewerkt interieur: het huis is aan de buitenzijde volledig afgewerkt, met ${foundation[3]}, geluiddemping van het plafond, een vloer met droge dekvloer, wanden en plafond afgewerkt met profielplanken of gipsplaten, een tijdelijke trap, ${win[3] ? `${win[3]}, ` : ""}en elektrische (${electric} punten) en water- en rioolinstallaties (${plumbing} punten).`,
  );
}

const FEET_PHRASE: [string, string, string, string] = [
  "stopy fundamentowe",
  "foundation pads",
  "Punktfundamenten",
  "funderingspoeren",
];
const COLD_SLAB_PHRASE: [string, string, string, string] = [
  "zimna płyta fundamentowa",
  "an uninsulated foundation slab",
  "kalter Fundamentplatte",
  "een niet-geïsoleerde funderingsplaat",
];
const TWO_ROOF_WINDOWS: [string, string, string, string] = ["dwa okna połaciowe", "two roof windows", "zwei Dachfenstern", "twee dakramen"];
const BATH_ROOF_WINDOW: [string, string, string, string] = [
  "okno połaciowe w łazience na poddaszu",
  "a roof window in the attic bathroom",
  "einem Dachfenster im Bad im Dachgeschoss",
  "een dakraam in de badkamer op zolder",
];

const SSZ_SCOPE = L(
  "Stan surowy zamknięty (SSZ): zakres jak w standardzie z wykończeniem wnętrz, bez podłogi z suchego jastrychu oraz bez wykończenia ścian i sufitów deską boazeryjną lub płytą G-K.",
  "Closed shell (SSZ): the same scope as the finished-interior standard, but without the dry-screed floor and without finishing the walls and ceilings with tongue-and-groove boards or plasterboard.",
  "Rohbau geschlossen (SSZ): Leistungsumfang wie beim Standard mit Innenausbau, jedoch ohne Trockenestrich und ohne Wand- und Deckenverkleidung aus Profilholz oder Gipskartonplatten.",
  "Casco dicht (SSZ): hetzelfde pakket als de afbouwstandaard, maar zonder droge dekvloer en zonder afwerking van wanden en plafonds met profielplanken of gipsplaten.",
);

const EXCLUDED_DEV = L(
  "Transport, dźwig do miejsca montażu i projekt architektoniczno-budowlany.",
  "Transport, a crane at the assembly site and the architectural and building design.",
  "Transport, ein Kran am Montageort und die Architektur- und Bauplanung.",
  "Transport, een kraan op de montagelocatie en het architectonisch en bouwkundig ontwerp.",
);
const EXCLUDED_SSZ = L(
  "Podłoga z suchego jastrychu, wykończenie ścian i sufitów deską boazeryjną lub płytą G-K, transport, dźwig do miejsca montażu i projekt architektoniczno-budowlany.",
  "The dry-screed floor, finishing of walls and ceilings with tongue-and-groove boards or plasterboard, transport, a crane at the assembly site and the architectural and building design.",
  "Trockenestrich, Wand- und Deckenverkleidung aus Profilholz oder Gipskartonplatten, Transport, ein Kran am Montageort und die Architektur- und Bauplanung.",
  "De droge dekvloer, afwerking van wanden en plafonds met profielplanken of gipsplaten, transport, een kraan op de montagelocatie en het architectonisch en bouwkundig ontwerp.",
);

function twoVariants(args: {
  devPricePln: number;
  sszPricePln: number;
  devScopeText: L10n;
  foundation: L10n;
  envelope: L10n[];
  extras?: L10n[];
}): VariantSource[] {
  const { devPricePln, sszPricePln, devScopeText, foundation, envelope, extras } = args;
  return [
    {
      standard: "surowy-zamkniety",
      pricePln: sszPricePln,
      isDefault: false,
      scopeSummary: SSZ_SCOPE,
      excludedScope: EXCLUDED_SSZ,
      costItems: buildCostItems({ standard: "surowy-zamkniety", foundation, envelope, extras }),
    },
    {
      standard: "deweloperski",
      pricePln: devPricePln,
      isDefault: true,
      scopeSummary: devScopeText,
      excludedScope: EXCLUDED_DEV,
      costItems: buildCostItems({ standard: "deweloperski", foundation, envelope, extras }),
    },
  ];
}

// Dwie dane techniczne wspólne (szkielet C24, U ściany 0,195 / dachu 0,148 / podłogi 0,180-0,184).
const SPECS_COMMON = {
  wallBuildUp:
    "Deska elewacyjna 20 mm na wentylowanej szczelinie (łaty 25 × 40 mm), membrana wiatroizolacyjna, płyta MFP 12 mm, wełna mineralna 150 mm λ = 0,033 W/(mK), konstrukcja słupowa C24 45 × 145 mm, membrana paroszczelna, wełna mineralna 50 mm w ruszcie instalacyjnym 40 × 60 mm, wykończenie deską boazeryjną lub płytą G-K Riduro. Współczynnik przenikania ciepła ściany Uc = 0,195 W/(m²·K).",
  insulation:
    "Wełna mineralna: ściany 150 + 50 mm, dach 200 + 50 mm (Uc = 0,148 W/(m²·K)), strop 150 mm, podłoga 150 mm; płyta fundamentowa z EPS grafitowym 50 mm i XPS 100 mm (Uc = 0,180 W/(m²·K)) lub podłoga na stopach (Uc = 0,184 W/(m²·K)).",
};

const HEAT_OTHER = "Źródło ciepła nie jest określone w ofercie producenta.";

const specsBingoFamilio = (windowClass: string): TechnicalSpecsSource => ({
  ...SPECS_COMMON,
  windowClass,
  ventilation: "grawitacyjna",
  heatSource: "inne",
  heatSourceOther: HEAT_OTHER,
});

const SPECS_LOG: TechnicalSpecsSource = {
  wallBuildUp:
    "Baliki drewniane 42 × 135 mm, membrana wysokoparoprzepuszczalna, ruszt drewniany 42 × 150 mm, wełna mineralna 150 mm λ = 0,033 W/(mK), membrana, łaty 25 × 45 mm, deska elewacyjna 20 mm, łata stalowa perforowana przeciwgryzoniowa.",
  insulation: "Wełna mineralna: podłoga 150 mm, dach 200 mm, ściany 150 mm (λ = 0,033 W/(mK)).",
  windowClass: "Stolarka okienna trzyszybowa w kolorze białym; drzwi zewnętrzne spełniające parametry budynku mieszkalnego.",
  ventilation: "inna",
  ventilationOther: "Brak danych w ofercie.",
  heatSource: "inne",
  heatSourceOther: HEAT_OTHER,
};

// ---------------------------------------------------------------------------
// BINGO PIĘTROWY Perfeco (oferta s. 1-28)
// ---------------------------------------------------------------------------

const bingoPlans = (version: string) => [
  { file: plan(`bingo-${version}-parter`), floorLevel: "parter" as const },
  { file: plan(`bingo-${version}-pietro`), floorLevel: "pietro" as const },
];

// Układ wnętrz każdej wersji: tabele "Zestawienie pomieszczeń" z oferty Bingo Perfeco, s. 3-10
// (powierzchnia użytkowa). Metraż = suma parteru i piętra: 55,04 + 27,05, 55,68 + 35,37, 55,81 + 27,05.
const BINGO_V2_ROOMS: RoomSource[] = [
  room(ROOM.wiatrolap, 2.4, "parter"),
  room(ROOM.korytarz, 7.19, "parter"),
  room(ROOM.techniczne, 5.34, "parter"),
  room(ROOM.garderoba, 3.91, "parter"),
  room(ROOM.pokoj, 9.62, "parter"),
  room(ROOM.lazienka, 3.48, "parter"),
  room(ROOM.gospodarcze, 1.25, "parter"),
  room(ROOM.salonAneks, 22.49, "parter"),
  room(ROOM.korytarz, 5.75, "pietro"),
  room(ROOM.pokoj, 12.87, "pietro"),
  room(ROOM.lazienka, 1.83, "pietro"),
  room(ROOM.pokoj, 8.08, "pietro"),
  room(ROOM.pokoj, 6.84, "pietro"),
];

const BINGO_V3_ROOMS: RoomSource[] = [
  room(ROOM.wiatrolap, 2.4, "parter"),
  room(ROOM.korytarz, 9.02, "parter"),
  room(ROOM.pokoj, 9.23, "parter"),
  room(ROOM.pokoj, 9.24, "parter"),
  room(ROOM.lazienka, 2.95, "parter"),
  room(ROOM.salonAneks, 22.67, "parter"),
  room(ROOM.korytarz, 3.02, "pietro"),
  room(ROOM.pokoj, 9.11, "pietro"),
  room(ROOM.lazienka, 3.22, "pietro"),
  room(ROOM.pokoj, 11.7, "pietro"),
];

const BINGO_LAYOUT_GROUP: OptionGroupSource = {
  name: L("Wersja układu wnętrz", "Interior layout version", "Variante der Raumaufteilung", "Versie van de indeling"),
  selectionType: "single",
  options: [
    {
      label: L(
        "Wersja podstawowa: cztery pokoje, dwie łazienki, salon z aneksem kuchennym",
        "Base version: four rooms, two bathrooms, living room with kitchenette",
        "Basisversion: vier Zimmer, zwei Bäder, Wohnzimmer mit Küchenzeile",
        "Basisversie: vier kamers, twee badkamers, woonkamer met keukenhoek",
      ),
      pricePln: 0,
      isDefault: true,
      layout: {
        key: "bingo-podstawowa",
        floorAreaM2: 82.09,
        description: null,
        rooms: [],
        plans: bingoPlans("podstawowa"),
      },
    },
    {
      label: L(
        "Wersja 1: dodatkowe okno 180 × 220 cm na parterze",
        "Version 1: an additional 180 × 220 cm window on the ground floor",
        "Version 1: zusätzliches Fenster 180 × 220 cm im Erdgeschoss",
        "Versie 1: een extra raam van 180 × 220 cm op de begane grond",
      ),
      pricePln: 5200,
      layout: {
        key: "bingo-wersja-1",
        floorAreaM2: 82.09,
        description: L(
          "Układ pomieszczeń jak w wersji podstawowej, z dodatkowym oknem 180 × 220 cm na parterze.",
          "The same room layout as the base version, with an additional 180 × 220 cm window on the ground floor.",
          "Raumaufteilung wie in der Basisversion, mit einem zusätzlichen Fenster 180 × 220 cm im Erdgeschoss.",
          "Dezelfde indeling als de basisversie, met een extra raam van 180 × 220 cm op de begane grond.",
        ),
        rooms: [],
        plans: bingoPlans("wersja1"),
      },
    },
    {
      label: L(
        "Wersja 2: trzy sypialnie na poddaszu i poszerzony korytarz, na parterze pomieszczenie gospodarcze i garderoba zamiast jednej sypialni, wyższa ścianka kolankowa (99,5 cm) i dodatkowe okna",
        "Version 2: three bedrooms and a wider hallway upstairs, a utility room and a walk-in wardrobe instead of one bedroom downstairs, a higher knee wall (99.5 cm) and additional windows",
        "Version 2: drei Schlafzimmer und ein breiterer Flur im Obergeschoss, im Erdgeschoss Hauswirtschaftsraum und Ankleidezimmer statt eines Schlafzimmers, höherer Kniestock (99,5 cm) und zusätzliche Fenster",
        "Versie 2: drie slaapkamers en een bredere gang boven, beneden een bijkeuken en inloopkast in plaats van één slaapkamer, een hogere knieschot (99,5 cm) en extra ramen",
      ),
      pricePln: 40700,
      layout: {
        key: "bingo-wersja-2",
        floorAreaM2: 91.05,
        description: L(
          "Trzy pokoje na poddaszu i szerszy korytarz. Na parterze garderoba i pomieszczenie techniczne zamiast jednego z pokoi, do tego wyższa ścianka kolankowa (99,5 cm) i dodatkowe okna.",
          "Three rooms upstairs and a wider hallway. Downstairs, a walk-in wardrobe and a technical room instead of one of the rooms, plus a higher knee wall (99.5 cm) and additional windows.",
          "Drei Zimmer im Obergeschoss und ein breiterer Flur. Im Erdgeschoss Ankleidezimmer und Technikraum anstelle eines der Zimmer, dazu ein höherer Kniestock (99,5 cm) und zusätzliche Fenster.",
          "Drie kamers boven en een bredere gang. Beneden een inloopkast en een technische ruimte in plaats van een van de kamers, plus een hogere knieschot (99,5 cm) en extra ramen.",
        ),
        rooms: BINGO_V2_ROOMS,
        plans: bingoPlans("wersja2"),
      },
    },
    {
      label: L(
        "Wersja 3: poszerzony salon i brak pomieszczenia gospodarczego, dodatkowe okno 90 × 220 cm na parterze",
        "Version 3: an enlarged living room and no utility room, an additional 90 × 220 cm window on the ground floor",
        "Version 3: vergrößertes Wohnzimmer ohne Hauswirtschaftsraum, zusätzliches Fenster 90 × 220 cm im Erdgeschoss",
        "Versie 3: een vergrote woonkamer zonder bijkeuken, een extra raam van 90 × 220 cm op de begane grond",
      ),
      pricePln: 4300,
      layout: {
        key: "bingo-wersja-3",
        floorAreaM2: 82.86,
        description: L(
          "Szerszy salon z aneksem kuchennym i korytarz na parterze, mniejsza łazienka, bez pomieszczenia gospodarczego. Dodatkowe okno 90 × 220 cm na parterze.",
          "A wider living room with kitchenette and a wider hallway on the ground floor, a smaller bathroom, no utility room. An additional 90 × 220 cm window on the ground floor.",
          "Breiteres Wohnzimmer mit Küchenzeile und breiterer Flur im Erdgeschoss, kleineres Bad, kein Hauswirtschaftsraum. Zusätzliches Fenster 90 × 220 cm im Erdgeschoss.",
          "Een bredere woonkamer met keukenhoek en een bredere gang op de begane grond, een kleinere badkamer, geen bijkeuken. Een extra raam van 90 × 220 cm op de begane grond.",
        ),
        rooms: BINGO_V3_ROOMS,
        plans: bingoPlans("wersja3"),
      },
    },
  ],
};

const BINGO_ROOMS: RoomSource[] = [
  room(ROOM.wiatrolap, 2.4, "parter"),
  room(ROOM.korytarz, 7.19, "parter"),
  room(ROOM.pokoj, 9.64, "parter"),
  room(ROOM.pokoj, 9.59, "parter"),
  room(ROOM.lazienka, 3.48, "parter"),
  room(ROOM.gospodarcze, 1.25, "parter"),
  room(ROOM.salonAneks, 22.49, "parter"),
  room(ROOM.korytarz, 3.02, "pietro"),
  room(ROOM.pokoj, 9.11, "pietro"),
  room(ROOM.lazienka, 3.22, "pietro"),
  room(ROOM.pokoj, 11.7, "pietro"),
];

const ELEVATION_BINGO: Record<"A" | "B" | "C" | "D", L10n> = {
  A: L(
    "Elewacja A: jasna deska elewacyjna w kolorze drewna.",
    "Façade A: light cladding boards in a natural wood colour.",
    "Fassade A: helle Fassadenbretter in Holzfarbe.",
    "Gevel A: lichte gevelplanken in houtkleur.",
  ),
  B: L(
    "Elewacja B: deska palona metodą Shou Sugi Ban.",
    "Façade B: boards charred with the Shou Sugi Ban method.",
    "Fassade B: nach der Shou-Sugi-Ban-Methode verkohlte Bretter.",
    "Gevel B: planken verkoold volgens de Shou Sugi Ban-methode.",
  ),
  C: L(
    "Elewacja C: jasne płyty warstwowe, częściowo zadaszona elewacja z paneli na rąbek oraz deska elewacyjna na szczytach domu.",
    "Façade C: light sandwich panels, a partly covered façade of standing-seam panels and cladding boards on the gables.",
    "Fassade C: helle Sandwichplatten, teilweise überdachte Fassade aus Stehfalzpaneelen sowie Fassadenbretter an den Giebeln.",
    "Gevel C: lichte sandwichpanelen, een gedeeltelijk overdekte gevel van liggende-felspanelen en gevelplanken op de gevels.",
  ),
  D: L(
    "Elewacja D: jasna deska elewacyjna z częściowo zachodzącymi na elewację panelami na rąbek.",
    "Façade D: light cladding boards with standing-seam panels partly wrapping onto the façade.",
    "Fassade D: helle Fassadenbretter, teilweise mit auf die Fassade übergreifenden Stehfalzpaneelen.",
    "Gevel D: lichte gevelplanken met felspanelen die gedeeltelijk over de gevel doorlopen.",
  ),
};

function bingoDescription(model: "A" | "B" | "C" | "D"): L10n {
  const e = ELEVATION_BINGO[model];
  return L(
    `Dwukondygnacyjny dom całoroczny o powierzchni zabudowy 69,9 m² (11,39 × 6,11 m), z konstrukcją w całości z drewna konstrukcyjnego klasy C24. Cztery pokoje, dwie łazienki i salon z aneksem kuchennym na ok. 82 m² powierzchni użytkowej (103 m² po podłodze). Dwuspadowy dach pod kątem 40° i prosta bryła sprawiają, że dom odnajdzie się na większości działek. ${e.pl} Do wyboru cztery układy wnętrz (podstawowy i wersje 1–3) oraz stan surowy zamknięty lub standard z wykończeniem wnętrz.`,
    `Two-storey year-round house with a footprint of 69.9 m² (11.39 × 6.11 m), built entirely from C24 structural timber. Four rooms, two bathrooms and a living room with a kitchenette on about 82 m² of usable floor area (103 m² measured at floor level). The gable roof at 40° and the simple volume suit most plots. ${e.en} Four interior layouts (base and versions 1–3) are available, in a closed-shell or finished-interior standard.`,
    `Zweigeschossiges Ganzjahreshaus mit 69,9 m² Grundfläche (11,39 × 6,11 m), vollständig aus Konstruktionsholz der Klasse C24 gebaut. Vier Zimmer, zwei Bäder und ein Wohnzimmer mit Küchenzeile auf rund 82 m² Nutzfläche (103 m² Bodenfläche). Das Satteldach mit 40° Neigung und der einfache Baukörper passen auf die meisten Grundstücke. ${e.de} Zur Wahl stehen vier Raumaufteilungen (Basis sowie Versionen 1–3), wahlweise als Rohbau geschlossen oder im Standard mit Innenausbau.`,
    `Huis met twee bouwlagen voor het hele jaar, met een bebouwde oppervlakte van 69,9 m² (11,39 × 6,11 m), volledig gebouwd van constructiehout klasse C24. Vier kamers, twee badkamers en een woonkamer met keukenhoek op circa 82 m² bruikbare vloeroppervlakte (103 m² gemeten op vloerniveau). Het zadeldak van 40° en het eenvoudige volume passen op de meeste kavels. ${e.nl} Er zijn vier indelingen beschikbaar (basis en versies 1–3), naar keuze casco dicht of de afbouwstandaard met afgewerkt interieur.`,
  );
}

const BINGO_FAQ_VERSIONS: FaqSource = {
  question: L(
    "Czym różnią się wersje układu wnętrz?",
    "How do the interior layout versions differ?",
    "Wie unterscheiden sich die Varianten der Raumaufteilung?",
    "Hoe verschillen de versies van de indeling?",
  ),
  answer: L(
    "Wersja podstawowa ma cztery pokoje i dwie łazienki. Wersja 1 dodaje okno 180 × 220 cm na parterze (+5 200 zł netto). Wersja 2 daje trzy sypialnie na poddaszu, garderobę i pomieszczenie gospodarcze na parterze oraz wyższą ściankę kolankową (+40 700 zł netto). Wersja 3 poszerza salon i rezygnuje z pomieszczenia gospodarczego (+4 300 zł netto).",
    "The base version has four rooms and two bathrooms. Version 1 adds a 180 × 220 cm window on the ground floor (+PLN 5,200 net). Version 2 gives three bedrooms upstairs, a walk-in wardrobe and a utility room downstairs and a higher knee wall (+PLN 40,700 net). Version 3 widens the living room and drops the utility room (+PLN 4,300 net).",
    "Die Basisversion hat vier Zimmer und zwei Bäder. Version 1 ergänzt ein Fenster 180 × 220 cm im Erdgeschoss (+5.200 PLN netto). Version 2 bietet drei Schlafzimmer im Obergeschoss, Ankleidezimmer und Hauswirtschaftsraum im Erdgeschoss sowie einen höheren Kniestock (+40.700 PLN netto). Version 3 vergrößert das Wohnzimmer und verzichtet auf den Hauswirtschaftsraum (+4.300 PLN netto).",
    "De basisversie heeft vier kamers en twee badkamers. Versie 1 voegt een raam van 180 × 220 cm op de begane grond toe (+5.200 PLN netto). Versie 2 geeft drie slaapkamers boven, een inloopkast en een bijkeuken beneden en een hogere knieschot (+40.700 PLN netto). Versie 3 vergroot de woonkamer en laat de bijkeuken vervallen (+4.300 PLN netto).",
  ),
};

function bingo(args: {
  model: "A" | "B" | "C" | "D";
  devPricePln: number;
  sszPricePln: number;
  facadeGroup: OptionGroupSource | null;
  roofTiles: boolean;
  cover: string;
  extraPhotos: string[];
  pages: string;
}): LogbarProjectSource {
  const { model, devPricePln, sszPricePln, facadeGroup, roofTiles, cover, extraPhotos, pages } = args;
  const key = `bingo-${model.toLowerCase()}`;
  const interior = [
    raw("Bingo_Perfeco", "016-010"),
    raw("Bingo_Perfeco", "026-138"),
    raw("Bingo_Perfeco", "026-139"),
    raw("Bingo_Perfeco", "027-140"),
    raw("Bingo_Perfeco", "028-144"),
    raw("Bingo_Perfeco", "027-141"),
    raw("Bingo_Perfeco", "028-143"),
  ];
  const groups: OptionGroupSource[] = [BINGO_LAYOUT_GROUP];
  if (facadeGroup) groups.push(facadeGroup);
  groups.push(GRP.entrance([OPT.canopy(7000), OPT.windingStairs(13000)]));
  groups.push(
    GRP.foundationMulti([
      {
        label: L(
          "Płyta fundamentowa w pełni izolowana (zamiast stóp fundamentowych)",
          "Fully insulated foundation slab (instead of the foundation pads)",
          "Voll gedämmte Fundamentplatte (statt der Punktfundamente)",
          "Volledig geïsoleerde funderingsplaat (in plaats van de funderingspoeren)",
        ),
        pricePln: 25500,
      },
      OPT.rodentNet(3250),
    ]),
  );
  if (roofTiles) groups.push(GRP.roof([OPT.roofTiles(5500)]));
  groups.push(GRP.recuperation(11900, REKUP_SET_BINGO));
  const windowClass = "Stolarka okienna trzyszybowa w kolorze białym; stalowe drzwi zewnętrzne w kolorze grafitowym.";
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: `Logbar Bingo Piętrowy Perfeco ${model}`,
    builtUpAreaM2: 69.9,
    floorAreaM2: 82.09,
    externalDimensions: "11,39 × 6,11 m",
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    storeys: 2,
    description: bingoDescription(model),
    roofType: roofText({ slope: 40, ridge: "6,46 m" }),
    constructionSystem: CONSTRUCTION_C24,
    foundationOptions: FOUNDATION_STANDARD,
    customizationScope: L(
      "Cztery układy wnętrz (podstawowy i wersje 1–3), dopłaty za zadaszenie wejścia, schody zabiegowe, płytę fundamentową, rekuperację i wykończenie elewacji. Dopłata do ram okiennych w innym kolorze.",
      "Four interior layouts (base and versions 1–3), surcharges for an entrance canopy, winder stairs, a foundation slab, heat recovery ventilation and façade finishing. Surcharge for window frames in a different colour.",
      "Vier Raumaufteilungen (Basis sowie Versionen 1–3), Aufpreise für Eingangsüberdachung, gewendelte Treppe, Fundamentplatte, Wärmerückgewinnung und Fassadenausführung. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Vier indelingen (basis en versies 1–3), toeslagen voor een overkapping van de ingang, een trap met kwartslagen, een funderingsplaat, warmteterugwinning en gevelafwerking. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_FEET,
    technicalSpecs: specsBingoFamilio(windowClass),
    roomLayout: BINGO_ROOMS,
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_STANDARD, BINGO_FAQ_VERSIONS, FAQ_WINDOW_COLOUR, faqScope(SCOPE_FEET)],
    clientRequirements: REQ_STANDARD,
    variants: twoVariants({
      devPricePln,
      sszPricePln,
      devScopeText: devScope({ foundation: FEET_PHRASE, roofWindows: TWO_ROOF_WINDOWS, electric: 50, plumbing: 14 }),
      foundation: CL.feet,
      envelope: [CL.roofCover, CL.gutters, CL.windowsWhite, CL.ventilation, CL.ceilingDeadening],
      extras: [CL.tempStairs, CL.roofWindows2],
    }),
    optionGroups: groups,
    photos: [cover, ...extraPhotos, ...interior],
    floorPlans: [plan("bingo-podstawowa-parter"), plan("bingo-podstawowa-pietro")],
    sourcePages: pages,
  };
}

// ---------------------------------------------------------------------------
// Ceny i opcje: wartości przepisane z ofert (PLN netto).
// ---------------------------------------------------------------------------

const BINGO_PRODUCTS: LogbarProjectSource[] = [
  bingo({
    model: "A",
    devPricePln: 329500,
    sszPricePln: 274500,
    facadeGroup: GRP.facade([
      {
        label: facadePaintLabel(
          "Gruntowanie i malowanie elewacji zewnętrznej budynku dla modelu A",
          "Priming and painting of the building's external façade for model A",
          "Grundierung und Anstrich der Außenfassade des Gebäudes für Modell A",
          "Gronderen en schilderen van de buitengevel van het gebouw voor model A",
        ),
        pricePln: 20000,
      },
    ]),
    roofTiles: true,
    cover: raw("Bingo_Perfeco", "016-009"),
    extraPhotos: [],
    pages: "Oferta Bingo Perfeco.pdf, s. 1–28 (ceny: s. 22)",
  }),
  bingo({
    model: "B",
    devPricePln: 339500,
    sszPricePln: 284500,
    facadeGroup: null,
    roofTiles: true,
    cover: raw("Bingo_Perfeco", "023-135"),
    extraPhotos: [],
    pages: "Oferta Bingo Perfeco.pdf, s. 1–28 (ceny: s. 23)",
  }),
  bingo({
    model: "C",
    devPricePln: 349500,
    sszPricePln: 294500,
    facadeGroup: GRP.facade([
      {
        label: facadePaintLabel(
          "Gruntowanie i malowanie deski elewacyjnej budynku modelu C (szczyty)",
          "Priming and painting of the cladding boards of the model C building (gables)",
          "Grundierung und Anstrich der Fassadenbretter des Gebäudes Modell C (Giebel)",
          "Gronderen en schilderen van de gevelplanken van het gebouw model C (gevels)",
        ),
        pricePln: 4600,
      },
    ]),
    roofTiles: false,
    cover: raw("Bingo_Perfeco", "024-136"),
    extraPhotos: [],
    pages: "Oferta Bingo Perfeco.pdf, s. 1–28 (ceny: s. 24)",
  }),
  bingo({
    model: "D",
    devPricePln: 339500,
    sszPricePln: 284500,
    facadeGroup: GRP.facade([
      {
        label: facadePaintLabel(
          "Gruntowanie i malowanie elewacji zewnętrznej budynku dla modelu D",
          "Priming and painting of the building's external façade for model D",
          "Grundierung und Anstrich der Außenfassade des Gebäudes für Modell D",
          "Gronderen en schilderen van de buitengevel van het gebouw voor model D",
        ),
        pricePln: 18000,
      },
    ]),
    roofTiles: false,
    cover: raw("Bingo_Perfeco", "001-002"),
    extraPhotos: [],
    pages: "Oferta Bingo Perfeco.pdf, s. 1–28 (ceny: s. 25)",
  }),
];

// ---------------------------------------------------------------------------
// FAMILIO (oferta s. 1-19)
// ---------------------------------------------------------------------------

const FAMILIO_ROOMS: RoomSource[] = [
  room(ROOM.wiatrolap, 3.42, "parter"),
  room(ROOM.korytarz, 8.46, "parter"),
  room(ROOM.pokoj, 11.2, "parter"),
  room(ROOM.garderoba, 2.78, "parter"),
  room(ROOM.pokoj, 10.16, "parter"),
  room(ROOM.lazienka, 5.82, "parter"),
  room(ROOM.gospodarcze, 2.25, "parter"),
  room(ROOM.salon, 21.28, "parter"),
  room(ROOM.kuchnia, 7.68, "parter"),
  room(ROOM.korytarz, 5.5, "pietro"),
  room(ROOM.pokoj, 15.2, "pietro"),
  room(ROOM.lazienka, 5.83, "pietro"),
  room(ROOM.pokoj, 18.5, "pietro"),
];

function familio(args: {
  model: "FD144" | "FA144";
  devPricePln: number;
  sszPricePln: number;
  facadePricePln: number;
  elevation: L10n;
  photos: string[];
  pages: string;
}): LogbarProjectSource {
  const { model, devPricePln, sszPricePln, facadePricePln, elevation, photos, pages } = args;
  const key = `familio-${model.toLowerCase()}`;
  const modelLabel = model === "FD144" ? "FD 144" : "FA 144";
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: `Logbar Familio ${model}`,
    builtUpAreaM2: 88.7,
    floorAreaM2: 118.08,
    externalDimensions: "11,2 × 7,92 m",
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    storeys: 2,
    description: L(
      `Dom drewniany dla rodziny: cztery sypialnie, salon, kuchnia, dwie łazienki, garderoba i pomieszczenie gospodarcze na ok. 118 m² powierzchni użytkowej (145 m² po podłodze), w dwóch kondygnacjach o powierzchni zabudowy 88,7 m² (11,2 × 7,92 m). Dwuspadowy dach pod kątem 40° i prostokątna bryła. ${elevation.pl} W cenie zimna płyta fundamentowa.`,
      `Timber family house: four bedrooms, a living room, a kitchen, two bathrooms, a walk-in wardrobe and a utility room on about 118 m² of usable floor area (145 m² measured at floor level), on two storeys with a footprint of 88.7 m² (11.2 × 7.92 m). Gable roof at 40° and a rectangular volume. ${elevation.en} An uninsulated foundation slab is included in the price.`,
      `Holzhaus für die Familie: vier Schlafzimmer, Wohnzimmer, Küche, zwei Bäder, Ankleidezimmer und Hauswirtschaftsraum auf rund 118 m² Nutzfläche (145 m² Bodenfläche), auf zwei Geschossen mit 88,7 m² Grundfläche (11,2 × 7,92 m). Satteldach mit 40° Neigung und rechteckiger Baukörper. ${elevation.de} Eine kalte Fundamentplatte ist im Preis enthalten.`,
      `Houten gezinswoning: vier slaapkamers, een woonkamer, een keuken, twee badkamers, een inloopkast en een bijkeuken op circa 118 m² bruikbare vloeroppervlakte (145 m² gemeten op vloerniveau), verdeeld over twee bouwlagen met een bebouwde oppervlakte van 88,7 m² (11,2 × 7,92 m). Zadeldak van 40° en een rechthoekig volume. ${elevation.nl} Een niet-geïsoleerde funderingsplaat is bij de prijs inbegrepen.`,
    ),
    roofType: roofText({ slope: 40, ridge: "7,5 m" }),
    constructionSystem: CONSTRUCTION_C24,
    foundationOptions: FOUNDATION_COLD_SLAB,
    customizationScope: L(
      "Dopłaty za gruntowanie i malowanie elewacji, schody zabiegowe, zadaszenie wejścia, płytę fundamentową w pełni izolowaną i każde dodatkowe okno połaciowe. Dopłata do ram okiennych w innym kolorze.",
      "Surcharges for priming and painting the façade, winder stairs, an entrance canopy, a fully insulated foundation slab and each additional roof window. Surcharge for window frames in a different colour.",
      "Aufpreise für Grundierung und Anstrich der Fassade, gewendelte Treppe, Eingangsüberdachung, voll gedämmte Fundamentplatte und jedes zusätzliche Dachfenster. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Toeslagen voor het gronderen en schilderen van de gevel, een trap met kwartslagen, een overkapping van de ingang, een volledig geïsoleerde funderingsplaat en elk extra dakraam. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_COLD_SLAB,
    technicalSpecs: specsBingoFamilio(
      "Stolarka okienna trzyszybowa w kolorze białym; stalowe drzwi zewnętrzne w kolorze grafitowym.",
    ),
    roomLayout: FAMILIO_ROOMS,
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_STANDARD, FAQ_WINDOW_COLOUR, faqScope(SCOPE_COLD_SLAB)],
    clientRequirements: REQ_STANDARD,
    variants: twoVariants({
      devPricePln,
      sszPricePln,
      devScopeText: devScope({ foundation: COLD_SLAB_PHRASE, roofWindows: TWO_ROOF_WINDOWS, electric: 70, plumbing: 18 }),
      foundation: CL.coldSlab,
      envelope: [CL.roofCover, CL.gutters, CL.windowsWhite, CL.ventilation, CL.ceilingDeadening],
      extras: [CL.tempStairs, CL.roofWindows2],
    }),
    optionGroups: [
      GRP.facade([
        {
          label: facadePaintLabel(
            `Gruntowanie i malowanie elewacji zewnętrznej budynku dla modelu ${modelLabel}`,
            `Priming and painting of the building's external façade for model ${modelLabel}`,
            `Grundierung und Anstrich der Außenfassade des Gebäudes für Modell ${modelLabel}`,
            `Gronderen en schilderen van de buitengevel van het gebouw voor model ${modelLabel}`,
          ),
          pricePln: facadePricePln,
        },
      ]),
      GRP.entrance([OPT.canopy(8900), OPT.windingStairs(13900)]),
      GRP.foundationMulti([
        {
          label: L(
            "Dopłata do płyty fundamentowej w pełni izolowanej",
            "Surcharge for a fully insulated foundation slab",
            "Aufpreis für eine voll gedämmte Fundamentplatte",
            "Toeslag voor een volledig geïsoleerde funderingsplaat",
          ),
          pricePln: 7600,
        },
      ]),
      {
        name: L("Okna połaciowe", "Roof windows", "Dachfenster", "Dakramen"),
        selectionType: "multi",
        options: [
          {
            label: L(
              "Dodatkowe okno połaciowe (cena za sztukę)",
              "Additional roof window (price per piece)",
              "Zusätzliches Dachfenster (Preis pro Stück)",
              "Extra dakraam (prijs per stuk)",
            ),
            pricePln: 2380,
          },
        ],
      },
    ],
    photos,
    floorPlans: [raw("Familio", "003-009"), raw("Familio", "004-010")],
    sourcePages: pages,
  };
}

const FAMILIO_PRODUCTS: LogbarProjectSource[] = [
  familio({
    model: "FD144",
    devPricePln: 489000,
    sszPricePln: 415600,
    facadePricePln: 20800,
    elevation: L(
      "Elewacja FD144: jasna deska elewacyjna z elementami paneli na rąbek stojący zachodzącymi na boczną elewację i na szczyty piętra.",
      "Façade FD144: light cladding boards with standing-seam panel elements wrapping onto the side façade and the upper-floor gables.",
      "Fassade FD144: helle Fassadenbretter mit Stehfalzpaneel-Elementen, die auf die Seitenfassade und die Giebel des Obergeschosses übergreifen.",
      "Gevel FD144: lichte gevelplanken met elementen van staande-felspanelen die doorlopen op de zijgevel en de gevels van de verdieping.",
    ),
    photos: [
      raw("Familio", "001-000"),
      raw("Familio", "016-142"),
      raw("Familio", "016-141"),
      raw("Familio", "009-012"),
    ],
    pages: "Oferta Familio.pdf, s. 1–19 (ceny: s. 15)",
  }),
  familio({
    model: "FA144",
    devPricePln: 475400,
    sszPricePln: 398500,
    facadePricePln: 27600,
    elevation: L(
      "Elewacja FA144: jasna deska elewacyjna wykończona panelami na rąbek stojący.",
      "Façade FA144: light cladding boards finished with standing-seam panels.",
      "Fassade FA144: helle Fassadenbretter, mit Stehfalzpaneelen abgeschlossen.",
      "Gevel FA144: lichte gevelplanken afgewerkt met staande-felspanelen.",
    ),
    photos: [raw("Familio", "018-146"), raw("Familio", "018-145")],
    pages: "Oferta Familio.pdf, s. 1–19 (ceny: s. 15)",
  }),
];

// ---------------------------------------------------------------------------
// FINEZJA / LORD (jedna cena, bez podziału SSZ)
// ---------------------------------------------------------------------------

const FINEZJA_GROUND: RoomSource[] = [
  room(ROOM.wiatrolap, 3.29, "parter"),
  room(ROOM.kuchnia, 3.81, "parter"),
  room(ROOM.lazienka, 3.53, "parter"),
  room(ROOM.salon, 17.51, "parter"),
];

function singleVariant(args: {
  pricePln: number;
  scope: L10n;
  foundation: L10n;
  envelope: L10n[];
  extras?: L10n[];
}): VariantSource[] {
  const { pricePln, scope, foundation, envelope, extras } = args;
  return [
    {
      standard: "deweloperski",
      pricePln,
      isDefault: true,
      scopeSummary: scope,
      excludedScope: L(
        "Transport do miejsca montażu, projekt architektoniczno-budowlany oraz impregnacja zewnętrzna budynku.",
        "Transport to the assembly site, the architectural and building design and the external impregnation of the building.",
        "Transport zum Montageort, die Architektur- und Bauplanung sowie die Außenimprägnierung des Gebäudes.",
        "Transport naar de montagelocatie, het architectonisch en bouwkundig ontwerp en de externe impregnering van het gebouw.",
      ),
      costItems: buildCostItems({
        standard: "deweloperski",
        foundation,
        envelope,
        extras,
        finishing: false,
        impregnation: true,
      }).filter((entry) => entry.label.pl !== CL.crane.pl),
    },
  ];
}

function finezja(args: { compact: boolean }): LogbarProjectSource {
  const { compact } = args;
  const key = compact ? "finezja-compact" : "finezja";
  const upstairs: RoomSource[] = compact
    ? [
        room(ROOM.pokoj, 8.16, "poddasze"),
        room(ROOM.pokoj, 8.8, "poddasze"),
        room(ROOM.korytarz, 3.61, "poddasze"),
        room(ROOM.wc, 1.61, "poddasze"),
      ]
    : [room(ROOM.pokoj, 12.48, "poddasze"), room(ROOM.pokoj, 8.8, "poddasze"), room(ROOM.korytarz, 1.4, "poddasze")];
  const upstairsPl = compact ? "dwa pokoje, korytarz i WC" : "dwa pokoje i korytarz";
  const upstairsEn = compact ? "two rooms, a hallway and a WC" : "two rooms and a hallway";
  const upstairsDe = compact ? "zwei Zimmer, ein Flur und ein WC" : "zwei Zimmer und ein Flur";
  const upstairsNl = compact ? "twee kamers, een gang en een toilet" : "twee kamers en een gang";
  const area = compact ? "ok. 50 m² (56,6 m² po podłodze)" : "ok. 50 m² (57,3 m² po podłodze)";
  const areaEn = compact ? "about 50 m² (56.6 m² measured at floor level)" : "about 50 m² (57.3 m² measured at floor level)";
  const areaDe = compact ? "rund 50 m² (56,6 m² Bodenfläche)" : "rund 50 m² (57,3 m² Bodenfläche)";
  const areaNl = compact ? "circa 50 m² (56,6 m² gemeten op vloerniveau)" : "circa 50 m² (57,3 m² gemeten op vloerniveau)";
  const scope = L(
    "Standard z wykończonymi wnętrzami z drewna: stopy fundamentowe i schody tymczasowe w cenie. W technologii producenta nie ma potrzeby wykańczania ścian, podłóg ani sufitów.",
    "Interior-in-timber standard: foundation pads and temporary stairs are included in the price. In the producer's technology there is no need to finish the walls, floors or ceilings.",
    "Standard mit Innenräumen aus Holz: Punktfundamente und provisorische Treppe sind im Preis enthalten. In der Technologie des Herstellers müssen Wände, Böden und Decken nicht ausgebaut werden.",
    "Standaard met houten interieur: funderingspoeren en een tijdelijke trap zijn bij de prijs inbegrepen. Met de technologie van de producent hoeven wanden, vloeren en plafonds niet te worden afgewerkt.",
  );
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: compact ? "Logbar Finezja Compact" : "Logbar Finezja",
    builtUpAreaM2: 35,
    floorAreaM2: compact ? 50.32 : 49.62,
    externalDimensions: "7 × 5 m",
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    storeys: 2,
    description: L(
      `Dom o wymiarach 5 × 7 m z zadaszonym patio, spełniający parametry budynku mieszkalnego. Dwuspadowy dach o nachyleniu 35°, trapezowe okna i elewacja z jasnej deski lub deski palonej japońską metodą Shou Sugi Ban. Na parterze salon, kuchnia, hol i łazienka, na poddaszu ${upstairsPl}, razem ${area} powierzchni użytkowej. Patio o powierzchni 34,77 m² jest dostępne jako opcja.`,
      `A 5 × 7 m house with a covered patio that meets residential building requirements. Gable roof at 35°, trapezoid windows and a façade of light boards or boards charred with the Japanese Shou Sugi Ban method. Downstairs a living room, kitchen, hall and bathroom, upstairs ${upstairsEn}, together ${areaEn} of usable floor area. A 34.77 m² patio is available as an option.`,
      `Haus mit 5 × 7 m Grundfläche und überdachtem Patio, das die Anforderungen an Wohngebäude erfüllt. Satteldach mit 35° Neigung, Trapezfenster und Fassade aus hellen Brettern oder nach der japanischen Shou-Sugi-Ban-Methode verkohlten Brettern. Im Erdgeschoss Wohnzimmer, Küche, Diele und Bad, im Obergeschoss ${upstairsDe}, zusammen ${areaDe} Nutzfläche. Ein Patio mit 34,77 m² ist als Option erhältlich.`,
      `Huis van 5 × 7 m met een overdekte patio dat voldoet aan de eisen voor woongebouwen. Zadeldak van 35°, trapeziumvormige ramen en een gevel van lichte planken of planken verkoold volgens de Japanse Shou Sugi Ban-methode. Beneden een woonkamer, keuken, hal en badkamer, boven ${upstairsNl}, samen ${areaNl} bruikbare vloeroppervlakte. Een patio van 34,77 m² is als optie beschikbaar.`,
    ),
    roofType: L(
      "Dwuspadowy, nachylenie 35°, wysokość do kalenicy 6,33 m; pokrycie: panel na rąbek",
      "Gable roof, 35° pitch, ridge height 6.33 m; covering: standing-seam panels",
      "Satteldach, 35° Neigung, Firsthöhe 6,33 m; Deckung: Stehfalzpaneele",
      "Zadeldak, 35° helling, nokhoogte 6,33 m; dekking: liggende-felspanelen",
    ),
    constructionSystem: CONSTRUCTION_LOG,
    foundationOptions: FOUNDATION_LOG,
    customizationScope: L(
      "Dopłaty za patio, deskę palona metodą Shou Sugi Ban, gruntowanie i malowanie elewacji, wygłuszenie stropu, schody zabiegowe, płytę fundamentową zimną lub w pełni izolowaną oraz siatkę przeciw gryzoniom. Dopłata do ram okiennych w innym kolorze.",
      "Surcharges for the patio, boards charred with the Shou Sugi Ban method, priming and painting of the façade, sound-deadening of the ceiling, winder stairs, an uninsulated or fully insulated foundation slab and anti-rodent mesh. Surcharge for window frames in a different colour.",
      "Aufpreise für das Patio, nach der Shou-Sugi-Ban-Methode verkohlte Bretter, Grundierung und Anstrich der Fassade, Schalldämmung der Decke, gewendelte Treppe, kalte oder voll gedämmte Fundamentplatte und Nagetierschutzgitter. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Toeslagen voor de patio, planken verkoold volgens de Shou Sugi Ban-methode, gronderen en schilderen van de gevel, geluiddemping van het plafond, een trap met kwartslagen, een niet-geïsoleerde of volledig geïsoleerde funderingsplaat en knaagdierenbestendig gaas. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_FINEZJA,
    technicalSpecs: SPECS_LOG,
    roomLayout: [...FINEZJA_GROUND, ...upstairs],
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_LOG, FAQ_WINDOW_COLOUR, faqScope(SCOPE_FINEZJA)],
    clientRequirements: [{ key: "dojazd-dla-transportu" }, { key: "formalnosci" }, REQ_IMPREGNATION],
    variants: singleVariant({
      pricePln: compact ? 249500 : 239500,
      scope,
      foundation: CL.feet,
      envelope: [CL.roofCover, CL.windowsResidential],
      extras: [CL.tempStairs],
    }),
    optionGroups: [
      {
        name: L("Patio", "Patio", "Patio", "Patio"),
        selectionType: "multi",
        options: [
          {
            label: L(
              "Zadaszone patio z lamelą, 34,77 m²",
              "Covered patio with a slatted screen, 34.77 m²",
              "Überdachtes Patio mit Lamellenwand, 34,77 m²",
              "Overdekte patio met lamellenscherm, 34,77 m²",
            ),
            pricePln: 57000,
          },
        ],
      },
      {
        name: L("Elewacja", "Façade", "Fassade", "Gevel"),
        selectionType: "multi",
        options: [
          {
            label: L(
              "Gruntowanie i malowanie elewacji zewnętrznej budynku bez patio",
              "Priming and painting of the building's external façade without the patio",
              "Grundierung und Anstrich der Außenfassade des Gebäudes ohne Patio",
              "Gronderen en schilderen van de buitengevel van het gebouw zonder patio",
            ),
            pricePln: 15700,
          },
          OPT.shouSugiBan(17500),
        ],
      },
      GRP.entrance([
        {
          label: L("Schody zabiegowe", "Winder stairs", "Gewendelte Treppe", "Trap met kwartslagen"),
          pricePln: 9000,
        },
      ]),
      {
        name: L("Wygłuszenie stropu", "Ceiling sound-deadening", "Schalldämmung der Decke", "Geluiddemping van het plafond"),
        selectionType: "multi",
        options: [OPT.deadening(9800)],
      },
      {
        name: L("Fundament", "Foundation", "Fundament", "Fundering"),
        selectionType: "single",
        options: [
          {
            label: L(
              "Stopy fundamentowe (w cenie)",
              "Foundation pads (included)",
              "Punktfundamente (inklusive)",
              "Funderingspoeren (inbegrepen)",
            ),
            pricePln: 0,
            isDefault: true,
          },
          {
            label: L(
              "Płyta fundamentowa zimna",
              "Uninsulated foundation slab",
              "Kalte Fundamentplatte",
              "Niet-geïsoleerde funderingsplaat",
            ),
            pricePln: 13100,
          },
          {
            label: L(
              "Płyta fundamentowa w pełni izolowana",
              "Fully insulated foundation slab",
              "Voll gedämmte Fundamentplatte",
              "Volledig geïsoleerde funderingsplaat",
            ),
            pricePln: 16500,
          },
        ],
      },
      GRP.foundationMulti([OPT.rodentNet(1800)]),
    ],
    photos: [
      raw("Finezja", "001-000"),
      raw("Finezja", "010-014"),
      raw("Finezja", "010-015"),
      raw("Finezja", "011-016"),
      raw("Finezja", "011-017"),
      raw("Finezja", "012-018"),
      raw("Finezja", "013-020"),
      raw("Finezja", "015-024"),
      raw("Finezja", "014-022"),
      raw("Finezja", "013-021"),
    ],
    floorPlans: compact
      ? [raw("Finezja", "003-007"), raw("Finezja", "005-009")]
      : [raw("Finezja", "003-007"), raw("Finezja", "004-008")],
    sourcePages: "Oferta Finezja.pdf, s. 1–15 (ceny: s. 9)",
  };
}

function lord(args: { version: "Lord" | "Lord Plus" | "Lord Compact" }): LogbarProjectSource {
  const { version } = args;
  const key = version.toLowerCase().replace(/\s+/g, "-");
  const upstairs: RoomSource[] =
    version === "Lord"
      ? [room(ROOM.korytarz, 1.16, "poddasze"), room(ROOM.pokoj, 8.8, "poddasze"), room(ROOM.pokoj, 12.48, "poddasze")]
      : version === "Lord Plus"
        ? [room(ROOM.korytarz, 1.61, "poddasze"), room(ROOM.pokoj, 9.15, "poddasze"), room(ROOM.pokoj, 12.89, "poddasze")]
        : [
            room(ROOM.korytarz, 3.4, "poddasze"),
            room(ROOM.pokoj, 9.15, "poddasze"),
            room(ROOM.pokoj, 9.11, "poddasze"),
            room(ROOM.wc, 1.36, "poddasze"),
          ];
  const price = version === "Lord" ? 223500 : version === "Lord Plus" ? 233500 : 243500;
  const floor = version === "Lord" ? 50.58 : version === "Lord Plus" ? 51.79 : 51.16;
  const kneeWall = version === "Lord" ? "1,67" : "1,96";
  const ridge = version === "Lord" ? "6,05 m" : "6,33 m";
  const upPl =
    version === "Lord"
      ? "niezależny pokój i pokój otwarty"
      : version === "Lord Plus"
        ? "dwa niezależne pokoje i duże przeszklenia"
        : "dwa niezależne pokoje i WC";
  const upEn =
    version === "Lord"
      ? "an independent room and an open room"
      : version === "Lord Plus"
        ? "two independent rooms and large glazing"
        : "two independent rooms and a WC";
  const upDe =
    version === "Lord"
      ? "ein eigenständiges Zimmer und ein offenes Zimmer"
      : version === "Lord Plus"
        ? "zwei eigenständige Zimmer und große Verglasungen"
        : "zwei eigenständige Zimmer und ein WC";
  const upNl =
    version === "Lord"
      ? "een zelfstandige kamer en een open kamer"
      : version === "Lord Plus"
        ? "twee zelfstandige kamers en grote beglazing"
        : "twee zelfstandige kamers en een toilet";
  const scope = L(
    "Standard z wykończonymi wnętrzami z drewna: stopy fundamentowe, schody tymczasowe, taras i pergola w cenie. W technologii producenta nie ma potrzeby wykańczania ścian, podłóg ani sufitów.",
    "Interior-in-timber standard: foundation pads, temporary stairs, the terrace and the pergola are included in the price. In the producer's technology there is no need to finish the walls, floors or ceilings.",
    "Standard mit Innenräumen aus Holz: Punktfundamente, provisorische Treppe, Terrasse und Pergola sind im Preis enthalten. In der Technologie des Herstellers müssen Wände, Böden und Decken nicht ausgebaut werden.",
    "Standaard met houten interieur: funderingspoeren, een tijdelijke trap, het terras en de pergola zijn bij de prijs inbegrepen. Met de technologie van de producent hoeven wanden, vloeren en plafonds niet te worden afgewerkt.",
  );
  const options: OptionGroupSource[] = [
    {
      name: L("Elewacja", "Façade", "Fassade", "Gevel"),
      selectionType: "multi",
      options: [
        {
          label: L(
            "Gruntowanie i malowanie elewacji zewnętrznej budynku bez tarasu i pergoli",
            "Priming and painting of the building's external façade without the terrace and the pergola",
            "Grundierung und Anstrich der Außenfassade des Gebäudes ohne Terrasse und Pergola",
            "Gronderen en schilderen van de buitengevel van het gebouw zonder terras en pergola",
          ),
          pricePln: 15700,
        },
        OPT.shouSugiBan(17500),
      ],
    },
    {
      name: L("Wygłuszenie stropu", "Ceiling sound-deadening", "Schalldämmung der Decke", "Geluiddemping van het plafond"),
      selectionType: "multi",
      options: [OPT.deadening(9800)],
    },
    GRP.entrance(
      version === "Lord Plus"
        ? [
            {
              label: L(
                "Schody zabiegowe (dla wersji Lord, Lord Plus, Lord Compact)",
                "Winder stairs (for the Lord, Lord Plus and Lord Compact versions)",
                "Gewendelte Treppe (für die Versionen Lord, Lord Plus und Lord Compact)",
                "Trap met kwartslagen (voor de versies Lord, Lord Plus en Lord Compact)",
              ),
              pricePln: 9000,
            },
            OPT.straightStairs(6500),
          ]
        : [
            {
              label: L(
                "Schody zabiegowe (dla wersji Lord, Lord Plus, Lord Compact)",
                "Winder stairs (for the Lord, Lord Plus and Lord Compact versions)",
                "Gewendelte Treppe (für die Versionen Lord, Lord Plus und Lord Compact)",
                "Trap met kwartslagen (voor de versies Lord, Lord Plus en Lord Compact)",
              ),
              pricePln: 9000,
            },
          ],
    ),
    {
      name: L("Fundament", "Foundation", "Fundament", "Fundering"),
      selectionType: "single",
      options: [
        {
          label: L(
            "Stopy fundamentowe (w cenie)",
            "Foundation pads (included)",
            "Punktfundamente (inklusive)",
            "Funderingspoeren (inbegrepen)",
          ),
          pricePln: 0,
          isDefault: true,
        },
        {
          label: L("Płyta fundamentowa zimna", "Uninsulated foundation slab", "Kalte Fundamentplatte", "Niet-geïsoleerde funderingsplaat"),
          pricePln: 13100,
        },
        {
          label: L(
            "Płyta fundamentowa w pełni izolowana",
            "Fully insulated foundation slab",
            "Voll gedämmte Fundamentplatte",
            "Volledig geïsoleerde funderingsplaat",
          ),
          pricePln: 16500,
        },
      ],
    },
    GRP.foundationMulti([OPT.rodentNet(1800)]),
  ];
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: `Logbar ${version}`,
    builtUpAreaM2: 35,
    floorAreaM2: floor,
    externalDimensions: "7 × 5 m",
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    storeys: 2,
    description: L(
      `Prosty dom o wymiarach 5 × 7 m z tarasem (22,92 m²) i pergolą, spełniający parametry budynku mieszkalnego. Dwuspadowy dach o nachyleniu 30°, duże okna wychodzące na taras i elewacja z jasnej deski lub deski palonej japońską metodą Shou Sugi Ban w duchu nowoczesnej stodoły. Na parterze wiatrołap, kuchnia, łazienka i salon, na poddaszu ${upPl}; razem ok. 51 m² powierzchni użytkowej.`,
      `A simple 5 × 7 m house with a terrace (22.92 m²) and a pergola that meets residential building requirements. Gable roof at 30°, large windows opening onto the terrace and a façade of light boards or boards charred with the Japanese Shou Sugi Ban method in the spirit of a modern barn. Downstairs an entrance vestibule, kitchen, bathroom and living room, upstairs ${upEn}; about 51 m² of usable floor area in total.`,
      `Schlichtes Haus mit 5 × 7 m Grundfläche, Terrasse (22,92 m²) und Pergola, das die Anforderungen an Wohngebäude erfüllt. Satteldach mit 30° Neigung, große Fenster zur Terrasse und Fassade aus hellen oder nach der japanischen Shou-Sugi-Ban-Methode verkohlten Brettern im Stil einer modernen Scheune. Im Erdgeschoss Windfang, Küche, Bad und Wohnzimmer, im Obergeschoss ${upDe}; insgesamt rund 51 m² Nutzfläche.`,
      `Eenvoudig huis van 5 × 7 m met een terras (22,92 m²) en een pergola dat voldoet aan de eisen voor woongebouwen. Zadeldak van 30°, grote ramen naar het terras en een gevel van lichte planken of planken verkoold volgens de Japanse Shou Sugi Ban-methode in de geest van een moderne schuur. Beneden een portaal, keuken, badkamer en woonkamer, boven ${upNl}; samen circa 51 m² bruikbare vloeroppervlakte.`,
    ),
    roofType: L(
      `Dwuspadowy, nachylenie 30°, wysokość do kalenicy ${ridge}, ścianka kolankowa ${kneeWall} m; pokrycie: blachodachówka`,
      `Gable roof, 30° pitch, ridge height ${ridge.replace(",", ".")}, knee wall ${kneeWall.replace(",", ".")} m; covering: metal roof tiles`,
      `Satteldach, 30° Neigung, Firsthöhe ${ridge}, Kniestock ${kneeWall} m; Deckung: Blechdachziegel`,
      `Zadeldak, 30° helling, nokhoogte ${ridge}, knieschot ${kneeWall} m; dekking: metalen dakpannen`,
    ),
    constructionSystem: CONSTRUCTION_LOG,
    foundationOptions: FOUNDATION_LOG,
    customizationScope: L(
      "Dopłaty za deskę palona metodą Shou Sugi Ban, gruntowanie i malowanie elewacji, wygłuszenie stropu, schody, płytę fundamentową zimną lub w pełni izolowaną oraz siatkę przeciw gryzoniom. Dopłata do ram okiennych w innym kolorze.",
      "Surcharges for boards charred with the Shou Sugi Ban method, priming and painting of the façade, sound-deadening of the ceiling, stairs, an uninsulated or fully insulated foundation slab and anti-rodent mesh. Surcharge for window frames in a different colour.",
      "Aufpreise für nach der Shou-Sugi-Ban-Methode verkohlte Bretter, Grundierung und Anstrich der Fassade, Schalldämmung der Decke, Treppen, kalte oder voll gedämmte Fundamentplatte und Nagetierschutzgitter. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Toeslagen voor planken verkoold volgens de Shou Sugi Ban-methode, gronderen en schilderen van de gevel, geluiddemping van het plafond, trappen, een niet-geïsoleerde of volledig geïsoleerde funderingsplaat en knaagdierenbestendig gaas. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_FEET_BLACHA,
    technicalSpecs: SPECS_LOG,
    roomLayout: [...FINEZJA_GROUND, ...upstairs],
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_LOG, FAQ_WINDOW_COLOUR, faqScope(SCOPE_FEET_BLACHA)],
    clientRequirements: [{ key: "dojazd-dla-transportu" }, { key: "formalnosci" }, REQ_IMPREGNATION],
    variants: singleVariant({
      pricePln: price,
      scope,
      foundation: CL.feet,
      envelope: [CL.roofCover, CL.windowsResidential],
      extras: [CL.tempStairs, CL.terracePergola],
    }),
    optionGroups: options,
    photos: [
      raw("Lord_Lord_Plus_Lord_Compact", "001-000"),
      raw("Lord_Lord_Plus_Lord_Compact", "012-016"),
      raw("Lord_Lord_Plus_Lord_Compact", "012-017"),
      raw("Lord_Lord_Plus_Lord_Compact", "013-018"),
      raw("Lord_Lord_Plus_Lord_Compact", "010-012"),
      raw("Lord_Lord_Plus_Lord_Compact", "013-019"),
      raw("Lord_Lord_Plus_Lord_Compact", "014-020"),
      raw("Lord_Lord_Plus_Lord_Compact", "014-021"),
      raw("Lord_Lord_Plus_Lord_Compact", "014-022"),
      raw("Lord_Lord_Plus_Lord_Compact", "015-025"),
    ],
    floorPlans: [
      raw("Lord_Lord_Plus_Lord_Compact", "003-007"),
      version === "Lord"
        ? raw("Lord_Lord_Plus_Lord_Compact", "004-008")
        : version === "Lord Plus"
          ? raw("Lord_Lord_Plus_Lord_Compact", "005-009")
          : raw("Lord_Lord_Plus_Lord_Compact", "006-010"),
    ],
    sourcePages: "Oferta Lord, Lord Plus, Lord Compact.pdf, s. 1–15 (ceny: s. 11)",
  };
}

// ---------------------------------------------------------------------------
// MONAKO 67 / 84 / 111
// ---------------------------------------------------------------------------

const MONAKO_GROUND: RoomSource[] = [
  room(ROOM.korytarz, 5.42, "parter"),
  room(ROOM.pokoj, 8.32, "parter"),
  room(ROOM.lazienka, 4.72, "parter"),
  room(ROOM.salonAneks, 23.49, "parter"),
];

const SPECS_MONAKO = (windowClass: string): TechnicalSpecsSource => ({
  ...SPECS_COMMON,
  windowClass,
  ventilation: "grawitacyjna",
  heatSource: "inne",
  heatSourceOther: HEAT_OTHER,
});

const MONAKO_WINDOWS = "Stolarka okienna trzyszybowa w kolorze grafitowym; stalowe drzwi zewnętrzne w kolorze grafitowym.";

const TERRACE_SPRUCE_67 = L(
  "Taras niezadaszony, deska świerkowa, z fundamentem punktowym",
  "Uncovered terrace with spruce decking and a point foundation",
  "Unüberdachte Terrasse mit Fichtendielen und Punktfundament",
  "Onoverdekt terras met vuren planken en puntfundering",
);
const TERRACE_COMPOSITE_67 = L(
  "Taras niezadaszony, deska kompozytowa Fiberdeck, z montażem systemowym i fundamentem punktowym",
  "Uncovered terrace with Fiberdeck composite decking, system installation and a point foundation",
  "Unüberdachte Terrasse mit Fiberdeck-Verbunddielen, Systemmontage und Punktfundament",
  "Onoverdekt terras met Fiberdeck-composietplanken, systeemmontage en puntfundering",
);

function monako67or84(args: {
  size: 67 | 84;
  model: "A" | "B";
  devPricePln: number;
  sszPricePln: number;
  facadePaintPln: number | null;
  elevation: L10n;
  photos: string[];
  pages: string;
}): LogbarProjectSource {
  const { size, model, devPricePln, sszPricePln, facadePaintPln, elevation, photos, pages } = args;
  const key = `monako-${size}-${model.toLowerCase()}`;
  const dir = size === 67 ? "Monako_67" : "Monako_84";
  const attic = size === 84;
  const rooms: RoomSource[] = attic
    ? [...MONAKO_GROUND, room(ROOM.pokoj, 9.58, "pietro"), room(ROOM.pokoj, 9.56, "pietro"), room(ROOM.schody, 1.96, "pietro")]
    : [...MONAKO_GROUND, room(ROOM.antresola, 6.76, "poddasze")];
  const terraceBase = L(
    "Taras niezadaszony o powierzchni 34,69 m² jest dostępny jako opcja.",
    "An uncovered terrace of 34.69 m² is available as an option.",
    "Eine unüberdachte Terrasse mit 34,69 m² ist als Option erhältlich.",
    "Een onoverdekt terras van 34,69 m² is als optie beschikbaar.",
  );
  const description = attic
    ? L(
        `Nowoczesny dom o powierzchni zabudowy 52,36 m² (9,69 × 5,62 m) z dużymi przeszkleniami. Parter z salonem z aneksem kuchennym, pokojem i łazienką oraz piętro z dwoma pokojami, razem ok. 63 m² powierzchni użytkowej (84 m² po podłodze). Dwuspadowy dach pod kątem 40°. ${elevation.pl} ${terraceBase.pl}`,
        `A modern house with a footprint of 52.36 m² (9.69 × 5.62 m) and large glazed areas. A ground floor with a living room with kitchenette, a room and a bathroom, and an upper floor with two rooms, together about 63 m² of usable floor area (84 m² measured at floor level). Gable roof at 40°. ${elevation.en} ${terraceBase.en}`,
        `Modernes Haus mit 52,36 m² Grundfläche (9,69 × 5,62 m) und großen Verglasungen. Erdgeschoss mit Wohnzimmer mit Küchenzeile, einem Zimmer und Bad sowie Obergeschoss mit zwei Zimmern, zusammen rund 63 m² Nutzfläche (84 m² Bodenfläche). Satteldach mit 40° Neigung. ${elevation.de} ${terraceBase.de}`,
        `Modern huis met een bebouwde oppervlakte van 52,36 m² (9,69 × 5,62 m) en grote beglaasde vlakken. Een begane grond met een woonkamer met keukenhoek, een kamer en een badkamer, en een verdieping met twee kamers, samen circa 63 m² bruikbare vloeroppervlakte (84 m² gemeten op vloerniveau). Zadeldak van 40°. ${elevation.nl} ${terraceBase.nl}`,
      )
    : L(
        `Nowoczesny dom o powierzchni zabudowy 52,36 m² (9,69 × 5,62 m) z dużymi przeszkleniami i antresolą z sypialnią. Parter ok. 42 m² z salonem z aneksem kuchennym, pokojem i łazienką oraz antresola 6,76 m² powierzchni użytkowej (24,82 m² po podłodze). Dwuspadowy dach pod kątem 40°. ${elevation.pl} ${terraceBase.pl}`,
        `A modern house with a footprint of 52.36 m² (9.69 × 5.62 m), large glazed areas and a mezzanine bedroom. A ground floor of about 42 m² with a living room with kitchenette, a room and a bathroom, and a mezzanine of 6.76 m² usable floor area (24.82 m² measured at floor level). Gable roof at 40°. ${elevation.en} ${terraceBase.en}`,
        `Modernes Haus mit 52,36 m² Grundfläche (9,69 × 5,62 m), großen Verglasungen und einem Schlafbereich auf der Galerie. Ein Erdgeschoss von rund 42 m² mit Wohnzimmer mit Küchenzeile, einem Zimmer und Bad sowie eine Galerie mit 6,76 m² Nutzfläche (24,82 m² Bodenfläche). Satteldach mit 40° Neigung. ${elevation.de} ${terraceBase.de}`,
        `Modern huis met een bebouwde oppervlakte van 52,36 m² (9,69 × 5,62 m), grote beglaasde vlakken en een slaapruimte op de mezzanine. Een begane grond van circa 42 m² met een woonkamer met keukenhoek, een kamer en een badkamer, en een mezzanine van 6,76 m² bruikbare vloeroppervlakte (24,82 m² gemeten op vloerniveau). Zadeldak van 40°. ${elevation.nl} ${terraceBase.nl}`,
      );
  const electric = attic ? 40 : 35;
  const groups: OptionGroupSource[] = [];
  const facadeOptions: OptionSource[] = [];
  if (facadePaintPln !== null) {
    facadeOptions.push({
      label: facadePaintLabel(
        "Gruntowanie i malowanie elewacji zewnętrznej budynku dla modelu A",
        "Priming and painting of the building's external façade for model A",
        "Grundierung und Anstrich der Außenfassade des Gebäudes für Modell A",
        "Gronderen en schilderen van de buitengevel van het gebouw voor model A",
      ),
      pricePln: facadePaintPln,
    });
  }
  facadeOptions.push(OPT.shouSugiBan(16250));
  groups.push(GRP.facade(facadeOptions));
  groups.push(GRP.entrance([OPT.windingStairs(14400)]));
  groups.push(
    GRP.terrace([
      { label: TERRACE_SPRUCE_67, pricePln: 19800 },
      { label: TERRACE_COMPOSITE_67, pricePln: 33329 },
    ]),
  );
  groups.push(
    GRP.foundationMulti([
      {
        label: L(
          "Płyta fundamentowa w pełni izolowana (zamiast stóp fundamentowych)",
          "Fully insulated foundation slab (instead of the foundation pads)",
          "Voll gedämmte Fundamentplatte (statt der Punktfundamente)",
          "Volledig geïsoleerde funderingsplaat (in plaats van de funderingspoeren)",
        ),
        pricePln: 21550,
      },
      OPT.rodentNet(2600),
    ]),
  );
  groups.push(GRP.roof([OPT.roofTiles(4300)]));
  groups.push(GRP.recuperation(attic ? 8800 : 7700, attic ? REKUP_SET_M84 : REKUP_SET_M67));
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: `Logbar Monako ${size} ${model}`,
    builtUpAreaM2: 52.36,
    floorAreaM2: attic ? 63.18 : 48.84,
    externalDimensions: "9,69 × 5,62 m",
    rooms: attic ? 4 : 3,
    bedrooms: attic ? 3 : 2,
    bathrooms: 1,
    storeys: attic ? 2 : 1,
    description,
    roofType: roofText({ slope: 40, ridge: attic ? "6,34 m" : "5,74 m" }),
    constructionSystem: CONSTRUCTION_C24,
    foundationOptions: FOUNDATION_STANDARD,
    customizationScope: L(
      "Dopłaty za taras niezadaszony, deskę palona metodą Shou Sugi Ban, gruntowanie i malowanie elewacji, schody zabiegowe, płytę fundamentową w pełni izolowaną, dachówkę ceramiczną i rekuperację. Dopłata do ram okiennych w innym kolorze.",
      "Surcharges for an uncovered terrace, boards charred with the Shou Sugi Ban method, priming and painting of the façade, winder stairs, a fully insulated foundation slab, ceramic roof tiles and heat recovery ventilation. Surcharge for window frames in a different colour.",
      "Aufpreise für eine unüberdachte Terrasse, nach der Shou-Sugi-Ban-Methode verkohlte Bretter, Grundierung und Anstrich der Fassade, gewendelte Treppe, voll gedämmte Fundamentplatte, keramische Dachziegel und Wärmerückgewinnung. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Toeslagen voor een onoverdekt terras, planken verkoold volgens de Shou Sugi Ban-methode, gronderen en schilderen van de gevel, een trap met kwartslagen, een volledig geïsoleerde funderingsplaat, keramische dakpannen en warmteterugwinning. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_FEET,
    technicalSpecs: SPECS_MONAKO(MONAKO_WINDOWS),
    roomLayout: rooms,
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_STANDARD, FAQ_WINDOW_COLOUR, faqScope(SCOPE_FEET)],
    clientRequirements: REQ_STANDARD,
    variants: twoVariants({
      devPricePln,
      sszPricePln,
      devScopeText: devScope({ foundation: FEET_PHRASE, electric, plumbing: 14 }),
      foundation: CL.feet,
      envelope: [CL.roofCover, CL.gutters, CL.windowsGraphite, CL.ventilation, CL.ceilingDeadening],
      extras: [CL.tempStairs],
    }),
    optionGroups: groups,
    photos,
    floorPlans: [raw(dir, "003-009"), raw(dir, "004-010")],
    sourcePages: pages,
  };
}

const ELEV_MONAKO_A = L(
  "Elewacja A: jasna deska elewacyjna profilowana z elementami z drewna opalanego Shou Sugi Ban.",
  "Façade A: light profiled cladding boards with elements of Shou Sugi Ban charred wood.",
  "Fassade A: helle profilierte Fassadenbretter mit Elementen aus nach Shou-Sugi-Ban-Art verkohltem Holz.",
  "Gevel A: lichte geprofileerde gevelplanken met elementen van volgens Shou Sugi Ban verkoold hout.",
);
const ELEV_MONAKO_B_67 = L(
  "Elewacja B: panel na rąbek w kolorze antracytowym wraz z deską elewacyjną.",
  "Façade B: anthracite standing-seam panels together with cladding boards.",
  "Fassade B: anthrazitfarbene Stehfalzpaneele zusammen mit Fassadenbrettern.",
  "Gevel B: antracietkleurige staande-felspanelen samen met gevelplanken.",
);

const MONAKO_PRODUCTS: LogbarProjectSource[] = [
  monako67or84({
    size: 67,
    model: "A",
    devPricePln: 282500,
    sszPricePln: 249500,
    facadePaintPln: 12250,
    elevation: ELEV_MONAKO_A,
    photos: [
      raw("Monako_67", "001-000"),
      raw("Monako_67", "016-138"),
      raw("Monako_67", "016-137"),
      raw("Monako_67", "009-011"),
      raw("Monako_67", "018-141"),
    ],
    pages: "Oferta Monako 67.pdf, s. 1–18 (ceny: s. 15)",
  }),
  monako67or84({
    size: 67,
    model: "B",
    devPricePln: 292500,
    sszPricePln: 259500,
    facadePaintPln: null,
    elevation: ELEV_MONAKO_B_67,
    photos: [raw("Monako_67", "017-140"), raw("Monako_67", "017-139"), raw("Monako_67", "018-141")],
    pages: "Oferta Monako 67.pdf, s. 1–18 (ceny: s. 15)",
  }),
  monako67or84({
    size: 84,
    model: "A",
    devPricePln: 298500,
    sszPricePln: 259500,
    facadePaintPln: 13950,
    elevation: ELEV_MONAKO_A,
    photos: [
      raw("Monako_84", "001-000"),
      raw("Monako_84", "016-139"),
      raw("Monako_84", "016-138"),
      raw("Monako_84", "009-012"),
      raw("Monako_84", "018-142"),
    ],
    pages: "Oferta Monako 84.pdf, s. 1–18 (ceny: s. 15)",
  }),
  monako67or84({
    size: 84,
    model: "B",
    devPricePln: 308500,
    sszPricePln: 269500,
    facadePaintPln: null,
    elevation: ELEV_MONAKO_B_67,
    photos: [raw("Monako_84", "017-141"), raw("Monako_84", "017-140"), raw("Monako_84", "018-142")],
    pages: "Oferta Monako 84.pdf, s. 1–18 (ceny: s. 15)",
  }),
];

const MONAKO111_ROOMS: RoomSource[] = [
  room(ROOM.korytarz, 7.86, "parter"),
  room(ROOM.pokoj, 8.55, "parter"),
  room(ROOM.pokoj, 8.59, "parter"),
  room(ROOM.lazienka, 5.12, "parter"),
  room(ROOM.salonAneks, 25.26, "parter"),
  room(ROOM.korytarz, 3.17, "pietro"),
  room(ROOM.pokoj, 14.41, "pietro"),
  room(ROOM.lazienka, 1.05, "pietro"),
  room(ROOM.pokoj, 13.73, "pietro"),
];

function monako111(args: {
  model: "A" | "B";
  devPricePln: number;
  sszPricePln: number;
  elevation: L10n;
  photos: string[];
}): LogbarProjectSource {
  const { model, devPricePln, sszPricePln, elevation, photos } = args;
  const key = `monako-111-${model.toLowerCase()}`;
  return {
    key,
    id: stableUuid(`product:${key}`),
    name: `Logbar Monako 111 ${model}`,
    builtUpAreaM2: 82.89,
    floorAreaM2: 87.75,
    externalDimensions: "11,68 × 7,1 m",
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    storeys: 2,
    description: L(
      `Nowoczesny dom o powierzchni zabudowy 82,89 m² (11,68 × 7,1 m) z dużymi przeszkleniami w szczycie. Parter 55,38 m² z salonem z aneksem kuchennym, dwoma pokojami i łazienką oraz piętro 32,37 m² z dwoma pokojami i łazienką, razem ok. 88 m² powierzchni użytkowej (111 m² po podłodze). Dwuspadowy dach pod kątem 40°, taras zadaszony 12,63 m² w bryle domu. ${elevation.pl} Taras niezadaszony 38,90 m² jest dostępny jako opcja.`,
      `A modern house with a footprint of 82.89 m² (11.68 × 7.1 m) and large glazed gables. A ground floor of 55.38 m² with a living room with kitchenette, two rooms and a bathroom, and an upper floor of 32.37 m² with two rooms and a bathroom, together about 88 m² of usable floor area (111 m² measured at floor level). Gable roof at 40°, with a 12.63 m² covered terrace within the building volume. ${elevation.en} A 38.90 m² uncovered terrace is available as an option.`,
      `Modernes Haus mit 82,89 m² Grundfläche (11,68 × 7,1 m) und großen Verglasungen im Giebel. Erdgeschoss mit 55,38 m²: Wohnzimmer mit Küchenzeile, zwei Zimmer und Bad; Obergeschoss mit 32,37 m²: zwei Zimmer und Bad; zusammen rund 88 m² Nutzfläche (111 m² Bodenfläche). Satteldach mit 40° Neigung und eine überdachte Terrasse von 12,63 m² im Baukörper. ${elevation.de} Eine unüberdachte Terrasse mit 38,90 m² ist als Option erhältlich.`,
      `Modern huis met een bebouwde oppervlakte van 82,89 m² (11,68 × 7,1 m) en grote beglaasde gevels. Een begane grond van 55,38 m² met een woonkamer met keukenhoek, twee kamers en een badkamer, en een verdieping van 32,37 m² met twee kamers en een badkamer, samen circa 88 m² bruikbare vloeroppervlakte (111 m² gemeten op vloerniveau). Zadeldak van 40° en een overdekt terras van 12,63 m² binnen het gebouwvolume. ${elevation.nl} Een onoverdekt terras van 38,90 m² is als optie beschikbaar.`,
    ),
    roofType: roofText({ slope: 40, ridge: "6,72 m" }),
    constructionSystem: CONSTRUCTION_C24,
    foundationOptions: FOUNDATION_STANDARD,
    customizationScope: L(
      "Dopłaty za taras niezadaszony, gruntowanie i malowanie elewacji, schody zabiegowe oraz płytę fundamentową w pełni izolowaną ze stopami pod wykuszem. Dopłata do ram okiennych w innym kolorze.",
      "Surcharges for an uncovered terrace, priming and painting of the façade, winder stairs and a fully insulated foundation slab with pads under the bay. Surcharge for window frames in a different colour.",
      "Aufpreise für eine unüberdachte Terrasse, Grundierung und Anstrich der Fassade, gewendelte Treppe sowie eine voll gedämmte Fundamentplatte mit Punktfundamenten unter dem Erker. Aufpreis für Fensterrahmen in einer anderen Farbe.",
      "Toeslagen voor een onoverdekt terras, gronderen en schilderen van de gevel, een trap met kwartslagen en een volledig geïsoleerde funderingsplaat met poeren onder de erker. Toeslag voor raamkozijnen in een andere kleur.",
    ),
    serviceScopeDescription: SCOPE_FEET,
    technicalSpecs: SPECS_MONAKO(MONAKO_WINDOWS),
    roomLayout: MONAKO111_ROOMS,
    faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_STANDARD, FAQ_WINDOW_COLOUR, faqScope(SCOPE_FEET)],
    clientRequirements: REQ_STANDARD,
    variants: twoVariants({
      devPricePln,
      sszPricePln,
      devScopeText: devScope({ foundation: FEET_PHRASE, roofWindows: BATH_ROOF_WINDOW, electric: 50, plumbing: 14 }),
      foundation: CL.feet,
      envelope: [CL.roofCover, CL.gutters, CL.windowsGraphite, CL.ventilation, CL.ceilingDeadening],
      extras: [CL.tempStairs, CL.roofWindowBath],
    }),
    optionGroups: [
      GRP.facade([
        {
          label: facadePaintLabel(
            "Gruntowanie i malowanie elewacji zewnętrznej budynku",
            "Priming and painting of the building's external façade",
            "Grundierung und Anstrich der Außenfassade des Gebäudes",
            "Gronderen en schilderen van de buitengevel van het gebouw",
          ),
          pricePln: 17900,
        },
      ]),
      GRP.entrance([OPT.windingStairs(14400)]),
      GRP.terrace([
        {
          label: L(
            "Taras niezadaszony, deska świerkowa, 38,90 m²",
            "Uncovered terrace with spruce decking, 38.90 m²",
            "Unüberdachte Terrasse mit Fichtendielen, 38,90 m²",
            "Onoverdekt terras met vuren planken, 38,90 m²",
          ),
          pricePln: 22202,
        },
        {
          label: L(
            "Taras niezadaszony, deska kompozytowa Fiberdeck z montażem systemowym i fundamentem punktowym",
            "Uncovered terrace with Fiberdeck composite decking, system installation and a point foundation",
            "Unüberdachte Terrasse mit Fiberdeck-Verbunddielen, Systemmontage und Punktfundament",
            "Onoverdekt terras met Fiberdeck-composietplanken, systeemmontage en puntfundering",
          ),
          pricePln: 42298,
        },
      ]),
      GRP.foundationMulti([
        {
          label: L(
            "Płyta fundamentowa w pełni izolowana oraz stopy fundamentowe pod wykuszem domu",
            "Fully insulated foundation slab and foundation pads under the bay of the house",
            "Voll gedämmte Fundamentplatte und Punktfundamente unter dem Erker des Hauses",
            "Volledig geïsoleerde funderingsplaat en funderingspoeren onder de erker van het huis",
          ),
          pricePln: 25500,
        },
        {
          label: L(
            "Siatka przeciw gryzoniom",
            "Anti-rodent mesh",
            "Nagetierschutzgitter",
            "Knaagdierenbestendig gaas",
          ),
          pricePln: 3400,
        },
      ]),
    ],
    photos,
    floorPlans: [plan("monako111-parter"), plan("monako111-pietro")],
    sourcePages: "Oferta Monako 111.pdf, s. 1–18 (ceny: s. 15)",
  };
}

const MONAKO111_PRODUCTS: LogbarProjectSource[] = [
  monako111({
    model: "A",
    devPricePln: 382400,
    sszPricePln: 327400,
    elevation: ELEV_MONAKO_A,
    photos: [raw("Monako_111", "001-000"), raw("Monako_111", "016-143"), raw("Monako_111", "016-142")],
  }),
  monako111({
    model: "B",
    devPricePln: 402800,
    sszPricePln: 346400,
    elevation: L(
      "Elewacja B: deska elewacyjna opalana metodą Shou Sugi Ban z elementami z jasnej deski świerkowej, płaskiej.",
      "Façade B: cladding boards charred with the Shou Sugi Ban method with elements of flat, light spruce boards.",
      "Fassade B: nach der Shou-Sugi-Ban-Methode verkohlte Fassadenbretter mit Elementen aus flachen, hellen Fichtenbrettern.",
      "Gevel B: gevelplanken verkoold volgens de Shou Sugi Ban-methode met elementen van platte, lichte vurenplanken.",
    ),
    photos: [
      raw("Monako_111", "017-145"),
      raw("Monako_111", "017-144"),
      raw("Monako_111", "009-010"),
      raw("Monako_111", "018-146"),
      raw("Monako_111", "018-147"),
      raw("Monako_111", "002-008"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// VIKING
// ---------------------------------------------------------------------------

const VIKING_SCOPE_DEV = L(
  "Standard deweloperski: płyta fundamentowa izolowana poziomo i pionowo XPS, zbrojona, z instalacjami, w pełni wykończony dom z zewnątrz, instalacje elektryczne (58 punktów) i wodno-kanalizacyjne (14 punktów), zadaszenie wejścia, podłoga pokryta suchym jastrychem oraz ściany i sufity wykończone płytą G-K Riduro (bez szpachlowania).",
  "Developer standard: a reinforced foundation slab insulated horizontally and vertically with XPS and fitted with utility lines, a house fully finished on the outside, electrical (58 points) and water and sewage (14 points) installations, an entrance canopy, a floor covered with dry screed and walls and ceilings finished with G-K Riduro plasterboard (without skim coat).",
  "Bauträgerstandard: bewehrte, horizontal und vertikal mit XPS gedämmte Fundamentplatte mit Installationen, außen komplett fertiggestelltes Haus, Elektro- (58 Punkte) und Wasser-/Abwasserinstallation (14 Punkte), Eingangsüberdachung, Boden mit Trockenestrich sowie Wände und Decken mit G-K-Riduro-Gipskartonplatten (ohne Spachtelung).",
  "Ontwikkelaarsstandaard: een gewapende funderingsplaat, horizontaal en verticaal geïsoleerd met XPS en voorzien van leidingen, een aan de buitenzijde volledig afgewerkt huis, elektrische (58 punten) en water- en rioolinstallaties (14 punten), een overkapping van de ingang, een vloer met droge dekvloer en wanden en plafonds afgewerkt met G-K Riduro-gipsplaten (zonder stucwerk).",
);
const VIKING_SCOPE_SSZ = L(
  "Stan surowy zamknięty: płyta fundamentowa izolowana poziomo i pionowo XPS, zbrojona, z instalacjami, w pełni wykończony dom z zewnątrz, instalacje elektryczne i wodno-kanalizacyjne oraz zadaszenie wejścia; bez podłogi z suchego jastrychu i bez wykończenia ścian i sufitów.",
  "Closed shell: a reinforced foundation slab insulated horizontally and vertically with XPS and fitted with utility lines, a house fully finished on the outside, the electrical and the water and sewage installations and an entrance canopy; without the dry-screed floor and without finishing the walls and ceilings.",
  "Rohbau geschlossen: bewehrte, horizontal und vertikal mit XPS gedämmte Fundamentplatte mit Installationen, außen komplett fertiggestelltes Haus, Elektro- sowie Wasser-/Abwasserinstallation und Eingangsüberdachung; ohne Trockenestrich und ohne Wand- und Deckenverkleidung.",
  "Casco dicht: een gewapende funderingsplaat, horizontaal en verticaal geïsoleerd met XPS en voorzien van leidingen, een aan de buitenzijde volledig afgewerkt huis, de elektrische en de water- en rioolinstallatie en een overkapping van de ingang; zonder droge dekvloer en zonder afwerking van wanden en plafonds.",
);

const VIKING_ROOMS: RoomSource[] = [
  room(ROOM.wiatrolap, 4.11, "parter"),
  room(ROOM.pokoj, 10.97, "parter"),
  room(ROOM.sypialnia, 13.78, "parter"),
  room(ROOM.lazienka, 8.2, "parter"),
  room(ROOM.gospodarcze, 2.31, "parter"),
  room(ROOM.korytarz, 6.59, "parter"),
  room(ROOM.kuchniaSalon, 36.39, "parter"),
  room(ROOM.przestrzenAntresoli, 17.47, "poddasze"),
  room(ROOM.lazienka, 1.9, "poddasze"),
];

const VIKING: LogbarProjectSource = {
  key: "viking",
  id: stableUuid("product:viking"),
  name: "Logbar Viking",
  builtUpAreaM2: 109.98,
  floorAreaM2: 101.72,
  externalDimensions: "14,1 × 7,8 m",
  rooms: 4,
  bedrooms: 3,
  bathrooms: 2,
  storeys: 1,
  description: L(
    "Parterowy dom z antresolą o powierzchni zabudowy 109,98 m² (14,1 × 7,8 m), z konstrukcją w całości z drewna konstrukcyjnego. Pokój, sypialnia, duża przestrzeń kuchni, salonu i jadalni (36,39 m²), dwie łazienki, pomieszczenie gospodarcze i antresola, razem ok. 102 m² powierzchni użytkowej (131 m² po podłodze). Dwuspadowy dach pod kątem 40° i wysoko przeszklony szczyt. Do wyboru stan surowy zamknięty lub stan deweloperski, taras o powierzchni 57,28 m² jako opcja.",
    "A single-storey house with a mezzanine and a footprint of 109.98 m² (14.1 × 7.8 m), built entirely from structural timber. A room, a bedroom, a large kitchen, living and dining space (36.39 m²), two bathrooms, a utility room and a mezzanine, together about 102 m² of usable floor area (131 m² measured at floor level). Gable roof at 40° and a tall glazed gable. Choose a closed shell or the developer standard; a 57.28 m² terrace is available as an option.",
    "Eingeschossiges Haus mit Galerie und 109,98 m² Grundfläche (14,1 × 7,8 m), vollständig aus Konstruktionsholz gebaut. Ein Zimmer, ein Schlafzimmer, ein großer Küchen-, Wohn- und Essbereich (36,39 m²), zwei Bäder, ein Hauswirtschaftsraum und eine Galerie, zusammen rund 102 m² Nutzfläche (131 m² Bodenfläche). Satteldach mit 40° Neigung und hoch verglaster Giebel. Wahlweise Rohbau geschlossen oder Bauträgerstandard; eine Terrasse mit 57,28 m² ist als Option erhältlich.",
    "Gelijkvloers huis met een mezzanine en een bebouwde oppervlakte van 109,98 m² (14,1 × 7,8 m), volledig gebouwd van constructiehout. Een kamer, een slaapkamer, een grote keuken-, woon- en eetruimte (36,39 m²), twee badkamers, een bijkeuken en een mezzanine, samen circa 102 m² bruikbare vloeroppervlakte (131 m² gemeten op vloerniveau). Zadeldak van 40° en een hoog beglaasde gevel. Naar keuze casco dicht of de ontwikkelaarsstandaard; een terras van 57,28 m² is als optie beschikbaar.",
  ),
  roofType: L(
    "Dwuspadowy, nachylenie 40°, wysokość do kalenicy 6,28 m; pokrycie: blachodachówka",
    "Gable roof, 40° pitch, ridge height 6.28 m; covering: metal roof tiles",
    "Satteldach, 40° Neigung, Firsthöhe 6,28 m; Deckung: Blechdachziegel",
    "Zadeldak, 40° helling, nokhoogte 6,28 m; dekking: metalen dakpannen",
  ),
  constructionSystem: CONSTRUCTION_VIKING,
  foundationOptions: FOUNDATION_VIKING,
  customizationScope: L(
    "Dopłaty za modyfikację seryjnego projektu produkcyjnego, drzwi pasywne, przesuwne okno tarasowe, deskę palona metodą Shou Sugi Ban, gruntowanie i malowanie deski elewacyjnej, taras, schody zabiegowe oraz dodatkowe przyłącza zewnętrzne. Przewody pod oświetlenie zewnętrzne, kamery i alarm wyceniane indywidualnie.",
    "Surcharges for modifying the standard production design, passive-house doors, a sliding terrace window, boards charred with the Shou Sugi Ban method, priming and painting of the cladding boards, a terrace, winder stairs and additional external connections. Wiring for external lighting, cameras and an alarm is quoted individually.",
    "Aufpreise für die Änderung des Serienproduktionsentwurfs, Passivhaustüren, ein Terrassen-Schiebefenster, nach der Shou-Sugi-Ban-Methode verkohlte Bretter, Grundierung und Anstrich der Fassadenbretter, eine Terrasse, gewendelte Treppe und zusätzliche Außenanschlüsse. Leitungen für Außenbeleuchtung, Kameras und Alarmanlage werden individuell kalkuliert.",
    "Toeslagen voor het wijzigen van het serieproductieontwerp, passiefhuisdeuren, een schuivend terrasraam, planken verkoold volgens de Shou Sugi Ban-methode, gronderen en schilderen van de gevelplanken, een terras, een trap met kwartslagen en extra buitenaansluitingen. Bekabeling voor buitenverlichting, camera's en alarm wordt individueel geoffreerd.",
  ),
  serviceScopeDescription: SCOPE_VIKING,
  technicalSpecs: {
    wallBuildUp:
      "Deska elewacyjna, łaty 40 × 30 mm i szczelina wentylacyjna, blacha perforowana, wiatroizolacja, płyta MFP 12 mm, konstrukcja drewniana C24 45 × 145 mm, wełna 150 mm λ = 0,033 W/(mK), paroizolacja, ruszt instalacyjny 60 × 40 mm z wełną 50 mm, płyta gipsowo-kartonowa Riduro.",
    insulation: "Wełna izolacyjna: ściany 150 + 50 mm, dach 200 + 50 mm, strop 150 mm; płyta fundamentowa z XPS 100 mm.",
    windowClass: "Stolarka okienna trzyszybowa sześciokomorowa, antracytowa od zewnątrz i biała od wewnątrz; drzwi Gerda lub Wikęd.",
    ventilation: "grawitacyjna",
    heatSource: "inne",
    heatSourceOther: HEAT_OTHER,
  },
  roomLayout: VIKING_ROOMS,
  faq: [FAQ_TRANSPORT, FAQ_NET, FAQ_WARRANTY, FAQ_FINISH_VIKING, faqScope(SCOPE_VIKING)],
  clientRequirements: REQ_STANDARD,
  variants: [
    {
      standard: "surowy-zamkniety",
      pricePln: 428000,
      isDefault: false,
      scopeSummary: VIKING_SCOPE_SSZ,
      excludedScope: EXCLUDED_SSZ,
      costItems: buildCostItems({
        standard: "surowy-zamkniety",
        foundation: CL.insulatedSlab,
        envelope: [CL.roofCover, CL.gutters, CL.windowsViking, CL.ventilation],
        extras: [CL.entranceCanopy],
        windowColour: false,
      }),
    },
    {
      standard: "deweloperski",
      pricePln: 487000,
      isDefault: true,
      scopeSummary: VIKING_SCOPE_DEV,
      excludedScope: EXCLUDED_DEV,
      costItems: buildCostItems({
        standard: "deweloperski",
        foundation: CL.insulatedSlab,
        envelope: [CL.roofCover, CL.gutters, CL.windowsViking, CL.ventilation],
        extras: [CL.entranceCanopy],
        windowColour: false,
      }),
    },
  ],
  optionGroups: [
    {
      name: L("Wykonanie i modyfikacje", "Execution and modifications", "Ausführung und Änderungen", "Uitvoering en wijzigingen"),
      selectionType: "multi",
      options: [
        {
          label: L(
            "Koszt modyfikacji seryjnego projektu produkcyjnego",
            "Cost of modifying the standard production design",
            "Kosten für die Änderung des Serienproduktionsentwurfs",
            "Kosten voor het wijzigen van het serieproductieontwerp",
          ),
          pricePln: 3500,
        },
      ],
    },
    {
      name: L("Okna i drzwi", "Windows and doors", "Fenster und Türen", "Ramen en deuren"),
      selectionType: "multi",
      options: [
        {
          label: L(
            "Drzwi zewnętrzne pasywne",
            "Passive-house external door",
            "Passivhaus-Außentür",
            "Passiefhuis-buitendeur",
          ),
          pricePln: 3800,
        },
        {
          label: L(
            "Przesuwne okno tarasowe Slide",
            "Slide sliding terrace window",
            "Slide-Terrassenschiebefenster",
            "Slide schuivend terrasraam",
          ),
          pricePln: 9500,
        },
      ],
    },
    GRP.facade([
      OPT.shouSugiBan(28200),
      {
        label: L(
          "Gruntowanie i malowanie deski elewacyjnej",
          "Priming and painting of the cladding boards",
          "Grundierung und Anstrich der Fassadenbretter",
          "Gronderen en schilderen van de gevelplanken",
        ),
        pricePln: 23700,
      },
    ]),
    GRP.terrace([
      {
        label: L(
          "Taras w kształcie litery L: 9,8 × 4 m od strony szczytu i 12,52 × 2 m wzdłuż boku, 57,28 m², deska tarasowa świerkowa 28 mm, fundament punktowy",
          "L-shaped terrace: 9.8 × 4 m at the gable and 12.52 × 2 m along the side, 57.28 m², 28 mm spruce decking, point foundation",
          "L-förmige Terrasse: 9,8 × 4 m an der Giebelseite und 12,52 × 2 m entlang der Seite, 57,28 m², Fichtendielen 28 mm, Punktfundament",
          "L-vormig terras: 9,8 × 4 m aan de gevelzijde en 12,52 × 2 m langs de zijkant, 57,28 m², vuren planken van 28 mm, puntfundering",
        ),
        pricePln: 26800,
      },
      {
        // Oferta podaje tylko "deska tarasowa kompozytowa Fiberdeck - 390 zł / m²" (bez sumy za taras),
        // więc nie wyliczamy kwoty za producenta: wycena indywidualna.
        label: L(
          "Taras w kształcie litery L z deski kompozytowej Fiberdeck (390 zł za m² deski, wycena wg powierzchni)",
          "L-shaped terrace with Fiberdeck composite decking (PLN 390 per m² of decking, quoted by area)",
          "L-förmige Terrasse mit Fiberdeck-Verbunddielen (390 PLN pro m² Dielen, Preis nach Fläche)",
          "L-vormig terras met Fiberdeck-composietplanken (390 PLN per m² planken, offerte naar oppervlakte)",
        ),
        pricePln: 0,
        priceOnRequest: true,
      },
    ]),
    GRP.entrance([
      {
        label: L("Schody zabiegowe", "Winder stairs", "Gewendelte Treppe", "Trap met kwartslagen"),
        pricePln: 15800,
      },
    ]),
    {
      name: L("Wyposażenie zewnętrzne", "External equipment", "Außenausstattung", "Buitenuitrusting"),
      selectionType: "multi",
      options: [
        {
          label: L("Kran na zewnątrz", "Outdoor tap", "Außenwasserhahn", "Buitenkraan"),
          pricePln: 1500,
        },
        {
          label: L(
            "Gniazdo elektryczne na tarasie",
            "Electrical socket on the terrace",
            "Steckdose auf der Terrasse",
            "Stopcontact op het terras",
          ),
          pricePln: 550,
        },
      ],
    },
  ],
  photos: [
    raw("Viking", "001-002"),
    raw("Viking", "012-018"),
    raw("Viking", "012-017"),
    raw("Viking", "013-019"),
  ],
  floorPlans: [plan("viking-parter"), plan("viking-antresola")],
  sourcePages: "Oferta Viking.pdf, s. 1–13 (ceny: s. 11)",
};

export const LOGBAR_PROJECTS: LogbarProjectSource[] = [
  ...BINGO_PRODUCTS,
  ...MONAKO_PRODUCTS,
  ...MONAKO111_PRODUCTS,
  ...FAMILIO_PRODUCTS,
  finezja({ compact: false }),
  finezja({ compact: true }),
  lord({ version: "Lord" }),
  lord({ version: "Lord Plus" }),
  lord({ version: "Lord Compact" }),
  VIKING,
];
