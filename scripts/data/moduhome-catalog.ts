// Modu-Home (saunyidomki.pl, katalog PDF "Katalog sauny", stan 2026-10-19): 7 modeli saun fińskich
// i kompleksów wypoczynkowych. Źródło to katalog przesłany przez producenta wraz ze zdjęciami.
// Katalog nie podaje wymiarów, pojemności, wagi, izolacji ani fundamentu, więc produkty są szkicami
// (status draft) z tym, co katalog faktycznie mówi. Mail z listą braków: _docs/saunyidomki.
//
// Ceny w katalogu są brutto z VAT (PLN). Przeliczenie: brutto / 1,23 (zakładana stawka 23%) / kurs
// NBP EUR 4,3702 z 2026-10-19, zaokrąglone do pełnych centów.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:moduhome";
export const PRODUCER_ID = "e0030000-0000-4000-8000-000000000101";
export const NBP_EUR_RATE = 4.3702;
export const VAT_FACTOR = 1.23;
export const PHOTO_DIR = "_docs/saunyidomki/sauny finskie";

export const detUuid = (seed: string): string => {
  const h = createHash("sha1").update(`moduhome:${seed}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export const plnGrossToEurCents = (pln: number): number => Math.round((pln / VAT_FACTOR / NBP_EUR_RATE) * 100);

export const MODUHOME_PRODUCER = {
  name: "Modu-Home",
  nip: "CATALOG-MODUHOME",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent saun fińskich i kompleksów wypoczynkowych w gotowych modułach: od kompaktowej sauny na taras lub balkon po kompleks z sauną, pomieszczeniem na jacuzzi i dodatkowym pomieszczeniem. Każdy model ma ocieploną konstrukcję gotową do użytku przez cały rok, a wyposażenie, szyby i wykończenie dobiera się spośród płatnych opcji. Sauny są dostarczane specjalistycznym samochodem z dźwigiem HDS, który rozładowuje i ustawia je w wyznaczonym miejscu. Dla firm dostępny jest leasing, dla osób prywatnych kredyt ratalny.",
    "Producer of Finnish saunas and leisure complexes in ready-made modules: from a compact sauna for a terrace or balcony to a complex with a sauna, a hot tub room and an additional room. Every model has an insulated structure ready for year-round use, and the equipment, glazing and finish are chosen from paid options. Saunas are delivered by a specialist truck with an HDS crane that unloads and positions them at the designated spot. Leasing is available for companies and instalment loans for private customers.",
    "Hersteller finnischer Saunen und Freizeitkomplexe in fertigen Modulen: von der kompakten Sauna für Terrasse oder Balkon bis zum Komplex mit Sauna, Whirlpoolraum und zusätzlichem Raum. Jedes Modell hat eine gedämmte, ganzjährig nutzbare Konstruktion; Ausstattung, Verglasung und Ausführung werden aus kostenpflichtigen Optionen gewählt. Die Saunen werden mit einem Spezialfahrzeug mit HDS-Kran geliefert, der sie am vorgesehenen Ort ablädt und aufstellt. Für Firmen gibt es Leasing, für Privatkunden einen Ratenkredit.",
    "Producent van Finse sauna's en recreatiecomplexen in kant-en-klare modules: van een compacte sauna voor terras of balkon tot een complex met sauna, jacuzziruimte en extra ruimte. Elk model heeft een geïsoleerde constructie die het hele jaar bruikbaar is, en uitrusting, beglazing en afwerking kiest u uit betaalde opties. De sauna's worden geleverd met een speciale wagen met HDS-kraan, die ze op de aangewezen plek lost en plaatst. Voor bedrijven is er leasing, voor particulieren een afbetalingskrediet.",
  ),
} as const;

export const ELIGIBILITY_REASON = L(
  "Producent krajowy, dostawa z rozładunkiem dźwigiem HDS u klienta",
  "Domestic producer, delivery with HDS crane unloading at the customer's site",
  "Inländischer Hersteller, Lieferung mit Abladen per HDS-Kran beim Kunden",
  "Binnenlandse producent, levering met lossen via HDS-kraan bij de klant",
);

// ---------------------------------------------------------------------------
// Słownik opcji (etykiety w czterech językach). Cena zależy od modelu, więc grupy i opcje
// powstają osobno dla każdego modelu (grupa należy do producenta, ale cena opcji jest w wierszu opcji).
// ---------------------------------------------------------------------------
export const OPT = {
  doorWhite: L("Drzwi białe, hartowane 8 mm (w cenie)", "White tempered door, 8 mm (included)", "Weiße Tür, gehärtet 8 mm (inklusive)", "Witte deur, gehard 8 mm (inbegrepen)"),
  doorTinted: L("Drzwi przyciemniane, hartowane", "Tinted tempered door", "Getönte Tür, gehärtet", "Getinte deur, gehard"),
  doorAlu: L("Drzwi aluminiowe, przeszklone w całości", "Aluminium door, fully glazed", "Aluminiumtür, vollverglast", "Aluminium deur, volledig beglaasd"),

  glassWhiteHalf: L("Szyba biała 1/2, ok. 50% powierzchni ściany (bez dopłaty)", "White glass 1/2, about 50% of the wall (no surcharge)", "Weißes Glas 1/2, ca. 50 % der Wand (ohne Aufpreis)", "Wit glas 1/2, ca. 50% van de wand (zonder toeslag)"),
  glassTintedHalf: L("Szyba przyciemniana 1/2, ok. 50% powierzchni ściany", "Tinted glass 1/2, about 50% of the wall", "Getöntes Glas 1/2, ca. 50 % der Wand", "Getint glas 1/2, ca. 50% van de wand"),
  glassWhiteLarge: L("Szyba biała duża, ok. 80% powierzchni ściany (bez dopłaty)", "Large white glass, about 80% of the wall (no surcharge)", "Großes weißes Glas, ca. 80 % der Wand (ohne Aufpreis)", "Groot wit glas, ca. 80% van de wand (zonder toeslag)"),
  glassTintedLarge: L("Szyba przyciemniana duża, ok. 80% powierzchni ściany", "Large tinted glass, about 80% of the wall", "Großes getöntes Glas, ca. 80 % der Wand", "Groot getint glas, ca. 80% van de wand"),
  windowIncluded: L("Okno białe, hartowane 8 mm (w cenie)", "White tempered window, 8 mm (included)", "Weißes Fenster, gehärtet 8 mm (inklusive)", "Wit raam, gehard 8 mm (inbegrepen)"),
  glassDoubleFront: L("Szyba frontowa podwójna, biała", "Double front glass, white", "Doppelte Frontscheibe, weiß", "Dubbel voorglas, wit"),
  windows2Included: L("Okna białe, 2 szt., hartowane 8 mm (w cenie)", "White tempered windows, 2 pcs, 8 mm (included)", "Weiße Fenster, 2 Stk., gehärtet 8 mm (inklusive)", "Witte ramen, 2 stuks, gehard 8 mm (inbegrepen)"),
  windows2Double: L("Szyby frontowe podwójne, 2 szt., białe hartowane", "Double front glass panes, 2 pcs, white tempered", "Doppelte Frontscheiben, 2 Stk., weiß gehärtet", "Dubbele voorruiten, 2 stuks, wit gehard"),
  windows2TintedLarge: L("Szyby przyciemniane duże, 2 szt., ok. 80% powierzchni ściany", "Large tinted panes, 2 pcs, about 80% of the wall", "Große getönte Scheiben, 2 Stk., ca. 80 % der Wand", "Grote getinte ruiten, 2 stuks, ca. 80% van de wand"),
  sideWhite: L("Szyba boczna biała, hartowana (bez dopłaty)", "White tempered side glass (no surcharge)", "Weißes gehärtetes Seitenglas (ohne Aufpreis)", "Wit gehard zijglas (zonder toeslag)"),
  sideTintedSingle: L("Szyba boczna pojedyncza, przyciemniana, hartowana", "Single tinted tempered side glass", "Einfaches getöntes gehärtetes Seitenglas", "Enkel getint gehard zijglas"),
  sideTintedDouble: L("Szyba boczna podwójna, przyciemniana, hartowana", "Double tinted tempered side glass", "Doppeltes getöntes gehärtetes Seitenglas", "Dubbel getint gehard zijglas"),

  stoveIncluded: L("Piec 6 kW ze sterowaniem na piecu, kamienie 10 kg (w cenie)", "6 kW stove with on-unit control, 10 kg of stones (included)", "6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine (inklusive)", "Kachel 6 kW met bediening op de kachel, 10 kg stenen (inbegrepen)"),
  stoveHarvia9: L("Piec Harvia 9 kW (zmiana pieca i instalacja)", "Harvia 9 kW stove (stove change and installation)", "Harvia-Ofen 9 kW (Ofenwechsel und Installation)", "Harvia-kachel 9 kW (kachelwissel en installatie)"),

  stones: L("Dodatkowe kamienie do pieca (zmiana ilości)", "Additional stones for the stove (change of quantity)", "Zusätzliche Ofensteine (geänderte Menge)", "Extra stenen voor de kachel (andere hoeveelheid)"),
  controller: L("Sterownik SAUNA BOX Wi-Fi (z montażem)", "SAUNA BOX Wi-Fi controller (installed)", "SAUNA BOX WLAN-Steuerung (mit Montage)", "SAUNA BOX wifi-regelaar (inclusief montage)"),
  speaker: L("Nagłośnienie (jeden głośnik sterowany przez Bluetooth)", "Audio (one Bluetooth-controlled speaker)", "Beschallung (ein Bluetooth-Lautsprecher)", "Geluid (één luidspreker via Bluetooth)"),
  fullSpectrum: L("Promienniki Full Spectrum (instalacja, sterownik Wi-Fi, osprzęt i montaż; dowolna liczba za dopłatą)", "Full Spectrum heaters (installation, Wi-Fi controller, fittings and assembly; any number for an extra fee)", "Full-Spectrum-Strahler (Installation, WLAN-Steuerung, Zubehör und Montage; beliebige Anzahl gegen Aufpreis)", "Full Spectrum-stralers (installatie, wifi-regelaar, toebehoren en montage; elk aantal tegen meerprijs)"),
  abachi: L("Ławki z jednolitego drewna abachi", "Benches in solid abachi wood", "Bänke aus massivem Abachi-Holz", "Banken van massief abachihout"),
  benchLed: L("Wielokolorowe podświetlenie ławek LED", "Multicolour LED bench lighting", "Mehrfarbige LED-Bankbeleuchtung", "Meerkleurige led-verlichting van de banken"),
  benchL: L("Ławki w kształcie litery L", "L-shaped benches", "L-förmige Bänke", "L-vormige banken"),
  deckFloor: L("Podłoga z desek tarasowych w saunie", "Decking-board floor in the sauna", "Terrassendielenboden in der Sauna", "Terrasplankenvloer in de sauna"),

  extLightSpot: L("Oświetlenie zewnętrzne jednopunktowe", "Single-point exterior lighting", "Einpunkt-Außenbeleuchtung", "Enkelpunts buitenverlichting"),
  extLightLed: L("Oświetlenie zewnętrzne LED, białe", "White LED exterior lighting", "Weiße LED-Außenbeleuchtung", "Witte led-buitenverlichting"),
  lamelle: L("Lamele na elewacji zewnętrznej (cena zależna od ilości i umiejscowienia)", "Slats on the exterior facade (price depends on quantity and placement)", "Lamellen an der Außenfassade (Preis je nach Menge und Platzierung)", "Lamellen op de buitengevel (prijs afhankelijk van aantal en plaatsing)"),
  sheetRabekOnRequest: L("Blacha na rąbek na elewacji zewnętrznej (cena zależna od ilości)", "Standing-seam sheet on the exterior facade (price depends on quantity)", "Stehfalzblech an der Außenfassade (Preis je nach Menge)", "Felsplaat op de buitengevel (prijs afhankelijk van aantal)"),
  sheetRabek: L("Zewnętrzna blacha na rąbek, antracyt, ściany i dach", "Exterior standing-seam sheet, anthracite, walls and roof", "Außen-Stehfalzblech, anthrazit, Wände und Dach", "Buitenste felsplaat, antraciet, wanden en dak"),
  sheetFlat: L("Zewnętrzna płaska blacha, czarna lub antracyt, ściany i dach", "Exterior flat sheet, black or anthracite, walls and roof", "Außen-Flachblech, schwarz oder anthrazit, Wände und Dach", "Buitenste vlakke plaat, zwart of antraciet, wanden en dak"),
  extraPorch: L("Dodatkowy przedsionek (pomieszczenie za sauną)", "Additional vestibule (room behind the sauna)", "Zusätzlicher Vorraum (Raum hinter der Sauna)", "Extra voorportaal (ruimte achter de sauna)"),

  jacSideWindow: L("Szyba boczna w pomieszczeniu na jacuzzi, ok. 100 x 80 cm, pozioma, biała", "Side window in the hot tub room, about 100 x 80 cm, horizontal, white", "Seitenfenster im Whirlpoolraum, ca. 100 x 80 cm, waagerecht, weiß", "Zijraam in de jacuzziruimte, ca. 100 x 80 cm, liggend, wit"),
  jacFloorHeat: L("Ogrzewanie podłogowe w pomieszczeniu na jacuzzi", "Underfloor heating in the hot tub room", "Fußbodenheizung im Whirlpoolraum", "Vloerverwarming in de jacuzziruimte"),
  lamelleWood: L("Lamele drewniane w pomieszczeniu na jacuzzi (boczna ściana)", "Wooden slats in the hot tub room (side wall)", "Holzlamellen im Whirlpoolraum (Seitenwand)", "Houten lamellen in de jacuzziruimte (zijwand)"),

  vestFloorVinyl: L("Podłoga w przedsionku, panel winylowy", "Vestibule floor, vinyl panel", "Vorraumboden, Vinylpaneel", "Vloer in het voorportaal, vinylpaneel"),
  vestFloorHeat: L("Ogrzewanie podłogowe w przedsionku", "Underfloor heating in the vestibule", "Fußbodenheizung im Vorraum", "Vloerverwarming in het voorportaal"),

  colorBrown: L("Brąz (bez dopłaty)", "Brown (no surcharge)", "Braun (ohne Aufpreis)", "Bruin (zonder toeslag)"),
  colorOther: L("Inny kolor elewacji (ustalany indywidualnie)", "Other facade colour (agreed individually)", "Andere Fassadenfarbe (individuell vereinbart)", "Andere gevelkleur (individueel overeen te komen)"),
  colorBlack: L("Czarny (bez dopłaty)", "Black (no surcharge)", "Schwarz (ohne Aufpreis)", "Zwart (zonder toeslag)"),
  colorAnthracite: L("Antracyt (bez dopłaty)", "Anthracite (no surcharge)", "Anthrazit (ohne Aufpreis)", "Antraciet (zonder toeslag)"),
} satisfies Record<string, L10n>;

export type OptKey = keyof typeof OPT;

export const GRP = {
  door: L("Drzwi do sauny", "Sauna door", "Saunatür", "Saunadeur"),
  glassBack: L("Szyba na tylnej ścianie", "Glass on the rear wall", "Glas an der Rückwand", "Glas in de achterwand"),
  glassFront: L("Szyba na ścianie frontowej", "Glass on the front wall", "Glas an der Frontwand", "Glas in de voorwand"),
  glassFront2: L("Szyby na ścianie frontowej", "Glass on the front wall", "Gläser an der Frontwand", "Glas in de voorwand"),
  glassSide: L("Szyba boczna w saunie", "Side glass in the sauna", "Seitenglas in der Sauna", "Zijglas in de sauna"),
  stove: L("Piec", "Stove", "Ofen", "Kachel"),
  equipment: L("Wyposażenie sauny", "Sauna equipment", "Saunaausstattung", "Saunauitrusting"),
  exterior: L("Elewacja i oświetlenie zewnętrzne", "Facade and exterior lighting", "Fassade und Außenbeleuchtung", "Gevel en buitenverlichting"),
  jacuzzi: L("Pomieszczenie na jacuzzi", "Hot tub room", "Whirlpoolraum", "Jacuzziruimte"),
  vestibule: L("Przedsionek", "Vestibule", "Vorraum", "Voorportaal"),
  color: L("Kolor elewacji zewnętrznej", "Exterior facade colour", "Außenfarbe der Fassade", "Kleur van de buitengevel"),
} satisfies Record<string, L10n>;

export type GrpKey = keyof typeof GRP;

// Opcja w grupie: cena brutto PLN; 0 = w cenie; "request" = cena ustalana indywidualnie.
export type OptionPrice = number | "request";
export interface OptionDef {
  key: OptKey;
  pln: OptionPrice;
  isDefault?: boolean;
}
export interface GroupDef {
  key: GrpKey;
  selection: "single" | "multi";
  options: OptionDef[];
}

const doorsBasic = (aluminium: boolean): GroupDef => ({
  key: "door",
  selection: "single",
  options: [
    { key: "doorWhite", pln: 0, isDefault: true },
    { key: "doorTinted", pln: 140 },
    ...(aluminium ? [{ key: "doorAlu" as const, pln: 2700 }] : []),
  ],
});

const stoveGroup: GroupDef = {
  key: "stove",
  selection: "single",
  options: [
    { key: "stoveIncluded", pln: 0, isDefault: true },
    { key: "stoveHarvia9", pln: 1400 },
  ],
};

const colorBlackAnthracite: GroupDef = {
  key: "color",
  selection: "single",
  options: [
    { key: "colorBlack", pln: 0, isDefault: true },
    { key: "colorAnthracite", pln: 0 },
  ],
};

export interface PhotoDef {
  file: string; // nazwa pliku w PHOTO_DIR
}

export interface ModuhomeProduct {
  key: string;
  name: string;
  basePricePln: number;
  description: L10n;
  claddingMaterial?: L10n;
  electricalRequirement?: L10n;
  hasChangingArea?: boolean;
  changingAreaDescription?: L10n;
  groups: GroupDef[];
  photos: string[]; // pierwszy = okładka
}

const IW = (suffix: string) => `WhatsApp Image 2026-10-19 at 19.54.${suffix}.jpeg`;

export const SPECS_COMMON = {
  interiorWoodType: L("Świerk skandynawski", "Scandinavian spruce", "Skandinavische Fichte", "Scandinavisch vurenhout"),
  glazingType: L("Szkło hartowane 8 mm", "Tempered glass, 8 mm", "Gehärtetes Glas, 8 mm", "Gehard glas, 8 mm"),
};

const CLAD_BOAZERIA = L("Boazeria", "Tongue-and-groove cladding", "Profilholzverkleidung", "Potdekselbetimmering");
const CLAD_TRAPEZ = L("Blacha trapezowa", "Trapezoidal sheet", "Trapezblech", "Trapeziumplaat");
const CLAD_TRAPEZ_BOAZERIA = L(
  "Tył i bok z blachy trapezowej, przód z boazerii",
  "Rear and side in trapezoidal sheet, front in tongue-and-groove cladding",
  "Rück- und Seitenwand aus Trapezblech, Front aus Profilholzverkleidung",
  "Achter- en zijkant in trapeziumplaat, voorkant in potdekselbetimmering",
);
const ELEC_6KW = L("Piec 6 kW", "6 kW stove", "6-kW-Ofen", "Kachel 6 kW");

const kompleksEquipment = (fullSpectrumPln: number): GroupDef => ({
  key: "equipment",
  selection: "multi",
  options: [
    { key: "stones", pln: 150 },
    { key: "controller", pln: 750 },
    { key: "speaker", pln: 750 },
    { key: "fullSpectrum", pln: fullSpectrumPln },
    { key: "abachi", pln: 1800 },
    { key: "benchLed", pln: 600 },
    { key: "deckFloor", pln: 800 },
  ],
});

export const MODUHOME_PRODUCTS: ModuhomeProduct[] = [
  {
    key: "mini",
    name: "Modu-Home MINI",
    basePricePln: 11700,
    description: L(
      "Sauna fińska idealna na tarasy i balkony. W cenie podstawowej: piec 3,5 kW (230 V) ze sterowaniem na piecu, kamienie, drzwi do sauny białe (hartowane 8 mm), oświetlenie w saunie (białe LED pod ławką), drewno w saunie: świerk skandynawski.",
      "Finnish sauna ideal for terraces and balconies. Base price includes: 3.5 kW (230 V) stove with on-unit control, stones, white sauna door (tempered 8 mm), sauna lighting (white LED under the bench), Scandinavian spruce inside the sauna.",
      "Finnische Sauna, ideal für Terrassen und Balkone. Im Grundpreis enthalten: 3,5-kW-Ofen (230 V) mit Steuerung am Ofen, Steine, weiße Saunatür (gehärtet 8 mm), Saunabeleuchtung (weißes LED unter der Bank), skandinavische Fichte in der Sauna.",
      "Finse sauna, ideaal voor terrassen en balkons. In de basisprijs: kachel 3,5 kW (230 V) met bediening op de kachel, stenen, witte saunadeur (gehard 8 mm), saunaverlichting (wit led onder de bank), Scandinavisch vurenhout in de sauna.",
    ),
    electricalRequirement: L("Piec 3,5 kW, zasilanie 230 V", "3.5 kW stove, 230 V supply", "3,5-kW-Ofen, 230-V-Anschluss", "Kachel 3,5 kW, voeding 230 V"),
    groups: [
      {
        key: "door",
        selection: "single",
        options: [
          { key: "doorWhite", pln: 0, isDefault: true },
          { key: "doorTinted", pln: 140 },
        ],
      },
      {
        key: "equipment",
        selection: "multi",
        options: [
          { key: "speaker", pln: 750 },
          { key: "fullSpectrum", pln: 7000 },
          { key: "abachi", pln: 800 },
          { key: "benchLed", pln: 600 },
          { key: "deckFloor", pln: 500 },
        ],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightSpot", pln: 300 },
          { key: "lamelle", pln: "request" },
        ],
      },
      {
        key: "color",
        selection: "single",
        options: [
          { key: "colorBrown", pln: 0, isDefault: true },
          { key: "colorOther", pln: "request" },
        ],
      },
    ],
    photos: [IW("02 (6)"), IW("02 (7)"), IW("02 (10)"), IW("02 (8)"), IW("02 (9)"), IW("02"), IW("02 (1)"), IW("02 (2)"), IW("02 (3)")],
  },
  {
    key: "basic",
    name: "Modu-Home BASIC",
    basePricePln: 19800,
    description: L(
      "Sauna fińska łącząca prostotę z użytecznością. W cenie podstawowej: elewacja z boazerii, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski.",
      "Finnish sauna combining simplicity with usefulness. Base price includes: tongue-and-groove facade, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna.",
      "Finnische Sauna, die Schlichtheit mit Nutzwert verbindet. Im Grundpreis enthalten: Fassade aus Profilholz, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna.",
      "Finse sauna die eenvoud met bruikbaarheid combineert. In de basisprijs: gevel van potdekselbetimmering, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna.",
    ),
    claddingMaterial: CLAD_BOAZERIA,
    electricalRequirement: ELEC_6KW,
    groups: [
      doorsBasic(false),
      {
        key: "glassBack",
        selection: "single",
        options: [
          { key: "glassWhiteHalf", pln: 0, isDefault: true },
          { key: "glassTintedHalf", pln: 700 },
        ],
      },
      stoveGroup,
      {
        key: "equipment",
        selection: "multi",
        options: [
          { key: "stones", pln: 150 },
          { key: "controller", pln: 750 },
          { key: "speaker", pln: 750 },
          { key: "fullSpectrum", pln: 11700 },
          { key: "abachi", pln: 1800 },
          { key: "benchLed", pln: 600 },
          { key: "deckFloor", pln: 800 },
        ],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightSpot", pln: 300 },
          { key: "extLightLed", pln: 500 },
          { key: "lamelle", pln: "request" },
          { key: "sheetRabekOnRequest", pln: "request" },
        ],
      },
      colorBlackAnthracite,
    ],
    photos: [IW("03 (3)"), IW("03 (4)"), IW("03 (18)")],
  },
  {
    key: "eco",
    name: "Modu-Home ECO",
    basePricePln: 24500,
    description: L(
      "Sauna fińska łącząca ekologię z elegancją. W cenie podstawowej: elewacja z boazerii, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski. Szybę na ścianie frontowej wybiera się spośród czterech wariantów.",
      "Finnish sauna combining ecology with elegance. Base price includes: tongue-and-groove facade, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna. The glass on the front wall is chosen from four variants.",
      "Finnische Sauna, die Ökologie mit Eleganz verbindet. Im Grundpreis enthalten: Fassade aus Profilholz, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna. Das Glas an der Frontwand wird aus vier Varianten gewählt.",
      "Finse sauna die ecologie met elegantie combineert. In de basisprijs: gevel van potdekselbetimmering, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna. Het glas in de voorwand kiest u uit vier varianten.",
    ),
    claddingMaterial: CLAD_BOAZERIA,
    electricalRequirement: ELEC_6KW,
    groups: [
      doorsBasic(false),
      {
        key: "glassFront",
        selection: "single",
        options: [
          { key: "glassWhiteHalf", pln: 0, isDefault: true },
          { key: "glassTintedHalf", pln: 500 },
          { key: "glassWhiteLarge", pln: 0 },
          { key: "glassTintedLarge", pln: 800 },
        ],
      },
      stoveGroup,
      {
        key: "equipment",
        selection: "multi",
        options: [
          { key: "stones", pln: 150 },
          { key: "controller", pln: 750 },
          { key: "speaker", pln: 750 },
          { key: "fullSpectrum", pln: 13700 },
          { key: "abachi", pln: 1800 },
          { key: "benchLed", pln: 600 },
          { key: "deckFloor", pln: 800 },
        ],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightSpot", pln: 300 },
          { key: "extLightLed", pln: 700 },
          { key: "sheetRabekOnRequest", pln: "request" },
          { key: "lamelle", pln: "request" },
        ],
      },
      colorBlackAnthracite,
    ],
    photos: [IW("03 (15)"), IW("03 (16)"), IW("03 (17)"), IW("02 (4)"), IW("02 (5)"), IW("03 (2)")],
  },
  {
    key: "premium",
    name: "Modu-Home PREMIUM",
    basePricePln: 34900,
    description: L(
      "Sauna fińska z przedsionkiem, maksimum korzyści. W cenie podstawowej: elewacja z blachy trapezowej, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), okno na ścianie frontowej białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski.",
      "Finnish sauna with a vestibule, maximum benefits. Base price includes: trapezoidal sheet facade, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), white window on the front wall (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna.",
      "Finnische Sauna mit Vorraum, maximaler Nutzen. Im Grundpreis enthalten: Fassade aus Trapezblech, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), weißes Fenster an der Frontwand (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna.",
      "Finse sauna met voorportaal, maximaal voordeel. In de basisprijs: gevel van trapeziumplaat, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), wit raam in de voorwand (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna.",
    ),
    claddingMaterial: CLAD_TRAPEZ,
    electricalRequirement: ELEC_6KW,
    hasChangingArea: true,
    changingAreaDescription: L("Przedsionek przed sauną", "Vestibule in front of the sauna", "Vorraum vor der Sauna", "Voorportaal voor de sauna"),
    groups: [
      doorsBasic(true),
      {
        key: "glassFront",
        selection: "single",
        options: [
          { key: "windowIncluded", pln: 0, isDefault: true },
          { key: "glassDoubleFront", pln: 2600 },
          { key: "glassTintedLarge", pln: 1600 },
        ],
      },
      stoveGroup,
      {
        key: "equipment",
        selection: "multi",
        options: [
          { key: "stones", pln: 150 },
          { key: "controller", pln: 750 },
          { key: "speaker", pln: 750 },
          { key: "fullSpectrum", pln: 13700 },
          { key: "abachi", pln: 1800 },
          { key: "benchLed", pln: 600 },
          { key: "benchL", pln: 700 },
        ],
      },
      {
        key: "vestibule",
        selection: "multi",
        options: [
          { key: "vestFloorVinyl", pln: 450 },
          { key: "vestFloorHeat", pln: 800 },
        ],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightSpot", pln: 300 },
          { key: "extLightLed", pln: 700 },
          { key: "lamelle", pln: "request" },
          { key: "sheetRabek", pln: 2900 },
          { key: "sheetFlat", pln: 1400 },
        ],
      },
    ],
    photos: [],
  },
  {
    key: "kompleks-basic",
    name: "Modu-Home Kompleks BASIC",
    basePricePln: 37800,
    description: L(
      "Kompleks wypoczynkowy: sauna fińska z otwartym pomieszczeniem na jacuzzi (jacuzzi nie jest wliczone w opis katalogowy). W cenie podstawowej: elewacja z blachy trapezowej, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), okno na ścianie frontowej białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski. W pomieszczeniu na jacuzzi ściany i sufit z boazerii, podłoga z deski kompozytowej w kolorze grafitowym.",
      "Leisure complex: a Finnish sauna with an open room for a hot tub (the hot tub itself is not part of the catalogue description). Base price includes: trapezoidal sheet facade, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), white window on the front wall (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna. In the hot tub room the walls and ceiling are tongue-and-groove cladding and the floor is graphite composite decking.",
      "Freizeitkomplex: finnische Sauna mit offenem Raum für einen Whirlpool (der Whirlpool selbst ist nicht Teil der Katalogbeschreibung). Im Grundpreis enthalten: Fassade aus Trapezblech, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), weißes Fenster an der Frontwand (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna. Im Whirlpoolraum sind Wände und Decke aus Profilholz, der Boden aus graphitfarbenem Verbunddielen.",
      "Recreatiecomplex: Finse sauna met een open ruimte voor een jacuzzi (de jacuzzi zelf maakt geen deel uit van de cataloogomschrijving). In de basisprijs: gevel van trapeziumplaat, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), wit raam in de voorwand (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna. In de jacuzziruimte zijn wanden en plafond van potdekselbetimmering en is de vloer van grafietkleurig composiet.",
    ),
    claddingMaterial: CLAD_TRAPEZ,
    electricalRequirement: ELEC_6KW,
    groups: [
      doorsBasic(false),
      {
        key: "glassFront",
        selection: "single",
        options: [
          { key: "windowIncluded", pln: 0, isDefault: true },
          { key: "glassTintedLarge", pln: 1600 },
        ],
      },
      stoveGroup,
      kompleksEquipment(13700),
      {
        key: "jacuzzi",
        selection: "multi",
        options: [{ key: "lamelleWood", pln: 2500 }],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightLed", pln: 700 },
          { key: "lamelle", pln: "request" },
          { key: "sheetRabek", pln: 2900 },
        ],
      },
    ],
    photos: [IW("02 (11)"), IW("02 (12)"), IW("03"), IW("03 (1)")],
  },
  {
    key: "kompleks-eco",
    name: "Modu-Home Kompleks ECO",
    basePricePln: 47800,
    description: L(
      "Kompleks wypoczynkowy: sauna fińska z zamkniętym pomieszczeniem na jacuzzi. W cenie podstawowej: elewacja tylna i boczna z blachy trapezowej, przód z boazerii, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), okna (2 szt.) na ścianie frontowej białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski. W pomieszczeniu na jacuzzi ściany i sufit z paneli PCV, podłoga z paneli winylowych.",
      "Leisure complex: a Finnish sauna with an enclosed room for a hot tub. Base price includes: rear and side facade in trapezoidal sheet, front in tongue-and-groove cladding, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), two white windows on the front wall (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna. In the hot tub room the walls and ceiling are PVC panels and the floor is vinyl panels.",
      "Freizeitkomplex: finnische Sauna mit geschlossenem Raum für einen Whirlpool. Im Grundpreis enthalten: Rück- und Seitenfassade aus Trapezblech, Front aus Profilholz, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), zwei weiße Fenster an der Frontwand (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna. Im Whirlpoolraum bestehen Wände und Decke aus PVC-Paneelen, der Boden aus Vinylpaneelen.",
      "Recreatiecomplex: Finse sauna met een gesloten ruimte voor een jacuzzi. In de basisprijs: achter- en zijgevel van trapeziumplaat, voorkant van potdekselbetimmering, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), twee witte ramen in de voorwand (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna. In de jacuzziruimte zijn wanden en plafond van pvc-panelen en de vloer van vinylpanelen.",
    ),
    claddingMaterial: CLAD_TRAPEZ_BOAZERIA,
    electricalRequirement: ELEC_6KW,
    groups: [
      doorsBasic(true),
      {
        key: "glassFront2",
        selection: "single",
        options: [
          { key: "windows2Included", pln: 0, isDefault: true },
          { key: "windows2Double", pln: 5200 },
          { key: "windows2TintedLarge", pln: 3200 },
        ],
      },
      {
        key: "glassSide",
        selection: "single",
        options: [
          { key: "sideWhite", pln: 0, isDefault: true },
          { key: "sideTintedSingle", pln: 500 },
          { key: "sideTintedDouble", pln: 1000 },
        ],
      },
      stoveGroup,
      kompleksEquipment(13700),
      {
        key: "jacuzzi",
        selection: "multi",
        options: [
          { key: "jacSideWindow", pln: 1100 },
          { key: "jacFloorHeat", pln: 800 },
        ],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightLed", pln: 700 },
          { key: "lamelle", pln: "request" },
          { key: "sheetRabek", pln: 2900 },
          { key: "sheetFlat", pln: 1400 },
          { key: "extraPorch", pln: 2600 },
        ],
      },
    ],
    photos: [],
  },
  {
    key: "kompleks-premium",
    name: "Modu-Home Kompleks PREMIUM",
    basePricePln: 64900,
    description: L(
      "Kompleks wypoczynkowy: sauna fińska z zamkniętym pomieszczeniem na jacuzzi oraz dodatkowym pomieszczeniem. W cenie podstawowej: elewacja tylna i boczna z blachy trapezowej, przód z boazerii, piec 6 kW ze sterowaniem na piecu, kamienie 10 kg, drzwi do sauny białe (hartowane 8 mm), okna (2 szt.) na ścianie frontowej białe (hartowane 8 mm), oświetlenie w saunie typu lampa abażur, drewno w saunie: świerk skandynawski. W pomieszczeniu na jacuzzi ściany i sufit z paneli PCV, podłoga z paneli winylowych.",
      "Leisure complex: a Finnish sauna with an enclosed room for a hot tub and an additional room. Base price includes: rear and side facade in trapezoidal sheet, front in tongue-and-groove cladding, 6 kW stove with on-unit control, 10 kg of stones, white sauna door (tempered 8 mm), two white windows on the front wall (tempered 8 mm), lampshade-type sauna lighting, Scandinavian spruce inside the sauna. In the hot tub room the walls and ceiling are PVC panels and the floor is vinyl panels.",
      "Freizeitkomplex: finnische Sauna mit geschlossenem Raum für einen Whirlpool und einem zusätzlichen Raum. Im Grundpreis enthalten: Rück- und Seitenfassade aus Trapezblech, Front aus Profilholz, 6-kW-Ofen mit Steuerung am Ofen, 10 kg Steine, weiße Saunatür (gehärtet 8 mm), zwei weiße Fenster an der Frontwand (gehärtet 8 mm), Saunabeleuchtung als Schirmlampe, skandinavische Fichte in der Sauna. Im Whirlpoolraum bestehen Wände und Decke aus PVC-Paneelen, der Boden aus Vinylpaneelen.",
      "Recreatiecomplex: Finse sauna met een gesloten ruimte voor een jacuzzi en een extra ruimte. In de basisprijs: achter- en zijgevel van trapeziumplaat, voorkant van potdekselbetimmering, kachel 6 kW met bediening op de kachel, 10 kg stenen, witte saunadeur (gehard 8 mm), twee witte ramen in de voorwand (gehard 8 mm), saunaverlichting als lampenkap, Scandinavisch vurenhout in de sauna. In de jacuzziruimte zijn wanden en plafond van pvc-panelen en de vloer van vinylpanelen.",
    ),
    claddingMaterial: CLAD_TRAPEZ_BOAZERIA,
    electricalRequirement: ELEC_6KW,
    groups: [
      doorsBasic(true),
      {
        key: "glassFront2",
        selection: "single",
        options: [
          { key: "windows2Included", pln: 0, isDefault: true },
          { key: "windows2Double", pln: 5200 },
          { key: "windows2TintedLarge", pln: 3200 },
        ],
      },
      {
        key: "glassSide",
        selection: "single",
        options: [
          { key: "sideWhite", pln: 0, isDefault: true },
          { key: "sideTintedSingle", pln: 500 },
          { key: "sideTintedDouble", pln: 800 },
        ],
      },
      stoveGroup,
      kompleksEquipment(13700),
      {
        key: "jacuzzi",
        selection: "multi",
        options: [{ key: "jacSideWindow", pln: 1100 }],
      },
      {
        key: "exterior",
        selection: "multi",
        options: [
          { key: "extLightLed", pln: 700 },
          { key: "lamelle", pln: "request" },
          { key: "sheetRabek", pln: 2900 },
          { key: "sheetFlat", pln: 1400 },
        ],
      },
    ],
    photos: [],
  },
];
