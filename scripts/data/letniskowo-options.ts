// Opcje płatne Letniskowo (cennik opcji 07_Extras_ENG_EURO.pdf, EUR netto), spec 0081 Feature design i rationale.md.
// Reguły przypisania do modeli są funkcjami czystymi, żeby test porównał je z tabelą klas z rationale.md.
// Ograniczenia "tylko FF", "tylko MP", "z deLux" są wyłącznie w nazwach opcji (AC-6), bez reguł blokujących.
import { L, detUuid, type L10n, type ModelSource } from "./letniskowo-catalog";

export type SelectionType = "single" | "multi";

export interface OptionSource {
  key: string;
  label: L10n;
  priceEur: number;
  note?: L10n;
}
export interface GroupSource {
  key: string;
  name: L10n;
  selectionType: SelectionType;
  options: OptionSource[];
  applies: (model: ModelSource) => boolean;
}

/** Najmniejszy próg z cennika większy lub równy powierzchni; null, gdy powierzchnia przekracza największy próg. */
export function sizeClass(areaM2: number, thresholds: readonly number[]): number | null {
  return thresholds.find((threshold) => areaM2 <= threshold) ?? null;
}

export const THRESHOLDS = {
  chassis: [35, 50, 70],
  floor: [40, 50, 70],
  pur: [50, 70],
  wall: [50, 70],
} as const;

const isComfort = (m: ModelSource) => m.line === "comfort";
const isPremium = (m: ModelSource) => m.line === "premium";
const notVario = (m: ModelSource) => m.line !== "vario";
const all = () => true;
const NO_18CM = new Set(["zen", "bali", "malibu", "palermo"]);

const free = (key: string, label: L10n): OptionSource => ({ key, label, priceEur: 0 });
const opt = (key: string, label: L10n, priceEur: number, note?: L10n): OptionSource => ({ key, label, priceEur, note });
const price = (euro: number) => euro; // czytelność: ceny podane w EUR

const NONE = L("Bez", "None", "Ohne", "Geen");
const STANDARD = L("Standard", "Standard", "Standard", "Standaard");

// Grupa zależna od klasy rozmiaru: jedna grupa o tej samej nazwie na klasę (spec 0081, Feature design).
function perClass(
  keyBase: string,
  name: L10n,
  thresholds: readonly number[],
  classOf: (m: ModelSource) => number | null,
  applies: (m: ModelSource) => boolean,
  build: (cls: number) => OptionSource[],
  selectionType: SelectionType,
): GroupSource[] {
  return thresholds.map((cls) => ({
    key: `${keyBase}-${cls}`,
    name,
    selectionType,
    options: build(cls),
    applies: (m) => applies(m) && classOf(m) === cls,
  }));
}

const chassisClass = (m: ModelSource) => sizeClass(m.areaM2, THRESHOLDS.chassis);
const floorClass = (m: ModelSource) => sizeClass(m.areaM2, THRESHOLDS.floor);
const purClass = (m: ModelSource) => sizeClass(m.areaM2, THRESHOLDS.pur);
const wallClass = (m: ModelSource) => sizeClass(m.areaM2, THRESHOLDS.wall);

export const GROUPS: GroupSource[] = [
  // --- Konstrukcja ---
  ...perClass(
    "pur",
    L("Izolacja PUR", "PUR insulation", "PUR-Dämmung", "PUR-isolatie"),
    THRESHOLDS.pur,
    purClass,
    (m) => isComfort(m) && !NO_18CM.has(m.key),
    (cls) => [
      free("13", L("13 cm PUR (standard)", "13 cm PUR (standard)", "13 cm PUR (Standard)", "13 cm PUR (standaard)")),
      opt("18", L("18 cm PUR", "18 cm PUR", "18 cm PUR", "18 cm PUR"), price(cls === 50 ? 2333 : 3452)),
    ],
    "single",
  ),
  ...perClass(
    "chassis",
    L("Podwozie", "Chassis", "Fahrgestell", "Onderstel"),
    THRESHOLDS.chassis,
    chassisClass,
    notVario,
    (cls) => [
      free("ff", L("Stałe FF (standard)", "Fixed FF (standard)", "Festes FF (Standard)", "Vast FF (standaard)")),
      opt("mp", L("Mobilne MP", "Mobile MP", "Mobiles MP", "Mobiel MP"), price(cls === 35 ? 1843 : cls === 50 ? 1959 : 2074)),
    ],
    "single",
  ),
  {
    key: "supports-ff",
    name: L("Podpory regulowane (tylko FF)", "Adjustable supports (FF only)", "Verstellbare Stützen (nur FF)", "Verstelbare steunen (alleen FF)"),
    selectionType: "single",
    applies: all,
    options: [
      free("none", NONE),
      opt("8", L("8 szt.", "8 pcs", "8 Stk.", "8 stuks"), 461),
      opt("11", L("11 szt.", "11 pcs", "11 Stk.", "11 stuks"), 634),
      opt("13", L("13 szt.", "13 pcs", "13 Stk.", "13 stuks"), 749),
    ],
  },
  {
    key: "supports-mp",
    name: L("Podpory regulowane (tylko MP)", "Adjustable supports (MP only)", "Verstellbare Stützen (nur MP)", "Verstelbare steunen (alleen MP)"),
    selectionType: "single",
    applies: all,
    options: [
      free("none", NONE),
      opt("6", L("6 szt.", "6 pcs", "6 Stk.", "6 stuks"), 576),
      opt("8", L("8 szt.", "8 pcs", "8 Stk.", "8 stuks"), 768),
      opt("10", L("10 szt.", "10 pcs", "10 Stk.", "10 stuks"), 960),
    ],
  },
  {
    key: "chassis-equipment-mp",
    name: L("Wyposażenie podwozia (tylko MP)", "Chassis equipment (MP only)", "Fahrgestellausstattung (nur MP)", "Ondersteluitrusting (alleen MP)"),
    selectionType: "multi",
    applies: all,
    options: [
      opt("steering-wheels", L("Koła skrętne zamiast sztywnej osi", "Steering wheels instead of a rigid axle", "Lenkräder statt starrer Achse", "Stuurwielen in plaats van een starre as"), 1448),
      opt("galvanized", L("Ocynkowanie podwozia", "Galvanized chassis", "Verzinktes Fahrgestell", "Verzinkt onderstel"), 3429),
      opt("lifting-lugs", L("Uszy dźwigowe (4 szt.)", "Lifting lugs (4 pcs)", "Kranösen (4 Stk.)", "Hijsogen (4 stuks)"), 624),
    ],
  },
  ...perClass(
    "wall-comfort",
    L("Podwyższenie ściany bocznej do 250 cm (tylko FF)", "Side wall raised to 250 cm (FF only)", "Seitenwand erhöht auf 250 cm (nur FF)", "Zijwand verhoogd tot 250 cm (alleen FF)"),
    THRESHOLDS.wall,
    wallClass,
    isComfort,
    (cls) => [opt("raise", L("Podwyższenie ściany do 250 cm", "Wall raised to 250 cm", "Wand erhöht auf 250 cm", "Wand verhoogd tot 250 cm"), cls === 50 ? 1152 : 1382)],
    "multi",
  ),
  {
    key: "wall-premium",
    name: L("Podwyższenie ściany bocznej do 250 cm (tylko FF)", "Side wall raised to 250 cm (FF only)", "Seitenwand erhöht auf 250 cm (nur FF)", "Zijwand verhoogd tot 250 cm (alleen FF)"),
    selectionType: "multi",
    applies: isPremium,
    options: [opt("raise", L("Podwyższenie ściany do 250 cm", "Wall raised to 250 cm", "Wand erhöht auf 250 cm", "Wand verhoogd tot 250 cm"), 2611)],
  },
  {
    key: "roof-angle-comfort",
    name: L("Kąt dachu (tylko FF)", "Roof angle (FF only)", "Dachneigung (nur FF)", "Dakhelling (alleen FF)"),
    selectionType: "single",
    applies: isComfort,
    options: [
      free("20", L("20° (standard)", "20° (standard)", "20° (Standard)", "20° (standaard)")),
      opt("25", L("25°", "25°", "25°", "25°"), 429),
      opt("30", L("30°", "30°", "30°", "30°"), 429),
    ],
  },
  {
    key: "roof-angle-premium",
    name: L("Kąt dachu (tylko FF)", "Roof angle (FF only)", "Dachneigung (nur FF)", "Dakhelling (alleen FF)"),
    selectionType: "single",
    applies: isPremium,
    // Znaczenie deLux nie jest zdefiniowane w materiałach (pytanie do klienta, AC-15): nazwy jak w cenniku.
    options: [
      free("20", L("20° (standard)", "20° (standard)", "20° (Standard)", "20° (standaard)")),
      opt("25", L("25° bez deLux", "25° without deLux", "25° ohne deLux", "25° zonder deLux"), 1143),
      opt("30", L("30° bez deLux", "30° without deLux", "30° ohne deLux", "30° zonder deLux"), 1143),
      opt("25-delux", L("25° z deLux", "25° with deLux", "25° mit deLux", "25° met deLux"), 2333),
      opt("30-delux", L("30° z deLux", "30° with deLux", "30° mit deLux", "30° met deLux"), 2333),
    ],
  },
  {
    key: "construction-extras",
    name: L("Dodatki konstrukcyjne", "Construction extras", "Konstruktionszusätze", "Constructie-extra's"),
    selectionType: "multi",
    applies: all,
    options: [
      opt("koza-prep", L("Przygotowanie izolacji pod kominek (koza)", "Insulation prepared for a stove", "Dämmung für Kaminofen vorbereitet", "Isolatie voorbereid voor kachel"), 499),
      opt("koza", L("Kominek (koza) z kominem", "Stove with chimney", "Kaminofen mit Schornstein", "Kachel met schoorsteen"), 5968),
      opt("rockwool", L("Wełna mineralna w ścianach działowych", "Mineral wool in partition walls", "Mineralwolle in den Trennwänden", "Minerale wol in de scheidingswanden"), 461),
      // Nazwa z cennika do potwierdzenia u klienta (AC-15): "Front door trained 90x200".
      opt("door", L("Drzwi frontowe 90x200 zamiast stalowych (nazwa z cennika)", "Front door 90x200 instead of steel (name from price list)", "Haustür 90x200 statt Stahl (Name laut Preisliste)", "Voordeur 90x200 in plaats van staal (naam uit prijslijst)"), 669),
      opt("facade", L("Wariant elewacji", "Facade variant", "Fassadenvariante", "Gevelvariant"), 749),
      opt("custom-design", L("Projekt indywidualny (custom design)", "Custom design", "Individueller Entwurf", "Eigen ontwerp"), 2900),
    ],
  },
  {
    key: "pv-prep",
    name: L("Fotowoltaika", "Photovoltaics", "Photovoltaik", "Fotovoltaïsche panelen"),
    selectionType: "multi",
    applies: notVario,
    options: [opt("roof", L("Przygotowanie dachu pod fotowoltaikę", "Roof prepared for photovoltaics", "Dach für Photovoltaik vorbereitet", "Dak voorbereid voor zonnepanelen"), 799)],
  },
  // --- Instalacje ---
  ...perClass(
    "floor-heating",
    L("Ogrzewanie podłogowe", "Underfloor heating", "Fußbodenheizung", "Vloerverwarming"),
    THRESHOLDS.floor,
    floorClass,
    isComfort,
    (cls) => [opt("floor", L("Ogrzewanie podłogowe", "Underfloor heating", "Fußbodenheizung", "Vloerverwarming"), cls === 40 ? 1747 : cls === 50 ? 2131 : 2535)],
    "multi",
  ),
  {
    key: "ac-comfort",
    name: L("Klimatyzacja", "Air conditioning", "Klimaanlage", "Airconditioning"),
    selectionType: "single",
    applies: isComfort,
    options: [
      free("none", NONE),
      opt("1", L("1 split", "1 split", "1 Split", "1 split"), 1248),
      opt("2", L("2 multisplit", "2 multisplit", "2 Multisplit", "2 multisplit"), 2995),
      opt("3", L("3 multisplit", "3 multisplit", "3 Multisplit", "3 multisplit"), 4493),
    ],
  },
  {
    key: "ac-extra",
    name: L("Dodatkowe jednostki klimatyzacji", "Additional air conditioning units", "Zusätzliche Klimageräte", "Extra airconditioningunits"),
    selectionType: "single",
    applies: (m) => isPremium(m) || m.line === "vario",
    // "(+1)" i "(+2)" to przyrosty ponad klimatyzację w standardzie; do potwierdzenia u klienta (AC-15).
    options: [
      free("none", NONE),
      opt("2", L("2 multisplit (+1 jednostka)", "2 multisplit (+1 unit)", "2 Multisplit (+1 Gerät)", "2 multisplit (+1 unit)"), 1747),
      opt("3", L("3 multisplit (+2 jednostki)", "3 multisplit (+2 units)", "3 Multisplit (+2 Geräte)", "3 multisplit (+2 units)"), 3245),
    ],
  },
  {
    key: "recuperation",
    name: L("Rekuperacja", "Heat recovery ventilation", "Wärmerückgewinnung", "Warmteterugwinning"),
    selectionType: "single",
    applies: notVario,
    // Znaczenie "3" i "4" do potwierdzenia u klienta (AC-15).
    options: [
      free("none", NONE),
      opt("3", L("Rekuperacja 3", "Recuperation 3", "Rekuperation 3", "Recuperatie 3"), 1647),
      opt("4", L("Rekuperacja 4", "Recuperation 4", "Rekuperation 4", "Recuperatie 4"), 2197),
    ],
  },
  {
    key: "installation-extras",
    name: L("Dodatki instalacyjne", "Installation extras", "Installationszusätze", "Installatie-extra's"),
    selectionType: "multi",
    applies: all,
    options: [
      opt("tap", L("Kran zewnętrzny", "External tap", "Außenwasserhahn", "Buitenkraan"), 192),
      opt("water-meter", L("Podlicznik wody", "Water sub-meter", "Wasserzwischenzähler", "Watersubmeter"), 157),
      opt("wall-lamp", L("Lampa ścienna zewnętrzna", "External wall lamp", "Außenwandleuchte", "Buitenwandlamp"), 71),
      opt("socket-out", L("Gniazdo zewnętrzne", "External socket", "Außensteckdose", "Buitenstopcontact"), 71),
      opt("socket-in", L("Gniazdo wewnętrzne", "Internal socket", "Innensteckdose", "Binnenstopcontact"), 40),
      opt("socket-lan", L("Gniazdo internetowe", "Internet socket", "Netzwerkdose", "Internetaansluiting"), 95),
      opt("socket-usb", L("Gniazdo z USB", "Socket with USB", "Steckdose mit USB", "Stopcontact met USB"), 71),
      opt("socket-tv", L("Gniazdo antenowe", "Antenna socket", "Antennendose", "Antenne-aansluiting"), 48),
      opt("socket-32a", L("Gniazdo 32A", "32A socket", "32A-Steckdose", "32A-stopcontact"), 333),
      opt("energy-meter", L("Podlicznik energii", "Energy sub-meter", "Energiezwischenzähler", "Energiesubmeter"), 167),
    ],
  },
  {
    key: "alarm-cameras",
    name: L("Alarm i kamery", "Alarm and cameras", "Alarm und Kameras", "Alarm en camera's"),
    selectionType: "multi",
    applies: all,
    options: [
      opt("alarm", L("Instalacja pod alarm (do 10 punktów)", "Alarm wiring (up to 10 points)", "Alarmverkabelung (bis zu 10 Punkte)", "Alarmbekabeling (tot 10 punten)"), 595),
      opt("cameras", L("Instalacja pod kamery (do 6 punktów)", "Camera wiring (up to 6 points)", "Kameraverkabelung (bis zu 6 Punkte)", "Camerabekabeling (tot 6 punten)"), 357),
    ],
  },
  // --- Wyposażenie AGD ---
  {
    key: "washer",
    name: L("Pralka", "Washing machine", "Waschmaschine", "Wasmachine"),
    selectionType: "single",
    applies: notVario,
    options: [
      free("none", NONE),
      opt("free", L("Pralka wolnostojąca", "Freestanding washing machine", "Freistehende Waschmaschine", "Vrijstaande wasmachine"), 419),
      opt("dryer", L("Pralko suszarka", "Washer dryer", "Waschtrockner", "Wasdroger"), 594),
    ],
  },
  {
    key: "appliances",
    name: L("AGD", "Appliances", "Haushaltsgeräte", "Apparaten"),
    selectionType: "multi",
    applies: all,
    options: [opt("nofrost", L("Lodówka NoFrost zamiast standardowej", "NoFrost fridge instead of the standard one", "NoFrost-Kühlschrank statt Standard", "NoFrost-koelkast in plaats van standaard"), 140)],
  },
  {
    key: "microwave",
    name: L("Kuchenka mikrofalowa", "Microwave", "Mikrowelle", "Magnetron"),
    selectionType: "multi",
    applies: notVario,
    options: [opt("microwave", L("Zmiana na kuchenkę mikrofalową", "Change to a microwave", "Wechsel auf eine Mikrowelle", "Wijziging naar een magnetron"), 370)],
  },
  // --- Wnętrze ---
  {
    key: "bedroom-comfort",
    name: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
    selectionType: "single",
    applies: isComfort,
    options: [free("std", STANDARD), opt("xl", L("XL", "XL", "XL", "XL"), 952)],
  },
  {
    key: "room-comfort",
    name: L("Pokój (łóżko pojedyncze)", "Room (single bed)", "Zimmer (Einzelbett)", "Kamer (eenpersoonsbed)"),
    selectionType: "single",
    applies: (m) => isComfort(m) && m.hasRoom,
    options: [free("std", STANDARD), opt("xl", L("XL", "XL", "XL", "XL"), 714)],
  },
  {
    key: "bedroom-premium",
    name: L("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
    selectionType: "single",
    applies: isPremium,
    // "deLux" bez definicji w materiałach, pytanie do klienta (AC-15).
    options: [free("std", STANDARD), opt("delux", L("DeLux Premium Bedroom", "DeLux Premium Bedroom", "DeLux Premium Bedroom", "DeLux Premium Bedroom"), 1619)],
  },
  {
    key: "room-premium",
    name: L("Pokój (łóżko pojedyncze)", "Room (single bed)", "Zimmer (Einzelbett)", "Kamer (eenpersoonsbed)"),
    selectionType: "single",
    applies: (m) => isPremium(m) && m.hasRoom,
    options: [free("std", STANDARD), opt("delux", L("DeLux Premium Room", "DeLux Premium Room", "DeLux Premium Room", "DeLux Premium Room"), 952)],
  },
  {
    key: "kitchen-ceiling-comfort",
    name: L("Kuchnia sufitowa", "Kitchen ceiling", "Küchendecke", "Keukenplafond"),
    selectionType: "single",
    applies: isComfort,
    // Nazwy z cennika ("Comfort ceiling kitchen") do potwierdzenia u klienta (AC-15).
    options: [free("std", STANDARD), opt("20", L('20"', '20"', '20"', '20"'), 714), opt("25", L('25"', '25"', '25"', '25"'), 952), opt("30", L('30"', '30"', '30"', '30"'), 1190)],
  },
  ...perClass(
    "vinyl",
    L("Panele winylowe", "Vinyl panels", "Vinylpaneele", "Vinylpanelen"),
    THRESHOLDS.floor,
    floorClass,
    notVario,
    (cls) => [opt("vinyl", L("Panele winylowe", "Vinyl panels", "Vinylpaneele", "Vinylpanelen"), cls === 40 ? 464 : cls === 50 ? 633 : 750)],
    "multi",
  ),
  {
    key: "tables",
    name: L("Stół", "Table", "Tisch", "Tafel"),
    selectionType: "single",
    applies: all,
    options: [
      free("none", NONE),
      opt("round", L("Okrągły z 4 krzesłami", "Round with 4 chairs", "Rund mit 4 Stühlen", "Rond met 4 stoelen"), 595),
      opt("rect", L("Prostokątny z 4 krzesłami", "Rectangular with 4 chairs", "Rechteckig mit 4 Stühlen", "Rechthoekig met 4 stoelen"), 357),
    ],
  },
  {
    key: "headboard",
    name: L("Panel tapicerowany za łóżkiem", "Upholstered panel behind the bed", "Gepolstertes Paneel hinter dem Bett", "Gestoffeerd paneel achter het bed"),
    selectionType: "single",
    applies: all,
    options: [
      free("none", NONE),
      opt("160", L("160 cm", "160 cm", "160 cm", "160 cm"), 180),
      opt("180", L("180 cm", "180 cm", "180 cm", "180 cm"), 202),
      opt("200", L("200 cm", "200 cm", "200 cm", "200 cm"), 225),
    ],
  },
  {
    key: "inner-windows-comfort",
    name: L("Okna wewnętrzne antracyt", "Anthracite inner windows", "Innenfenster Anthrazit", "Binnenramen antraciet"),
    selectionType: "single",
    applies: isComfort,
    options: [free("none", NONE), opt("anthracite", L("Okna wewnętrzne antracyt (Comfort)", "Anthracite inner windows (Comfort)", "Innenfenster Anthrazit (Comfort)", "Binnenramen antraciet (Comfort)"), 452)],
  },
  {
    key: "inner-windows-premium",
    name: L("Okna wewnętrzne antracyt", "Anthracite inner windows", "Innenfenster Anthrazit", "Binnenramen antraciet"),
    selectionType: "single",
    applies: isPremium,
    options: [free("none", NONE), opt("anthracite", L("Okna wewnętrzne antracyt (Premium)", "Anthracite inner windows (Premium)", "Innenfenster Anthrazit (Premium)", "Binnenramen antraciet (Premium)"), 619)],
  },
  {
    key: "interior-extras",
    name: L("Dodatki wnętrza", "Interior extras", "Innenausstattung", "Interieur-extra's"),
    selectionType: "multi",
    applies: all,
    options: [
      opt("mirror-light", L("Lustro z podświetleniem", "Mirror with lighting", "Spiegel mit Beleuchtung", "Spiegel met verlichting"), 168),
      opt("mirror-cabinet", L("Szafka z lustrem i oświetleniem", "Cabinet with mirror and lighting", "Schrank mit Spiegel und Beleuchtung", "Kast met spiegel en verlichting"), 303),
      opt("mirror-wardrobe", L("Lustro na szafie", "Mirror on the wardrobe", "Spiegel am Schrank", "Spiegel op de kast"), 177),
      opt("tv-strips", L("Listwy za TV", "Strips behind the TV", "Leisten hinter dem Fernseher", "Lijsten achter de tv"), 405),
    ],
  },
  {
    key: "bunk-bed",
    name: L("Łóżko piętrowe", "Bunk bed", "Etagenbett", "Stapelbed"),
    selectionType: "multi",
    applies: (m) => m.hasRoom,
    options: [opt("bunk", L("Łóżko piętrowe zamiast zwykłego", "Bunk bed instead of the standard bed", "Etagenbett statt des normalen Betts", "Stapelbed in plaats van het gewone bed"), 548)],
  },
  {
    key: "fibo-bathroom",
    name: L("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
    selectionType: "multi",
    applies: isComfort,
    options: [opt("fibo", L("Łazienka we Fibo (tylko Comfort)", "Bathroom in Fibo (Comfort only)", "Bad in Fibo (nur Comfort)", "Badkamer in Fibo (alleen Comfort)"), 1619)],
  },
];

export const groupId = (key: string): string => detUuid(`group:${key}`);
export const optionId = (groupKey: string, optionKey: string): string => detUuid(`option:${groupKey}:${optionKey}`);

export function groupsForModel(model: ModelSource): GroupSource[] {
  return GROUPS.filter((group) => group.applies(model));
}
