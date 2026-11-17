// Kuchnie ogrodowe (spec 0086, tabela "Dane produktów"): 4 kuchnie w obudowie Wooden Dream House i 6 zestawów
// modułowych sprzedawanych jako produkt ModularHub. Źródło: _docs/kuchnie-ogrodowe-dla-inwestora/ (katalog PDF,
// catalog.html, przeglad.md). Ceny w EUR dokładnie jak w katalogu. Dostawca zestawów modułowych nie występuje
// nigdzie w tych danych (AC-5, pilnuje outdoor-kitchens-catalog.test.ts).
import { createHash } from "node:crypto";
import type {
  OutdoorKitchenEquipmentState,
  OutdoorKitchenTechnicalSpecs,
  OutdoorKitchenType,
} from "../../lib/product-technical-specs";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export interface L10nList {
  pl: string[];
  en: string[];
  de: string[];
  nl: string[];
}

export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`outdoor-kitchens:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// Istniejący producent Wooden Dream House (ten sam id w dev i prod, import saun spec 0061).
export const WDH_PRODUCER_ID = "24e54122-9cf0-470b-96af-6e97e5cfcdf5";

// Producent marki własnej (AC-4): konto techniczne bez możliwości logowania (adres .invalid nie odbierze linku).
export const BRAND_USER_ID = "catalog-import:modularhub-europe";
export const BRAND_USER_EMAIL = "platform-brand@modularhubeurope.invalid";
export const BRAND_PRODUCER_ID = detUuid("producer:modularhub-europe");
export const BRAND_PRODUCER_NAME = "ModularHub Europe";
export const BRAND_PRODUCER_NIP = "MHE-OWN";

export const productIdOf = (key: string) => detUuid(`product:${key}`);
export const variantIdOf = (key: string) => detUuid(`variant:${key}`);
export const groupIdOf = (productKey: string, groupKey: string) => detUuid(`group:${productKey}:${groupKey}`);
export const optionIdOf = (productKey: string, groupKey: string, optionKey: string) =>
  detUuid(`option:${productKey}:${groupKey}:${optionKey}`);

export interface KitchenOption {
  key: string;
  label: L10n;
  /** Dopłata w EUR; null znaczy "na zapytanie". */
  priceEur: number | null;
}

export interface KitchenOptionGroup {
  key: string;
  name: L10n;
  selectionType: "single" | "multi";
  options: KitchenOption[];
}

export interface OutdoorKitchen {
  key: string;
  producer: "wdh" | "brand";
  name: L10n;
  description: L10n;
  priceEur: number;
  kitchenType: OutdoorKitchenType;
  externalDimensionsCm: OutdoorKitchenTechnicalSpecs["externalDimensionsCm"];
  internalDimensionsCm?: OutdoorKitchenTechnicalSpecs["internalDimensionsCm"];
  equipment: Record<"grill" | "sink" | "fridge" | "cabinets" | "lighting", OutdoorKitchenEquipmentState>;
  closable: boolean;
  bodyMaterial: L10n;
  worktopMaterial?: L10n;
  standardFeatures: L10nList;
  weightKg?: number;
  foundationRequirement?: L10n;
  deliveryNote: L10n;
  optionGroups: KitchenOptionGroup[];
  /** Pliki z _docs/kuchnie-ogrodowe-dla-inwestora/pdf-build/img/, pierwszy to okładka. */
  photos: string[];
}

const same = (text: string): L10n => ({ pl: text, en: text, de: text, nl: text });

// --- Wooden Dream House: wspólne dane ---------------------------------------------------

const WDH_EXTERNAL = { length: 340, width: 90, height: 240 };
const WDH_INTERNAL = { length: 300, width: 80, height: 220 };
const WDH_WEIGHT = 600;
const WDH_FOUNDATION: L10n = {
  pl: "Płyta betonowa grubości 15 cm, większa od kuchni o 10 cm z każdej strony",
  en: "Concrete slab 15 cm thick, 10 cm larger than the kitchen on every side",
  de: "Betonplatte, 15 cm stark, auf jeder Seite 10 cm größer als die Küche",
  nl: "Betonplaat van 15 cm dik, aan elke kant 10 cm groter dan de keuken",
};
const WDH_DELIVERY: L10n = {
  pl: "Dostawa w całości, złożona kuchnia ustawiana na przygotowanej płycie",
  en: "Delivered in one piece, the assembled kitchen is placed on the prepared slab",
  de: "Lieferung in einem Stück, die montierte Küche wird auf die vorbereitete Platte gestellt",
  nl: "Geleverd in één stuk, de gemonteerde keuken wordt op de voorbereide plaat geplaatst",
};
const WDH_BOX_EQUIPMENT = { grill: "extra", sink: "extra", fridge: "extra", cabinets: "extra", lighting: "included" } as const;

const EQUIPMENT_GROUP: L10n = { pl: "Wyposażenie", en: "Equipment", de: "Ausstattung", nl: "Uitrusting" };

const WDH_ADDONS: Record<string, L10n> = {
  "szafki-hpl": { pl: "Szafki z płyty HPL", en: "HPL cabinets", de: "Schränke aus HPL", nl: "HPL kasten" },
  "szafki-nierdzewne": {
    pl: "Szafki ze stali nierdzewnej",
    en: "Stainless steel cabinets",
    de: "Schränke aus Edelstahl",
    nl: "Roestvrijstalen kasten",
  },
  grill: { pl: "Grill", en: "Grill", de: "Grill", nl: "Grill" },
  zlew: { pl: "Zlew", en: "Sink", de: "Spüle", nl: "Spoelbak" },
  lodowka: { pl: "Lodówka", en: "Fridge", de: "Kühlschrank", nl: "Koelkast" },
  donice: { pl: "Donice", en: "Planters", de: "Pflanzkästen", nl: "Plantenbakken" },
  "donice-boczne": {
    pl: "Donice na ścianie bocznej",
    en: "Planters on the side wall",
    de: "Pflanzkästen an der Seitenwand",
    nl: "Plantenbakken op de zijwand",
  },
  silowniki: {
    pl: "Siłowniki elektryczne dachu",
    en: "Electric roof actuators",
    de: "Elektrische Dachantriebe",
    nl: "Elektrische dakaandrijving",
  },
  "inne-drewno": {
    pl: "Inny gatunek drewna",
    en: "Other timber species",
    de: "Andere Holzart",
    nl: "Andere houtsoort",
  },
  "kolor-na-zamowienie": {
    pl: "Kolor na zamówienie",
    en: "Custom colour",
    de: "Farbe nach Wunsch",
    nl: "Kleur op bestelling",
  },
};

function wdhEquipmentGroup(keys: string[]): KitchenOptionGroup[] {
  return [
    {
      key: "wyposazenie",
      name: EQUIPMENT_GROUP,
      selectionType: "multi",
      options: keys.map((key) => ({ key, label: WDH_ADDONS[key], priceEur: null })),
    },
  ];
}

const LED_AND_SOCKETS = {
  pl: "4 gniazda elektryczne i oświetlenie LED",
  en: "4 power sockets and LED lighting",
  de: "4 Steckdosen und LED Beleuchtung",
  nl: "4 stopcontacten en ledverlichting",
};

// --- ModularHub: wspólne dane zestawów modułowych --------------------------------------

const MODULAR_BODY: L10n = {
  pl: "Stal ocynkowana malowana proszkowo",
  en: "Galvanised, powder coated steel",
  de: "Verzinkter, pulverbeschichteter Stahl",
  nl: "Verzinkt, gepoedercoat staal",
};
const MODULAR_WORKTOP: L10n = {
  pl: "HPL 12 mm, odporny na wysoką temperaturę",
  en: "12 mm HPL, heat resistant",
  de: "12 mm HPL, hitzebeständig",
  nl: "12 mm HPL, hittebestendig",
};
const MODULAR_DELIVERY: L10n = {
  pl: "Dostawa w całości złożona, gotowa do podłączenia (plug and play)",
  en: "Delivered fully assembled and ready to connect (plug and play)",
  de: "Vollständig montiert geliefert und anschlussfertig (Plug and Play)",
  nl: "Volledig gemonteerd geleverd en klaar om aan te sluiten (plug and play)",
};
const MODULAR_EQUIPMENT = { grill: "included", sink: "included", fridge: "none", cabinets: "included", lighting: "none" } as const;

const GAS_GRILL = { pl: "Grill gazowy", en: "Gas grill", de: "Gasgrill", nl: "Gasgrill" };
const SINK_TAP = { pl: "Zlew z baterią", en: "Sink with tap", de: "Spüle mit Armatur", nl: "Spoelbak met kraan" };
const CABINETS = {
  pl: "Szafki i szuflady w korpusie stalowym",
  en: "Cabinets and drawers in a steel body",
  de: "Schränke und Schubladen im Stahlkorpus",
  nl: "Kasten en lades in een stalen romp",
};

function list(...items: L10n[]): L10nList {
  return {
    pl: items.map((item) => item.pl),
    en: items.map((item) => item.en),
    de: items.map((item) => item.de),
    nl: items.map((item) => item.nl),
  };
}

const COLOR_GROUP: L10n = { pl: "Kolor", en: "Colour", de: "Farbe", nl: "Kleur" };
const LAYOUT_GROUP: L10n = { pl: "Układ", en: "Layout", de: "Aufstellung", nl: "Opstelling" };
const ral = (code: string, pl: string, en: string, de: string, nl: string): KitchenOption => ({
  key: `ral-${code}`,
  label: { pl: `${pl} RAL ${code}`, en: `${en} RAL ${code}`, de: `${de} RAL ${code}`, nl: `${nl} RAL ${code}` },
  priceEur: 0,
});
const RAL_7016 = ral("7016", "Antracyt", "Anthracite", "Anthrazit", "Antraciet");
const RAL_9005 = ral("9005", "Czarny", "Black", "Schwarz", "Zwart");
const RAL_9001 = ral("9001", "Kremowy biały", "Cream white", "Cremeweiß", "Crèmewit");
const RAL_7039 = ral("7039", "Szary kwarcowy", "Quartz grey", "Quarzgrau", "Kwartsgrijs");

function layoutGroup(islandEur: number): KitchenOptionGroup[] {
  return [
    {
      key: "uklad",
      name: LAYOUT_GROUP,
      selectionType: "single",
      options: [
        {
          key: "przy-scianie",
          label: { pl: "Przy ścianie", en: "Against a wall", de: "An der Wand", nl: "Tegen een wand" },
          priceEur: 0,
        },
        {
          key: "wyspa",
          label: {
            pl: "Wyspa z wykończonymi tylnymi panelami",
            en: "Island with finished back panels",
            de: "Insel mit verkleideten Rückwänden",
            nl: "Eiland met afgewerkte achterpanelen",
          },
          priceEur: islandEur,
        },
      ],
    },
  ];
}

const PREMIUM_DECOR = {
  pl: "Front i blat z HPL w dekorze premium",
  en: "Front and worktop in premium decor HPL",
  de: "Front und Arbeitsplatte aus HPL im Premiumdekor",
  nl: "Front en werkblad in HPL met premium decor",
};

export const KITCHENS: OutdoorKitchen[] = [
  {
    key: "sky-kitchen-wood",
    producer: "wdh",
    name: same("Sky Kitchen Wood"),
    description: {
      pl: "Zamykana kuchnia ogrodowa w drewnianej obudowie. Ściany z drewna termowanego, stalowa rama i dach, który po otwarciu tworzy zadaszenie nad blatem. Szafki, grill i sprzęt dobierasz osobno.",
      en: "A lockable outdoor kitchen in a timber housing. Thermally modified timber walls, a steel frame and a roof that becomes a canopy over the worktop when opened. Cabinets, grill and appliances are chosen separately.",
      de: "Eine abschließbare Outdoorküche im Holzgehäuse. Wände aus Thermoholz, ein Stahlrahmen und ein Dach, das geöffnet ein Vordach über der Arbeitsfläche bildet. Schränke, Grill und Geräte wählen Sie separat.",
      nl: "Een afsluitbare buitenkeuken in een houten behuizing. Wanden van thermisch gemodificeerd hout, een stalen frame en een dak dat geopend een overkapping boven het werkblad vormt. Kasten, grill en apparatuur kiest u apart.",
    },
    priceEur: 6500,
    kitchenType: "box",
    externalDimensionsCm: WDH_EXTERNAL,
    internalDimensionsCm: WDH_INTERNAL,
    equipment: WDH_BOX_EQUIPMENT,
    closable: true,
    bodyMaterial: {
      pl: "Stal malowana proszkowo, ściany z drewna termowanego",
      en: "Powder coated steel, thermally modified timber walls",
      de: "Pulverbeschichteter Stahl, Wände aus Thermoholz",
      nl: "Gepoedercoat staal, wanden van thermisch gemodificeerd hout",
    },
    standardFeatures: list(
      {
        pl: "Ściany z drewna termowanego wewnątrz i na zewnątrz",
        en: "Thermally modified timber walls inside and out",
        de: "Wände aus Thermoholz innen und außen",
        nl: "Wanden van thermisch gemodificeerd hout, binnen en buiten",
      },
      {
        pl: "Rama ze stali malowanej proszkowo, stalowa tylna ściana",
        en: "Powder coated steel frame, steel rear wall",
        de: "Rahmen aus pulverbeschichtetem Stahl, Rückwand aus Stahl",
        nl: "Frame van gepoedercoat staal, stalen achterwand",
      },
      {
        pl: "Drzwi kompozytowe, dach z paneli tworzący zadaszenie",
        en: "Composite door, panel roof forming a canopy",
        de: "Verbundtür, Paneeldach als Vordach",
        nl: "Composietdeur, paneeldak dat een overkapping vormt",
      },
      LED_AND_SOCKETS,
    ),
    weightKg: WDH_WEIGHT,
    foundationRequirement: WDH_FOUNDATION,
    deliveryNote: WDH_DELIVERY,
    optionGroups: wdhEquipmentGroup([
      "szafki-hpl",
      "szafki-nierdzewne",
      "grill",
      "zlew",
      "lodowka",
      "donice",
      "silowniki",
      "inne-drewno",
    ]),
    photos: ["wdh-wood-1.jpg", "wdh-wood-2.jpg"],
  },
  {
    key: "sky-kitchen-slide",
    producer: "wdh",
    name: same("Sky Kitchen Slide"),
    description: {
      pl: "Zamykana kuchnia ogrodowa w obudowie z paneli aluminiowych w kolorze antracytu. Dwuskrzydłowe drzwi w okleinie drewnopodobnej i dach wysuwany nad całą szerokość drzwi. Szafki, grill i sprzęt dobierasz osobno.",
      en: "A lockable outdoor kitchen in an anthracite aluminium panel housing. Double doors in a wood effect finish and a roof that slides out over the full width of the doors. Cabinets, grill and appliances are chosen separately.",
      de: "Eine abschließbare Outdoorküche im Gehäuse aus anthrazitfarbenen Aluminiumpaneelen. Zweiflügelige Türen in Holzoptik und ein Dach, das über die volle Türbreite ausfährt. Schränke, Grill und Geräte wählen Sie separat.",
      nl: "Een afsluitbare buitenkeuken in een behuizing van antracietkleurige aluminium panelen. Dubbele deuren in houtlook en een dak dat over de volle breedte van de deuren uitschuift. Kasten, grill en apparatuur kiest u apart.",
    },
    priceEur: 6500,
    kitchenType: "box",
    externalDimensionsCm: WDH_EXTERNAL,
    internalDimensionsCm: WDH_INTERNAL,
    equipment: WDH_BOX_EQUIPMENT,
    closable: true,
    bodyMaterial: {
      pl: "Stal malowana proszkowo, panele aluminiowe kompozytowe RAL 7016",
      en: "Powder coated steel, aluminium composite panels RAL 7016",
      de: "Pulverbeschichteter Stahl, Aluminiumverbundpaneele RAL 7016",
      nl: "Gepoedercoat staal, aluminium composietpanelen RAL 7016",
    },
    standardFeatures: list(
      {
        pl: "Panele aluminiowe kompozytowe w kolorze antracytu wewnątrz i na zewnątrz",
        en: "Anthracite aluminium composite panels inside and out",
        de: "Anthrazitfarbene Aluminiumverbundpaneele innen und außen",
        nl: "Antracietkleurige aluminium composietpanelen, binnen en buiten",
      },
      {
        pl: "Drzwi dwuskrzydłowe w okleinie drewnopodobnej",
        en: "Double doors in a wood effect finish",
        de: "Zweiflügelige Türen in Holzoptik",
        nl: "Dubbele deuren in houtlook",
      },
      {
        pl: "Dach wysuwany nad całą szerokość drzwi",
        en: "Roof slides out over the full width of the doors",
        de: "Dach fährt über die volle Türbreite aus",
        nl: "Dak schuift uit over de volle breedte van de deuren",
      },
      LED_AND_SOCKETS,
    ),
    weightKg: WDH_WEIGHT,
    foundationRequirement: WDH_FOUNDATION,
    deliveryNote: WDH_DELIVERY,
    optionGroups: wdhEquipmentGroup(["szafki-hpl", "szafki-nierdzewne", "grill", "zlew", "lodowka", "donice-boczne"]),
    photos: ["wdh-slide-1.jpg", "wdh-slide-2.jpg"],
  },
  {
    key: "sky-kitchen-prestige",
    producer: "wdh",
    name: same("Sky Kitchen Prestige"),
    description: {
      pl: "Zamykana kuchnia ogrodowa w obudowie z paneli aluminiowych. Siłowniki elektryczne podnoszą dach, który tworzy zadaszenie nad strefą gotowania. Szafki, grill i sprzęt dobierasz osobno.",
      en: "A lockable outdoor kitchen in an aluminium panel housing. Electric actuators lift the roof into a canopy over the cooking area. Cabinets, grill and appliances are chosen separately.",
      de: "Eine abschließbare Outdoorküche im Gehäuse aus Aluminiumpaneelen. Elektrische Antriebe heben das Dach zu einem Vordach über dem Kochbereich. Schränke, Grill und Geräte wählen Sie separat.",
      nl: "Een afsluitbare buitenkeuken in een behuizing van aluminium panelen. Elektrische aandrijvingen tillen het dak op tot een overkapping boven de kookzone. Kasten, grill en apparatuur kiest u apart.",
    },
    priceEur: 7500,
    kitchenType: "box",
    externalDimensionsCm: WDH_EXTERNAL,
    internalDimensionsCm: WDH_INTERNAL,
    equipment: WDH_BOX_EQUIPMENT,
    closable: true,
    bodyMaterial: {
      pl: "Stal malowana proszkowo, panele aluminiowe kompozytowe",
      en: "Powder coated steel, aluminium composite panels",
      de: "Pulverbeschichteter Stahl, Aluminiumverbundpaneele",
      nl: "Gepoedercoat staal, aluminium composietpanelen",
    },
    standardFeatures: list(
      {
        pl: "Panele aluminiowe kompozytowe wewnątrz i na zewnątrz",
        en: "Aluminium composite panels inside and out",
        de: "Aluminiumverbundpaneele innen und außen",
        nl: "Aluminium composietpanelen, binnen en buiten",
      },
      {
        pl: "Siłowniki elektryczne podnoszą dach w zadaszenie",
        en: "Electric actuators lift the roof into a canopy",
        de: "Elektrische Antriebe heben das Dach zum Vordach",
        nl: "Elektrische aandrijvingen tillen het dak op tot een overkapping",
      },
      {
        pl: "Stalowa tylna ściana i panel dachu",
        en: "Steel rear wall and roof panel",
        de: "Rückwand und Dachpaneel aus Stahl",
        nl: "Stalen achterwand en dakpaneel",
      },
      LED_AND_SOCKETS,
    ),
    weightKg: WDH_WEIGHT,
    foundationRequirement: WDH_FOUNDATION,
    deliveryNote: WDH_DELIVERY,
    optionGroups: wdhEquipmentGroup(["szafki-hpl", "szafki-nierdzewne", "grill", "zlew", "lodowka", "donice"]),
    photos: ["wdh-prestige-1.jpg", "wdh-prestige-2.jpg"],
  },
  {
    key: "sky-kitchen-prestige-set",
    producer: "wdh",
    name: same("Sky Kitchen Prestige Set"),
    description: {
      pl: "Kuchnia w obudowie gotowa do gotowania: ta sama zamykana skrzynia co Prestige, dostarczana z szafkami z płyty HPL i ceramicznym grillem typu kamado w cenie. Wystarczy ustawić, podłączyć i zacząć gotować.",
      en: "A box kitchen ready to cook: the same lockable enclosure as Prestige, delivered with HPL cabinets and a kamado style ceramic grill included. Place it, connect it and start cooking.",
      de: "Eine Küche im Gehäuse, bereit zum Kochen: das gleiche abschließbare Gehäuse wie Prestige, geliefert mit HPL Schränken und einem keramischen Kamado Grill im Preis. Aufstellen, anschließen, loskochen.",
      nl: "Een keuken in een behuizing, klaar om te koken: dezelfde afsluitbare behuizing als Prestige, geleverd met HPL kasten en een keramische kamadogrill inbegrepen. Plaatsen, aansluiten en koken.",
    },
    priceEur: 15600,
    kitchenType: "box",
    externalDimensionsCm: WDH_EXTERNAL,
    internalDimensionsCm: WDH_INTERNAL,
    equipment: { grill: "included", sink: "extra", fridge: "extra", cabinets: "included", lighting: "included" },
    closable: true,
    bodyMaterial: {
      pl: "Stal malowana proszkowo, panele aluminiowe kompozytowe RAL 7016",
      en: "Powder coated steel, aluminium composite panels RAL 7016",
      de: "Pulverbeschichteter Stahl, Aluminiumverbundpaneele RAL 7016",
      nl: "Gepoedercoat staal, aluminium composietpanelen RAL 7016",
    },
    standardFeatures: list(
      {
        pl: "Obudowa z paneli aluminiowych kompozytowych",
        en: "Enclosure with an aluminium composite exterior",
        de: "Gehäuse mit Aluminiumverbund Außenseite",
        nl: "Behuizing met aluminium composiet buitenzijde",
      },
      {
        pl: "Szafki z płyty HPL, montowane na miejscu",
        en: "HPL cabinets, installed on site",
        de: "HPL Schränke, vor Ort montiert",
        nl: "HPL kasten, ter plaatse gemonteerd",
      },
      {
        pl: "Ceramiczny grill typu kamado",
        en: "Kamado style ceramic grill",
        de: "Keramischer Grill im Kamado Stil",
        nl: "Keramische grill in kamadostijl",
      },
      LED_AND_SOCKETS,
    ),
    weightKg: WDH_WEIGHT,
    foundationRequirement: WDH_FOUNDATION,
    deliveryNote: WDH_DELIVERY,
    optionGroups: wdhEquipmentGroup(["lodowka", "zlew", "donice", "kolor-na-zamowienie"]),
    photos: ["wdh-set-1.jpg", "wdh-set-2.jpg"],
  },
  {
    key: "compact-240",
    producer: "brand",
    name: same("Compact 240"),
    description: {
      pl: "Kompaktowy zestaw kuchni ogrodowej o długości 242,5 cm, w pełni wyposażony. Grill gazowy, zlew z baterią i szafki są w cenie. Ustawisz go przy ścianie albo jako wyspę, w jednym z pięciu kolorów.",
      en: "A compact, fully equipped outdoor kitchen set, 242.5 cm long. Gas grill, sink with tap and cabinets are included in the price. Place it against a wall or as an island, in one of five colours.",
      de: "Ein kompaktes, voll ausgestattetes Outdoorküchen Set mit 242,5 cm Länge. Gasgrill, Spüle mit Armatur und Schränke sind im Preis enthalten. Aufstellung an der Wand oder als Insel, in einer von fünf Farben.",
      nl: "Een compacte, volledig uitgeruste buitenkeukenset van 242,5 cm lang. Gasgrill, spoelbak met kraan en kasten zijn inbegrepen. Te plaatsen tegen een wand of als eiland, in een van vijf kleuren.",
    },
    priceEur: 4554,
    kitchenType: "modular",
    externalDimensionsCm: { length: 242.5, width: 77, height: 125 },
    equipment: MODULAR_EQUIPMENT,
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, {
      pl: "Układ przy ścianie albo wyspa",
      en: "Wall or island layout",
      de: "Aufstellung an der Wand oder als Insel",
      nl: "Opstelling tegen een wand of als eiland",
    }),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: [
      {
        key: "kolor",
        name: COLOR_GROUP,
        selectionType: "single",
        options: [
          RAL_7016,
          RAL_9005,
          RAL_9001,
          RAL_7039,
          { key: "azzurro", label: same("Azzurro"), priceEur: 326 },
        ],
      },
    ],
    photos: ["e-pure1-7016-1.jpg", "e-pure1-7016-2.jpg", "e-pure1-azzurro-1.jpg", "e-pure1-azzurro-2.jpg"],
  },
  {
    key: "compact-320-marrone",
    producer: "brand",
    name: same("Compact 320 Marrone"),
    description: {
      pl: "Zestaw kuchni ogrodowej o długości 322,5 cm w kolorze Marrone. Grill gazowy, zlew z baterią i szafki są w cenie, a całość przyjeżdża złożona i gotowa do podłączenia.",
      en: "An outdoor kitchen set 322.5 cm long in the Marrone colour. Gas grill, sink with tap and cabinets are included, and it arrives assembled and ready to connect.",
      de: "Ein Outdoorküchen Set mit 322,5 cm Länge in der Farbe Marrone. Gasgrill, Spüle mit Armatur und Schränke sind im Preis enthalten, geliefert wird es montiert und anschlussfertig.",
      nl: "Een buitenkeukenset van 322,5 cm lang in de kleur Marrone. Gasgrill, spoelbak met kraan en kasten zijn inbegrepen en de set wordt gemonteerd en klaar om aan te sluiten geleverd.",
    },
    priceEur: 7328,
    kitchenType: "modular",
    externalDimensionsCm: { length: 322.5, width: 77, height: 125 },
    equipment: MODULAR_EQUIPMENT,
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, {
      pl: "Fronty w kolorze Marrone",
      en: "Fronts in the Marrone colour",
      de: "Fronten in der Farbe Marrone",
      nl: "Fronten in de kleur Marrone",
    }),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: [],
    photos: ["e-pure2-marrone-1.jpg", "e-pure2-marrone-2.jpg"],
  },
  {
    key: "compact-360-z-lodowka",
    producer: "brand",
    name: {
      pl: "Compact 360 z lodówką",
      en: "Compact 360 with fridge",
      de: "Compact 360 mit Kühlschrank",
      nl: "Compact 360 met koelkast",
    },
    description: {
      pl: "Najdłuższy zestaw kompaktowy, 362,5 cm, z lodówką zewnętrzną w standardzie. Grill gazowy, zlew z baterią, szafki i półki otwarte są w cenie.",
      en: "The longest compact set, 362.5 cm, with an outdoor fridge as standard. Gas grill, sink with tap, cabinets and open shelves are included in the price.",
      de: "Das längste Kompaktset, 362,5 cm, mit serienmäßigem Outdoor Kühlschrank. Gasgrill, Spüle mit Armatur, Schränke und offene Regale sind im Preis enthalten.",
      nl: "De langste compacte set, 362,5 cm, met standaard een buitenkoelkast. Gasgrill, spoelbak met kraan, kasten en open planken zijn inbegrepen.",
    },
    priceEur: 6827,
    kitchenType: "modular",
    externalDimensionsCm: { length: 362.5, width: 77, height: 125 },
    equipment: { ...MODULAR_EQUIPMENT, fridge: "included" },
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, {
      pl: "Lodówka zewnętrzna",
      en: "Outdoor fridge",
      de: "Outdoor Kühlschrank",
      nl: "Buitenkoelkast",
    }),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: [{ key: "kolor", name: COLOR_GROUP, selectionType: "single", options: [RAL_9001, RAL_7016, RAL_9005] }],
    photos: ["e-pure2-7016-1.jpg", "e-pure2-7016-2.jpg"],
  },
  {
    key: "premium-300",
    producer: "brand",
    name: same("Premium 300"),
    description: {
      pl: "Kuchnia ogrodowa o długości 300 cm z frontem i blatem w dekorze premium, na taras albo do małego ogrodu. Grill gazowy i zlew z baterią w cenie, układ przy ścianie albo jako wyspa.",
      en: "A 300 cm outdoor kitchen with front and worktop in premium decor, for a terrace or a small garden. Gas grill and sink with tap included, wall or island layout.",
      de: "Eine 300 cm lange Outdoorküche mit Front und Arbeitsplatte im Premiumdekor, für Terrasse oder kleinen Garten. Gasgrill und Spüle mit Armatur im Preis, Aufstellung an der Wand oder als Insel.",
      nl: "Een buitenkeuken van 300 cm met front en werkblad in premium decor, voor een terras of een kleine tuin. Gasgrill en spoelbak met kraan inbegrepen, opstelling tegen een wand of als eiland.",
    },
    priceEur: 7448,
    kitchenType: "modular",
    externalDimensionsCm: { length: 300 },
    equipment: MODULAR_EQUIPMENT,
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, PREMIUM_DECOR),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: layoutGroup(1503),
    photos: ["e-prem300-1.jpg", "e-prem300-2.jpg"],
  },
  {
    key: "premium-360",
    producer: "brand",
    name: same("Premium 360"),
    description: {
      pl: "Kuchnia ogrodowa o długości 360 cm z frontem i blatem w dekorze premium. Więcej blatu i miejsca na przechowywanie dla tych, którzy często przyjmują gości. Grill gazowy i zlew z baterią w cenie.",
      en: "A 360 cm outdoor kitchen with front and worktop in premium decor. More worktop and storage for regular entertaining. Gas grill and sink with tap included.",
      de: "Eine 360 cm lange Outdoorküche mit Front und Arbeitsplatte im Premiumdekor. Mehr Arbeitsfläche und Stauraum für alle, die oft Gäste haben. Gasgrill und Spüle mit Armatur im Preis.",
      nl: "Een buitenkeuken van 360 cm met front en werkblad in premium decor. Meer werkblad en opbergruimte voor wie vaak gasten ontvangt. Gasgrill en spoelbak met kraan inbegrepen.",
    },
    priceEur: 8750,
    kitchenType: "modular",
    externalDimensionsCm: { length: 360 },
    equipment: MODULAR_EQUIPMENT,
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, PREMIUM_DECOR),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: layoutGroup(1804),
    photos: ["e-prem360-1.jpg", "e-prem360-2.jpg"],
  },
  {
    key: "premium-420",
    producer: "brand",
    name: same("Premium 420"),
    description: {
      pl: "Pełna kuchnia ogrodowa o długości 420 cm z frontem i blatem w dekorze premium. Poza grillem gazowym i zlewem z baterią ma w standardzie dodatkowy palnik gazowy na garnki i patelnie.",
      en: "A full 420 cm outdoor kitchen with front and worktop in premium decor. Besides the gas grill and sink with tap, it has an extra gas burner for pots and pans as standard.",
      de: "Eine vollständige, 420 cm lange Outdoorküche mit Front und Arbeitsplatte im Premiumdekor. Neben Gasgrill und Spüle mit Armatur hat sie serienmäßig einen zusätzlichen Gasbrenner für Töpfe und Pfannen.",
      nl: "Een complete buitenkeuken van 420 cm met front en werkblad in premium decor. Naast de gasgrill en spoelbak met kraan heeft ze standaard een extra gasbrander voor pannen.",
    },
    priceEur: 10813,
    kitchenType: "modular",
    externalDimensionsCm: { length: 420 },
    equipment: MODULAR_EQUIPMENT,
    closable: false,
    bodyMaterial: MODULAR_BODY,
    worktopMaterial: MODULAR_WORKTOP,
    standardFeatures: list(GAS_GRILL, SINK_TAP, CABINETS, PREMIUM_DECOR, {
      pl: "Dodatkowy palnik gazowy",
      en: "Extra gas burner",
      de: "Zusätzlicher Gasbrenner",
      nl: "Extra gasbrander",
    }),
    deliveryNote: MODULAR_DELIVERY,
    optionGroups: layoutGroup(2104),
    photos: ["e-prem420-1.jpg"],
  },
];

export const LOCALES = ["en", "de", "nl"] as const;
export type TranslationLocale = (typeof LOCALES)[number];

// technicalSpecs po polsku (źródło, walidowane outdoorKitchenSpecsShape).
export function technicalSpecsOf(item: OutdoorKitchen): OutdoorKitchenTechnicalSpecs {
  return {
    kitchenType: item.kitchenType,
    externalDimensionsCm: item.externalDimensionsCm,
    ...(item.internalDimensionsCm ? { internalDimensionsCm: item.internalDimensionsCm } : {}),
    equipment: { ...item.equipment },
    closable: item.closable,
    bodyMaterial: item.bodyMaterial.pl,
    ...(item.worktopMaterial ? { worktopMaterial: item.worktopMaterial.pl } : {}),
    standardFeatures: item.standardFeatures.pl,
    ...(item.weightKg !== undefined ? { weightKg: item.weightKg } : {}),
    ...(item.foundationRequirement ? { foundationRequirement: item.foundationRequirement.pl } : {}),
    deliveryNote: item.deliveryNote.pl,
  };
}

// product_translation.technical_specs: kształt czytany przez resolveOutdoorKitchenSpecs (lib/data/translated-specs.ts).
export function translatedSpecsOf(item: OutdoorKitchen, locale: TranslationLocale) {
  const texts: Record<string, L10n | undefined> = {
    bodyMaterial: item.bodyMaterial,
    worktopMaterial: item.worktopMaterial,
    foundationRequirement: item.foundationRequirement,
    deliveryNote: item.deliveryNote,
  };
  const specs: Record<string, { value: string }> = {};
  for (const [key, text] of Object.entries(texts)) if (text) specs[key] = { value: text[locale] };
  return { specs, standardFeatures: item.standardFeatures[locale] };
}

// Każdy tekst, który trafia do bazy dla danego produktu (do testu marki, AC-5).
export function allTextsOf(item: OutdoorKitchen): string[] {
  const l10n = [
    item.name,
    item.description,
    item.bodyMaterial,
    item.deliveryNote,
    ...(item.worktopMaterial ? [item.worktopMaterial] : []),
    ...(item.foundationRequirement ? [item.foundationRequirement] : []),
    ...item.optionGroups.flatMap((group) => [group.name, ...group.options.map((option) => option.label)]),
  ];
  return [
    item.key,
    ...item.photos,
    ...l10n.flatMap((text) => [text.pl, text.en, text.de, text.nl]),
    ...item.standardFeatures.pl,
    ...item.standardFeatures.en,
    ...item.standardFeatures.de,
    ...item.standardFeatures.nl,
  ];
}

// Nazwa pliku w R2: z klucza produktu, nigdy z nazwy pliku źródłowego (nazwa dostawcy nie może trafić do R2).
export const photoFilenameOf = (item: OutdoorKitchen, index: number) =>
  `kuchnia-${item.key}-${String(index + 1).padStart(2, "0")}.webp`;
