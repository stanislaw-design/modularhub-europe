// Life Polska (lifepolska.pl): sauny ogrodowe. Źródła: cennik PDF "CENNIK-POLSKI-NA-STRONE-2026" (ważny od 2026-09-01,
// ceny netto PLN, to on rozstrzyga przy rozbieżnościach ze stroną) oraz strony produktów (konfigurator: struktura opcji).
// Zakres (decyzja użytkownika 2026-11-11): tylko sauny ogrodowe, jeden produkt na model, rozmiary jako warianty
// `katalogowy`. Pominięte: sauny mobilne, wewnętrzna, SO-OF (dla niepełnosprawnych), balie, grota/tężnia solankowa.
// Teksty widoczne dla klienta mają cztery wersje językowe (pl jest źródłem, en/de/nl idą do tabel tłumaczeń, spec 0067).
// Zdjęcia: prawa potwierdzone przez użytkownika (2026-11-11).
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:lifepolska";
export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`lifepolska:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const PRODUCER_ID = detUuid("producer");

// NBP, tabela 219/A/NBP/2026 z 2026-11-10: 1 EUR = 4,3895 PLN. Cennik podaje ceny netto; baza trzyma netto w EUR.
export const EUR_PLN_RATE = 4.3895;
export const eurCentsOf = (nettoPln: number): number => Math.round(nettoPln / EUR_PLN_RATE) * 100;

// Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
export const PRODUCER_DESCRIPTION = L(
  "Polski producent saun ogrodowych i balii z Górnego Śląska. Sauny powstają z selekcjonowanego drewna świerkowego, cedru syberyjskiego lub modrzewia modyfikowanego termicznie, z własnym piecem Diabaz ładowanym od zewnątrz i autorskim, wodoodpornym połączeniem belek ścian. Wszystkie urządzenia można sterować smartfonem przez Wi-Fi, a gotowe produkty producent dostarcza własnym transportem w całej Europie.",
  "Polish producer of garden saunas and hot tubs from Upper Silesia. The saunas are built from selected spruce, Siberian cedar or thermally modified larch, with the in-house Diabaz stove that is fed from the outside and a proprietary, waterproof wall beam joint. All devices can be controlled from a smartphone over Wi-Fi, and the producer delivers finished products with its own transport across Europe.",
  "Polnischer Hersteller von Gartensaunen und Badefässern aus Oberschlesien. Die Saunen entstehen aus ausgewähltem Fichtenholz, sibirischer Zeder oder thermisch modifizierter Lärche, mit dem hauseigenen, von außen beschickten Ofen Diabaz und einer eigenen, wasserdichten Verbindung der Wandbalken. Alle Geräte lassen sich per Smartphone über WLAN steuern, und die fertigen Produkte liefert der Hersteller mit eigenem Transport in ganz Europa.",
  "Poolse producent van tuinsauna's en hottubs uit Boven-Silezië. De sauna's worden gebouwd van geselecteerd vurenhout, Siberische ceder of thermisch gemodificeerd lariks, met de eigen Diabaz-kachel die van buitenaf wordt gestookt en een eigen waterdichte verbinding van de wandbalken. Alle apparaten zijn via wifi met een smartphone te bedienen, en de producent levert de afgewerkte producten met eigen transport in heel Europa.",
);

export const ELIGIBILITY_REASON = L(
  "Producent krajowy, dostawa gotowego produktu",
  "Domestic producer, delivery of a finished product",
  "Inländischer Hersteller, Lieferung eines fertigen Produkts",
  "Binnenlandse producent, levering van een kant-en-klaar product",
);

export const FOUNDATION = L(
  "Sauna ustawiana na stabilnym, równym podłożu przygotowanym przez klienta (np. płyta, kostka lub fundament punktowy)",
  "The sauna is placed on a stable, level base prepared by the customer (e.g. a slab, paving or point foundations)",
  "Die Sauna wird auf einem stabilen, ebenen, vom Kunden vorbereiteten Untergrund aufgestellt (z. B. Platte, Pflaster oder Punktfundamente)",
  "De sauna wordt geplaatst op een stabiele, vlakke ondergrond die de klant voorbereidt (bijv. een plaat, bestrating of puntfunderingen)",
);

const ELECTRICAL = L(
  "Standardowy piec opalany drewnem Diabaz nie wymaga zasilania; opcjonalny piec elektryczny Harvia 9 kW (Cylindro) lub 11 kW (Legend Home) ze sterowaniem Wi-Fi",
  "The standard wood-fired Diabaz stove needs no power supply; an optional Harvia electric stove, 9 kW (Cylindro) or 11 kW (Legend Home), with Wi-Fi control",
  "Der Standardofen Diabaz (Holzfeuerung) benötigt keinen Stromanschluss; optional Harvia-Elektroofen 9 kW (Cylindro) oder 11 kW (Legend Home) mit WLAN-Steuerung",
  "De standaard houtgestookte Diabaz-kachel heeft geen stroomaansluiting nodig; optioneel een elektrische Harvia-kachel van 9 kW (Cylindro) of 11 kW (Legend Home) met wifi-besturing",
);
const INSULATION = L(
  "Ściany drewniane grubości prawie 5 cm; sauna nagrzewa się do 80-110 °C w 30-45 minut",
  "Wooden walls almost 5 cm thick; the sauna heats up to 80-110 °C in 30-45 minutes",
  "Holzwände von knapp 5 cm Stärke; die Sauna heizt sich in 30-45 Minuten auf 80-110 °C auf",
  "Houten wanden van bijna 5 cm dik; de sauna warmt in 30-45 minuten op tot 80-110 °C",
);
const INTERIOR = L(
  "Naturalne, nieimpregnowane drewno (świerk, cedr syberyjski lub modrzew modyfikowany termicznie)",
  "Natural, untreated wood (spruce, Siberian cedar or thermally modified larch)",
  "Naturbelassenes, unbehandeltes Holz (Fichte, sibirische Zeder oder thermisch modifizierte Lärche)",
  "Natuurlijk, onbehandeld hout (vuren, Siberische ceder of thermisch gemodificeerd lariks)",
);
const BENCH = L(
  "Drewniane ławeczki w naturalnym, nieimpregnowanym drewnie",
  "Wooden benches in natural, untreated wood",
  "Holzbänke aus naturbelassenem, unbehandeltem Holz",
  "Houten banken van natuurlijk, onbehandeld hout",
);
const FRAME_WOOD_CONSTRUCTION = (pl: string, en: string, de: string, nl: string): L10n => L(pl, en, de, nl);

export interface SaunaSpecs {
  claddingMaterial: L10n;
  glazingType: L10n;
  benchMaterial?: L10n;
  seatingCapacity: number;
  hasChangingArea: boolean;
  changingAreaDescription?: L10n;
}

export interface SizeVariant {
  code: string;
  // Etykieta wariantu bez języka: kod i wymiary.
  label: string;
  persons: string;
  vestibule: boolean;
  nettoPln: number;
  extra?: L10n;
}

export interface LifepolskaSauna {
  key: string;
  name: string;
  photoDir: string;
  externalDimensions: string;
  description: L10n;
  constructionSystem: L10n;
  roofType: L10n;
  customizationScope?: L10n;
  equipment: L10n;
  specs: SaunaSpecs;
  variants: SizeVariant[];
  optionGroups: string[];
}

const personsL = (n: string): L10n => L(`${n} osób`, `${n} people`, `${n} Personen`, `${n} personen`);
const vestibuleL = (yes: boolean): L10n =>
  yes
    ? L("z przedsionkiem", "with vestibule", "mit Vorraum", "met voorruimte")
    : L("bez przedsionka", "without vestibule", "ohne Vorraum", "zonder voorruimte");

export function variantScope(variant: SizeVariant, equipment: L10n): L10n {
  const loc = (k: keyof L10n) => {
    const extra = variant.extra ? `, ${variant.extra[k]}` : "";
    return `${personsL(variant.persons)[k]}, ${vestibuleL(variant.vestibule)[k]}${extra}. ${EQUIPMENT_LABEL[k]}: ${equipment[k]}.`;
  };
  return L(loc("pl"), loc("en"), loc("de"), loc("nl"));
}
const EQUIPMENT_LABEL = L("Wyposażenie", "Equipment", "Ausstattung", "Uitrusting");

const EQ_GARDEN = L(
  "piec, ławeczki, szklane drzwi i front, naturalne nieimpregnowane drewno, drewniana podłoga, dach pokryty blachą",
  "stove, benches, glass door and front, natural untreated wood, wooden floor, sheet metal roof",
  "Ofen, Bänke, Glastür und Front, naturbelassenes unbehandeltes Holz, Holzboden, Dach mit Blechdeckung",
  "kachel, banken, glazen deur en front, natuurlijk onbehandeld hout, houten vloer, dak met plaatbedekking",
);
const EQ_ROUND = L(
  "piec z kominem i kamieniami, ławeczki, opaski ze stali nierdzewnej, podest wewnętrzny, naturalne nieimpregnowane drewno, szklane drzwi zewnętrzne",
  "stove with chimney and stones, benches, stainless steel bands, inner platform, natural untreated wood, glass exterior door",
  "Ofen mit Schornstein und Steinen, Bänke, Edelstahlbänder, Innenpodest, naturbelassenes unbehandeltes Holz, gläserne Außentür",
  "kachel met schoorsteen en stenen, banken, roestvrijstalen banden, binnenpodest, natuurlijk onbehandeld hout, glazen buitendeur",
);

const ROOF_SHEET = L(
  "Dach pokryty blachą (kolor do wyboru: RAL 9010, 8017 lub 7016)",
  "Sheet metal roof (colour to choose: RAL 9010, 8017 or 7016)",
  "Dach mit Blechdeckung (Farbe nach Wahl: RAL 9010, 8017 oder 7016)",
  "Dak met plaatbedekking (kleur naar keuze: RAL 9010, 8017 of 7016)",
);
const ROOF_FLAT = L(
  "Płaski dach pokryty blachą",
  "Flat sheet metal roof",
  "Flachdach mit Blechdeckung",
  "Plat dak met plaatbedekking",
);
const ROOF_OPTIONAL = L(
  "Bez pokrycia w cenie bazowej; pokrycie blachą lub gontem bitumicznym (kolor do wyboru) jako opcja",
  "No covering in the base price; sheet metal or bitumen shingle covering (colour to choose) as an option",
  "Im Grundpreis ohne Dachdeckung; Blech- oder Bitumenschindeldeckung (Farbe nach Wahl) als Option",
  "Zonder bedekking in de basisprijs; bedekking met plaat of bitumineuze shingles (kleur naar keuze) als optie",
);


export const SAUNAS: LifepolskaSauna[] = [
  {
    key: "elizia",
    name: "Life Polska Elizia",
    photoDir: "elizia",
    externalDimensions: "400 x 250 – 800 x 300 cm (wys. 245 cm)",
    description: L(
      "Sauna ogrodowa z dużym przesuwnym oknem tarasowym, w większych wariantach z balią BW-17P. Przestronne przeszklenie daje piękny widok na otoczenie, a eleganckie wykończenie z drewna podkreśla stylowy charakter. Piec Diabaz jest ładowany od zewnątrz. Połączenie sauny z balią tworzy komfortową strefę relaksu na każdą porę roku.",
      "A garden sauna with a large sliding terrace window and, in the larger versions, a BW-17P hot tub. The spacious glazing gives a beautiful view of the surroundings, and the elegant wood finish underlines its stylish character. The Diabaz stove is fed from the outside. Combining the sauna with a hot tub creates a comfortable relaxation zone for every season.",
      "Gartensauna mit großem Terrassen-Schiebefenster, in den größeren Varianten mit Badefass BW-17P. Die geräumige Verglasung bietet einen schönen Blick auf die Umgebung, und die elegante Holzverkleidung unterstreicht ihren stilvollen Charakter. Der Ofen Diabaz wird von außen beschickt. Die Kombination aus Sauna und Badefass schafft eine komfortable Entspannungszone für jede Jahreszeit.",
      "Tuinsauna met een groot schuifraam naar het terras en in de grotere uitvoeringen met een hottub BW-17P. De ruime beglazing geeft een prachtig uitzicht op de omgeving en de elegante houtafwerking onderstreept het stijlvolle karakter. De Diabaz-kachel wordt van buitenaf gestookt. De combinatie van sauna en hottub vormt een comfortabele ontspanningszone voor elk seizoen.",
    ),
    constructionSystem: FRAME_WOOD_CONSTRUCTION(
      "Sauna z drewna naturalnego, wykończona drewnem, z drewnianą podłogą i linoleum w części przedsionkowej; w standardzie jest dach pokryty blachą",
      "Natural wood sauna with a wood finish, wooden floor and linoleum in the vestibule part; the standard roof is covered with sheet metal",
      "Sauna aus Naturholz mit Holzverkleidung, Holzboden und Linoleum im Vorraumbereich; das Dach ist serienmäßig mit Blech gedeckt",
      "Sauna van natuurlijk hout met houtafwerking, houten vloer en linoleum in het voorruimtedeel; het standaarddak is met plaat bedekt",
    ),
    roofType: ROOF_FLAT,
    customizationScope: L(
      "Wybór pieca (drewno lub elektryczny Harvia), oświetlenie, impregnacja, przeszklenie przesuwne tarasowe w długości od 2 do 6 m oraz dodatkowe wyposażenie.",
      "Choice of stove (wood or Harvia electric), lighting, impregnation, sliding terrace glazing from 2 to 6 m in length and additional equipment.",
      "Wahl des Ofens (Holz oder Harvia-Elektro), Beleuchtung, Imprägnierung, Terrassen-Schiebeverglasung in einer Länge von 2 bis 6 m und Zusatzausstattung.",
      "Keuze van kachel (hout of elektrische Harvia), verlichting, impregnering, schuifbeglazing voor het terras met een lengte van 2 tot 6 m en extra uitrusting.",
    ),
    equipment: L(
      "piec, ławeczki, szklane drzwi i front części saunowej, naturalne nieimpregnowane drewno, drewniana podłoga, linoleum w części przedsionkowej, dach pokryty blachą",
      "stove, benches, glass door and front of the sauna part, natural untreated wood, wooden floor, linoleum in the vestibule part, sheet metal roof",
      "Ofen, Bänke, Glastür und Front des Saunabereichs, naturbelassenes unbehandeltes Holz, Holzboden, Linoleum im Vorraumbereich, Dach mit Blechdeckung",
      "kachel, banken, glazen deur en front van het saunadeel, natuurlijk onbehandeld hout, houten vloer, linoleum in het voorruimtedeel, dak met plaatbedekking",
    ),
    specs: {
      claddingMaterial: L("Wykończenie z drewna naturalnego", "Natural wood finish", "Verkleidung aus Naturholz", "Afwerking van natuurlijk hout"),
      glazingType: L(
        "Duże przeszklenie z przesuwnym oknem tarasowym; szklane drzwi i front części saunowej",
        "Large glazing with a sliding terrace window; glass door and front of the sauna part",
        "Große Verglasung mit Terrassen-Schiebefenster; Glastür und Front des Saunabereichs",
        "Grote beglazing met een schuifraam naar het terras; glazen deur en front van het saunadeel",
      ),
      seatingCapacity: 2,
      hasChangingArea: false,
    },
    variants: [
      { code: "SE-40", label: "SE-40 · 400 × 250 cm", persons: "2-6", vestibule: false, nettoPln: 36000, extra: L("bez balii", "without hot tub", "ohne Badefass", "zonder hottub") },
      { code: "SE-45", label: "SE-45 · 400 × 300 cm", persons: "2-6", vestibule: false, nettoPln: 45000, extra: L("bez balii", "without hot tub", "ohne Badefass", "zonder hottub") },
      { code: "SE-60", label: "SE-60 · 600 × 250 cm", persons: "4-8", vestibule: false, nettoPln: 62000, extra: L("z balią BW-17P", "with BW-17P hot tub", "mit Badefass BW-17P", "met hottub BW-17P") },
      { code: "SE-65", label: "SE-65 · 600 × 300 cm", persons: "4-8", vestibule: false, nettoPln: 75000, extra: L("z balią BW-17P", "with BW-17P hot tub", "mit Badefass BW-17P", "met hottub BW-17P") },
      { code: "SE-80", label: "SE-80 · 800 × 250 cm", persons: "4-8", vestibule: false, nettoPln: 79000, extra: L("z balią BW-17P", "with BW-17P hot tub", "mit Badefass BW-17P", "met hottub BW-17P") },
      { code: "SE-85", label: "SE-85 · 800 × 300 cm", persons: "4-8", vestibule: false, nettoPln: 96000, extra: L("z balią BW-17P", "with BW-17P hot tub", "mit Badefass BW-17P", "met hottub BW-17P") },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "przeszklenie-tarasowe"],
  },
  {
    key: "rabek",
    name: "Life Polska Rąbek",
    photoDir: "rabek",
    externalDimensions: "200 x 200 – 600 x 240 cm (wys. 245 cm)",
    description: L(
      "Nowoczesna sauna ogrodowa o prostej, geometrycznej formie. Elewacja z trwałej blachy w kolorze grafitowym nadaje jej elegancki, industrialny wygląd. Front stanowią duże przeszklone drzwi, które wpuszczają naturalne światło i pozwalają zobaczyć drewniane wnętrze. W środku są solidne ławy ze świerku i nowoczesny piec Diabaz ładowany od zewnątrz. Sauna na stabilnej podstawie sprawdzi się jako całoroczna strefa relaksu.",
      "A modern garden sauna with a simple, geometric form. The facade of durable sheet metal in graphite gives it an elegant, industrial look. The front is made of large glass doors that let in natural light and show the wooden interior. Inside are solid spruce benches and a modern Diabaz stove fed from the outside. Set on a stable base, the sauna works as a year-round relaxation zone.",
      "Moderne Gartensauna in schlichter, geometrischer Form. Die Fassade aus widerstandsfähigem Blech in Graphit verleiht ihr ein elegantes, industrielles Aussehen. Die Front besteht aus großen Glastüren, die natürliches Licht hereinlassen und den Blick auf das Holzinnere freigeben. Im Inneren befinden sich massive Fichtenbänke und ein moderner, von außen beschickter Ofen Diabaz. Auf einem stabilen Sockel eignet sich die Sauna als ganzjährige Entspannungszone.",
      "Moderne tuinsauna met een eenvoudige, geometrische vorm. De gevel van duurzame plaat in grafiet geeft haar een elegante, industriële uitstraling. De voorzijde bestaat uit grote glazen deuren die natuurlijk licht binnenlaten en het houten interieur laten zien. Binnen staan stevige vurenhouten banken en een moderne Diabaz-kachel die van buitenaf wordt gestookt. Op een stabiele ondergrond is de sauna een ontspanningszone voor het hele jaar.",
    ),
    constructionSystem: L(
      "Elewacja z trwałej blachy w kolorze grafitowym, sauna na stabilnej podstawie, wnętrze z drewna naturalnego z drewnianą podłogą",
      "Facade of durable graphite sheet metal, sauna on a stable base, interior of natural wood with a wooden floor",
      "Fassade aus widerstandsfähigem Graphitblech, Sauna auf stabilem Sockel, Innenraum aus Naturholz mit Holzboden",
      "Gevel van duurzame grafietkleurige plaat, sauna op een stabiele basis, interieur van natuurlijk hout met een houten vloer",
    ),
    roofType: ROOF_SHEET,
    equipment: EQ_GARDEN,
    specs: {
      claddingMaterial: L("Trwała blacha w kolorze grafitowym", "Durable sheet metal in graphite", "Widerstandsfähiges Blech in Graphit", "Duurzame plaat in grafiet"),
      glazingType: L("Duże przeszklone drzwi w froncie", "Large glass doors in the front", "Große Glastüren in der Front", "Grote glazen deuren in de voorzijde"),
      benchMaterial: L("Solidne ławy z drewna świerkowego", "Solid spruce benches", "Massive Fichtenbänke", "Stevige vurenhouten banken"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach 400 x 240 cm i 600 x 240 cm", "Vestibule in the 400 x 240 cm and 600 x 240 cm versions", "Vorraum in den Varianten 400 x 240 cm und 600 x 240 cm", "Voorruimte in de uitvoeringen van 400 x 240 cm en 600 x 240 cm"),
    },
    variants: [
      { code: "SR-20", label: "SR-20 · 200 × 200 cm", persons: "2-6", vestibule: false, nettoPln: 19800 },
      { code: "SR-25", label: "SR-25 · 250 × 200 cm", persons: "4-6", vestibule: false, nettoPln: 24750 },
      { code: "SR-40", label: "SR-40 · 400 × 240 cm", persons: "4-8", vestibule: true, nettoPln: 47520 },
      { code: "SR-60", label: "SR-60 · 600 × 240 cm", persons: "4-10", vestibule: true, nettoPln: 71280 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-kolor-blacha"],
  },
  {
    key: "porto",
    name: "Life Polska Porto",
    photoDir: "lamela",
    externalDimensions: "200 x 200 – 600 x 240 cm (wys. 245 cm)",
    description: L(
      "Nowoczesna sauna pokryta lamelami z drewna termicznie modyfikowanego, łącząca elegancki, minimalistyczny design z trwałością i funkcjonalnością. Elewacja z naturalnego termodrewna jest odporna na wilgoć i zmienne warunki atmosferyczne. Duże przeszklenia doświetlają wnętrze i pozwalają relaksować się w bliskim kontakcie z otoczeniem. Piec Diabaz ładowany jest od zewnątrz.",
      "A modern sauna clad in thermally modified wood slats that combines an elegant, minimalist design with durability and functionality. The facade of natural thermowood resists moisture and changing weather. Large glazing brightens the interior and lets you relax in close contact with the surroundings. The Diabaz stove is fed from the outside.",
      "Moderne Sauna mit Lamellen aus thermisch modifiziertem Holz, die elegantes, minimalistisches Design mit Haltbarkeit und Funktionalität verbindet. Die Fassade aus naturbelassenem Thermoholz ist feuchtigkeits- und witterungsbeständig. Große Verglasungen erhellen den Innenraum und ermöglichen Entspannung in engem Kontakt mit der Umgebung. Der Ofen Diabaz wird von außen beschickt.",
      "Moderne sauna bekleed met lamellen van thermisch gemodificeerd hout, die elegant, minimalistisch design combineert met duurzaamheid en functionaliteit. De gevel van natuurlijk thermohout is bestand tegen vocht en wisselende weersomstandigheden. Grote beglazing verlicht het interieur en laat je ontspannen in nauw contact met de omgeving. De Diabaz-kachel wordt van buitenaf gestookt.",
    ),
    constructionSystem: L(
      "Elewacja z lameli z naturalnego termodrewna, naturalne nieimpregnowane drewno wewnątrz, drewniana podłoga",
      "Facade of natural thermowood slats, natural untreated wood inside, wooden floor",
      "Fassade aus Lamellen aus naturbelassenem Thermoholz, innen naturbelassenes unbehandeltes Holz, Holzboden",
      "Gevel van lamellen van natuurlijk thermohout, binnen natuurlijk onbehandeld hout, houten vloer",
    ),
    roofType: ROOF_FLAT,
    equipment: EQ_GARDEN,
    specs: {
      claddingMaterial: L("Lamele z naturalnego termodrewna", "Slats of natural thermowood", "Lamellen aus naturbelassenem Thermoholz", "Lamellen van natuurlijk thermohout"),
      glazingType: L("Duże przeszklenia; szklane drzwi i front", "Large glazing; glass door and front", "Große Verglasungen; Glastür und Front", "Grote beglazing; glazen deur en front"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach od 300 x 240 cm", "Vestibule in the versions from 300 x 240 cm", "Vorraum in den Varianten ab 300 x 240 cm", "Voorruimte in de uitvoeringen vanaf 300 x 240 cm"),
    },
    variants: [
      { code: "SP-20", label: "SP-20 · 200 × 200 cm", persons: "2-6", vestibule: false, nettoPln: 20800 },
      { code: "SP-25", label: "SP-25 · 250 × 200 cm", persons: "4-6", vestibule: false, nettoPln: 25400 },
      { code: "SP-30", label: "SP-30 · 300 × 240 cm", persons: "4-6", vestibule: true, nettoPln: 35100 },
      { code: "SP-40", label: "SP-40 · 400 × 240 cm", persons: "4-8", vestibule: true, nettoPln: 45600 },
      { code: "SP-50", label: "SP-50 · 500 × 240 cm", persons: "4-8", vestibule: true, nettoPln: 56100 },
      { code: "SP-60", label: "SP-60 · 600 × 240 cm", persons: "4-10", vestibule: true, nettoPln: 66600 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie"],
  },
  {
    key: "domek",
    name: "Life Polska Domek",
    photoDir: "domek",
    externalDimensions: "200 x 200 – 600 x 240 cm (wys. 245 cm)",
    description: L(
      "Nowoczesna sauna w formie domku o konstrukcji szkieletowej, wykonana z dbałością o trwałość i komfort. Elewacja z naturalnego drewna nadaje jej ciepły wygląd i wpisuje się w otoczenie, a dobra izolacja zapewnia szybkie nagrzewanie i utrzymanie temperatury. Duże przeszklenia doświetlają wnętrze. Piec Diabaz jest ładowany od zewnątrz. Dobra propozycja do ogrodu, strefy wellness lub obiektu wypoczynkowego.",
      "A modern sauna in the form of a small house with a frame construction, made with care for durability and comfort. The facade of natural wood gives it a warm look and blends into the surroundings, while good insulation ensures quick heating and heat retention. Large glazing brightens the interior. The Diabaz stove is fed from the outside. A good choice for a garden, a wellness zone or a leisure facility.",
      "Moderne Sauna in Form eines Häuschens mit Rahmenkonstruktion, mit Sorgfalt für Haltbarkeit und Komfort gefertigt. Die Fassade aus Naturholz verleiht ihr ein warmes Aussehen und fügt sich in die Umgebung ein, und die gute Dämmung sorgt für schnelles Aufheizen und Wärmehaltung. Große Verglasungen erhellen den Innenraum. Der Ofen Diabaz wird von außen beschickt. Eine gute Wahl für den Garten, einen Wellnessbereich oder eine Freizeitanlage.",
      "Moderne sauna in de vorm van een huisje met een skeletconstructie, met zorg voor duurzaamheid en comfort gebouwd. De gevel van natuurlijk hout geeft haar een warme uitstraling en past in de omgeving, en de goede isolatie zorgt voor snel opwarmen en warmtebehoud. Grote beglazing verlicht het interieur. De Diabaz-kachel wordt van buitenaf gestookt. Een goede keuze voor de tuin, een wellnesszone of een recreatieaccommodatie.",
    ),
    constructionSystem: L(
      "Konstrukcja szkieletowa z elewacją z naturalnego drewna, samonośna drewniana podstawa i drewniana podłoga",
      "Frame construction with a natural wood facade, self-supporting wooden base and wooden floor",
      "Rahmenkonstruktion mit Fassade aus Naturholz, selbsttragender Holzsockel und Holzboden",
      "Skeletconstructie met een gevel van natuurlijk hout, zelfdragende houten basis en houten vloer",
    ),
    roofType: L("Dach pokryty blachą lub gontem", "Roof covered with sheet metal or shingle", "Dach mit Blech- oder Schindeldeckung", "Dak bedekt met plaat of shingles"),
    equipment: L(
      "piec, ławeczki, szklane drzwi, naturalne nieimpregnowane drewno, samonośna drewniana podstawa i podłoga, dach z blachy lub gont",
      "stove, benches, glass door, natural untreated wood, self-supporting wooden base and floor, sheet metal or shingle roof",
      "Ofen, Bänke, Glastür, naturbelassenes unbehandeltes Holz, selbsttragender Holzsockel und Boden, Blech- oder Schindeldach",
      "kachel, banken, glazen deur, natuurlijk onbehandeld hout, zelfdragende houten basis en vloer, dak van plaat of shingles",
    ),
    specs: {
      claddingMaterial: L("Naturalne drewno", "Natural wood", "Naturholz", "Natuurlijk hout"),
      glazingType: L("Duże przeszklenia; szklane drzwi", "Large glazing; glass door", "Große Verglasungen; Glastür", "Grote beglazing; glazen deur"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach od 300 x 240 cm", "Vestibule in the versions from 300 x 240 cm", "Vorraum in den Varianten ab 300 x 240 cm", "Voorruimte in de uitvoeringen vanaf 300 x 240 cm"),
    },
    variants: [
      { code: "SD-20", label: "SD-20 · 200 × 200 cm", persons: "2-6", vestibule: false, nettoPln: 16000 },
      { code: "SD-25", label: "SD-25 · 250 × 200 cm", persons: "4-6", vestibule: false, nettoPln: 20000 },
      { code: "SD-30", label: "SD-30 · 300 × 240 cm", persons: "4-6", vestibule: true, nettoPln: 28800 },
      { code: "SD-40", label: "SD-40 · 400 × 240 cm", persons: "4-8", vestibule: true, nettoPln: 38400 },
      { code: "SD-50", label: "SD-50 · 500 × 240 cm", persons: "4-8", vestibule: true, nettoPln: 48000 },
      { code: "SD-60", label: "SD-60 · 600 × 240 cm", persons: "4-10", vestibule: true, nettoPln: 57600 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie"],
  },
  {
    key: "q-stka",
    name: "Life Polska Q-stka",
    photoDir: "q-stka",
    externalDimensions: "253 x 242 – 396 x 242 cm (wys. 245 cm)",
    description: L(
      "Nowoczesna sauna ogrodowa łącząca nowoczesną formę z naturalnym ciepłem drewna. Solidny szkielet, elewacja z elementów drewnianych z grafitowymi detalami i płaski dach podkreślają charakter bryły. Panoramiczne przeszklenia w ciemnych ramach dają lekkość i doskonałe doświetlenie wnętrza. Piec Diabaz jest ładowany od zewnątrz. Sprawdzi się w ogrodzie prywatnym i w strefach wellness przy obiektach komercyjnych.",
      "A modern garden sauna that combines a modern form with the natural warmth of wood. A solid frame, a facade of wooden elements with graphite details and a flat roof underline the character of the body. Panoramic glazing in dark frames gives lightness and excellent daylight inside. The Diabaz stove is fed from the outside. It suits a private garden as well as wellness zones at commercial facilities.",
      "Moderne Gartensauna, die moderne Form mit der natürlichen Wärme von Holz verbindet. Ein solides Gerüst, eine Fassade aus Holzelementen mit graphitfarbenen Details und ein Flachdach unterstreichen den Charakter des Baukörpers. Panoramaverglasungen in dunklen Rahmen sorgen für Leichtigkeit und ausgezeichnete Beleuchtung des Innenraums. Der Ofen Diabaz wird von außen beschickt. Geeignet für den Privatgarten und für Wellnessbereiche bei gewerblichen Anlagen.",
      "Moderne tuinsauna die een moderne vorm combineert met de natuurlijke warmte van hout. Een stevig skelet, een gevel van houten elementen met grafietkleurige details en een plat dak benadrukken het karakter van het volume. Panoramische beglazing in donkere kozijnen geeft lichtheid en uitstekende daglichttoetreding. De Diabaz-kachel wordt van buitenaf gestookt. Geschikt voor de privétuin en voor wellnesszones bij commerciële accommodaties.",
    ),
    constructionSystem: L(
      "Konstrukcja na solidnym szkielecie, elewacja z elementów drewnianych z detalami w kolorze grafitowym, sauna na stabilnej podstawie",
      "Construction on a solid frame, facade of wooden elements with graphite-coloured details, sauna on a stable base",
      "Konstruktion auf solidem Gerüst, Fassade aus Holzelementen mit graphitfarbenen Details, Sauna auf stabilem Sockel",
      "Constructie op een stevig skelet, gevel van houten elementen met grafietkleurige details, sauna op een stabiele basis",
    ),
    roofType: ROOF_SHEET,
    equipment: EQ_GARDEN,
    specs: {
      claddingMaterial: L("Elementy drewniane z detalami w kolorze grafitowym", "Wooden elements with graphite-coloured details", "Holzelemente mit graphitfarbenen Details", "Houten elementen met grafietkleurige details"),
      glazingType: L("Panoramiczne przeszklenia w ciemnych ramach; szklane drzwi", "Panoramic glazing in dark frames; glass door", "Panoramaverglasungen in dunklen Rahmen; Glastür", "Panoramische beglazing in donkere kozijnen; glazen deur"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach od 324 x 242 cm", "Vestibule in the versions from 324 x 242 cm", "Vorraum in den Varianten ab 324 x 242 cm", "Voorruimte in de uitvoeringen vanaf 324 x 242 cm"),
    },
    variants: [
      { code: "SQ-20", label: "SQ-20 · 253 × 242 cm", persons: "2-6", vestibule: false, nettoPln: 31850 },
      { code: "SQ-30", label: "SQ-30 · 324 × 242 cm", persons: "4-6", vestibule: true, nettoPln: 40800 },
      { code: "SQ-40", label: "SQ-40 · 396 × 242 cm", persons: "4-6", vestibule: true, nettoPln: 49850 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-kolor-blacha"],
  },
  {
    key: "rubik",
    name: "Life Polska Rubik",
    photoDir: "rubik",
    externalDimensions: "150 x 150 – 200 x 400 cm (wys. 215 cm)",
    description: L(
      "Nowoczesna, wolnostojąca sauna o kompaktowej, zaokrąglonej bryle. Konstrukcja na ciemnej, metalowej ramie kontrastuje z poziomymi panelami z naturalnego drewna. Duże szklane drzwi dają lekkość i dostęp światła do wnętrza, w którym dominuje jasne drewno, z dwupoziomowymi ławami i piecem w rogu. Całość utrzymana jest w minimalistycznym, skandynawskim stylu, z naciskiem na naturalne materiały i komfort użytkowania. Piec Diabaz jest ładowany od zewnątrz.",
      "A modern, free-standing sauna with a compact, rounded body. The structure on a dark metal frame contrasts with horizontal panels of natural wood. Large glass doors give lightness and let light into the interior, where light wood dominates, with two-level benches and a stove in the corner. The whole is kept in a minimalist, Scandinavian style, with an emphasis on natural materials and comfort of use. The Diabaz stove is fed from the outside.",
      "Moderne, freistehende Sauna mit kompaktem, abgerundetem Baukörper. Die Konstruktion auf dunklem Metallrahmen kontrastiert mit waagerechten Paneelen aus Naturholz. Große Glastüren sorgen für Leichtigkeit und lassen Licht in den Innenraum, in dem helles Holz dominiert, mit zweistufigen Bänken und einem Ofen in der Ecke. Das Ganze ist im minimalistischen, skandinavischen Stil gehalten, mit Schwerpunkt auf natürlichen Materialien und Nutzungskomfort. Der Ofen Diabaz wird von außen beschickt.",
      "Moderne, vrijstaande sauna met een compact, afgerond volume. De constructie op een donker metalen frame contrasteert met horizontale panelen van natuurlijk hout. Grote glazen deuren geven lichtheid en laten licht in het interieur, waar licht hout overheerst, met banken op twee niveaus en een kachel in de hoek. Het geheel is in een minimalistische, Scandinavische stijl gehouden, met nadruk op natuurlijke materialen en gebruiksgemak. De Diabaz-kachel wordt van buitenaf gestookt.",
    ),
    constructionSystem: L(
      "Ciemna rama metalowa z poziomymi panelami z naturalnego drewna; wewnątrz jasne drewno, dwupoziomowe ławy",
      "Dark metal frame with horizontal panels of natural wood; light wood inside, two-level benches",
      "Dunkler Metallrahmen mit waagerechten Paneelen aus Naturholz; innen helles Holz, zweistufige Bänke",
      "Donker metalen frame met horizontale panelen van natuurlijk hout; binnen licht hout, banken op twee niveaus",
    ),
    roofType: L("Zaokrąglona bryła z metalową ramą", "Rounded body with a metal frame", "Abgerundeter Baukörper mit Metallrahmen", "Afgerond volume met een metalen frame"),
    equipment: EQ_ROUND,
    specs: {
      claddingMaterial: L("Poziome panele z naturalnego drewna na ciemnej ramie metalowej", "Horizontal panels of natural wood on a dark metal frame", "Waagerechte Paneele aus Naturholz auf dunklem Metallrahmen", "Horizontale panelen van natuurlijk hout op een donker metalen frame"),
      glazingType: L("Duże szklane drzwi zewnętrzne", "Large glass exterior door", "Große gläserne Außentür", "Grote glazen buitendeur"),
      benchMaterial: L("Dwupoziomowe ławy z naturalnego drewna", "Two-level benches of natural wood", "Zweistufige Bänke aus Naturholz", "Banken op twee niveaus van natuurlijk hout"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach SO-R3P i SO-R4P", "Vestibule in the SO-R3P and SO-R4P versions", "Vorraum in den Varianten SO-R3P und SO-R4P", "Voorruimte in de uitvoeringen SO-R3P en SO-R4P"),
    },
    variants: [
      { code: "SO-R1", label: "SO-R1 · 150 × 150 cm", persons: "2-4", vestibule: false, nettoPln: 14200 },
      { code: "SO-R1,5", label: "SO-R1,5 · 200 × 150 cm", persons: "4-6", vestibule: false, nettoPln: 14200 },
      { code: "SO-R2", label: "SO-R2 · 200 × 200 cm", persons: "6-8", vestibule: false, nettoPln: 19400 },
      { code: "SO-R2,5", label: "SO-R2,5 · 200 × 250 cm", persons: "4-6", vestibule: false, nettoPln: 21350 },
      { code: "SO-R3", label: "SO-R3 · 200 × 300 cm", persons: "6-8", vestibule: false, nettoPln: 23750 },
      { code: "SO-R3P", label: "SO-R3P · 200 × 300 cm", persons: "4-6", vestibule: true, nettoPln: 27650 },
      { code: "SO-R4P", label: "SO-R4P · 200 × 400 cm", persons: "6-8", vestibule: true, nettoPln: 30400 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie"],
  },
  {
    key: "panorama",
    name: "Life Polska Panorama",
    photoDir: "panorama",
    externalDimensions: "400 x 240 – 500 x 240 cm (wys. 215-225 cm)",
    description: L(
      "Owalna sauna z okrągłym, panoramicznym przeszkleniem wypukłym z poliwęglanu. Ściany pionowe wykonane są z drewna klejonego z autorskim, wodoodpornym połączeniem belek, które zapobiega wnikaniu wody i wilgoci opadowej oraz przeciwdziała skutkom rozsychania drewna; rozwiązanie jest chronione prawem RP. Można używać pieca opalanego drewnem Diabaz albo elektrycznego Harvia.",
      "An oval sauna with a round, panoramic convex polycarbonate glazing. The vertical walls are made of glued timber with a proprietary, waterproof beam joint that prevents water and rain moisture from getting in and counteracts the effects of wood drying out; the solution is protected under Polish law. You can use the wood-fired Diabaz stove or a Harvia electric one.",
      "Ovale Sauna mit runder, panoramischer, gewölbter Polycarbonat-Verglasung. Die senkrechten Wände bestehen aus Brettschichtholz mit einer eigenen, wasserdichten Balkenverbindung, die das Eindringen von Wasser und Regenfeuchtigkeit verhindert und den Folgen des Austrocknens des Holzes entgegenwirkt; die Lösung ist nach polnischem Recht geschützt. Verwendet werden kann der holzbefeuerte Ofen Diabaz oder ein elektrischer Harvia.",
      "Ovale sauna met een ronde, panoramische bolle beglazing van polycarbonaat. De verticale wanden zijn gemaakt van gelamineerd hout met een eigen waterdichte verbinding van de balken, die het binnendringen van water en regenvocht voorkomt en de gevolgen van het uitdrogen van het hout tegengaat; de oplossing is naar Pools recht beschermd. Je kunt de houtgestookte Diabaz-kachel of een elektrische Harvia gebruiken.",
    ),
    constructionSystem: L(
      "Ściany pionowe z drewna klejonego z autorskim, wodoodpornym połączeniem belek (rozwiązanie chronione prawem RP); przeszklenie wypukłe z poliwęglanu",
      "Vertical walls of glued timber with a proprietary, waterproof beam joint (solution protected under Polish law); convex polycarbonate glazing",
      "Senkrechte Wände aus Brettschichtholz mit eigener, wasserdichter Balkenverbindung (nach polnischem Recht geschützte Lösung); gewölbte Polycarbonat-Verglasung",
      "Verticale wanden van gelamineerd hout met een eigen waterdichte verbinding van de balken (oplossing beschermd naar Pools recht); bolle beglazing van polycarbonaat",
    ),
    roofType: ROOF_OPTIONAL,
    equipment: L(
      "piec z kominem i kamieniami, ławeczki, opaski ze stali nierdzewnej, podest wewnętrzny, naturalne nieimpregnowane drewno, szklane drzwi zewnętrzne i wewnętrzne, przeszklenie z poliwęglanu",
      "stove with chimney and stones, benches, stainless steel bands, inner platform, natural untreated wood, glass exterior and interior doors, polycarbonate glazing",
      "Ofen mit Schornstein und Steinen, Bänke, Edelstahlbänder, Innenpodest, naturbelassenes unbehandeltes Holz, gläserne Außen- und Innentür, Polycarbonat-Verglasung",
      "kachel met schoorsteen en stenen, banken, roestvrijstalen banden, binnenpodest, natuurlijk onbehandeld hout, glazen buiten- en binnendeur, beglazing van polycarbonaat",
    ),
    specs: {
      claddingMaterial: L("Drewno klejone, ściany pionowe z wodoodpornym połączeniem belek", "Glued timber, vertical walls with a waterproof beam joint", "Brettschichtholz, senkrechte Wände mit wasserdichter Balkenverbindung", "Gelamineerd hout, verticale wanden met een waterdichte verbinding van de balken"),
      glazingType: L("Przeszklenie wypukłe z poliwęglanu; szklane drzwi zewnętrzne i wewnętrzne", "Convex polycarbonate glazing; glass exterior and interior doors", "Gewölbte Polycarbonat-Verglasung; gläserne Außen- und Innentür", "Bolle beglazing van polycarbonaat; glazen buiten- en binnendeur"),
      seatingCapacity: 6,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w obu wariantach", "Vestibule in both versions", "Vorraum in beiden Varianten", "Voorruimte in beide uitvoeringen"),
    },
    variants: [
      { code: "SO-OP 4M", label: "SO-OP 4M · 400 × 240 cm", persons: "6-8", vestibule: true, nettoPln: 26950 },
      { code: "SO-OP 5M", label: "SO-OP 5M · 500 × 240 cm", persons: "6-8", vestibule: true, nettoPln: 33700 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-pokrycie", "dach-kolor-gont"],
  },
  {
    key: "owalna",
    name: "Life Polska Owalna",
    photoDir: "owalna",
    externalDimensions: "400 x 240 cm (wys. 215 cm)",
    description: L(
      "Owalna sauna ogrodowa z przedsionkiem, z której można korzystać jak z sauny fińskiej (ok. 100 °C, wilgotność 5-10%), ruskiej bani (65-80 °C, wilgotność 10-30%) albo sauny parowej. Ma wentylację nawiewną i wywiewną. Piec Diabaz jest ładowany od zewnątrz, a można też wybrać piec elektryczny Harvia.",
      "An oval garden sauna with a vestibule that can be used as a Finnish sauna (about 100 °C, humidity 5-10%), a Russian banya (65-80 °C, humidity 10-30%) or a steam sauna. It has supply and exhaust ventilation. The Diabaz stove is fed from the outside, and you can also choose a Harvia electric stove.",
      "Ovale Gartensauna mit Vorraum, die sich wie eine finnische Sauna (ca. 100 °C, Luftfeuchtigkeit 5-10 %), ein russisches Banja (65-80 °C, Luftfeuchtigkeit 10-30 %) oder eine Dampfsauna nutzen lässt. Sie hat Zu- und Abluftbelüftung. Der Ofen Diabaz wird von außen beschickt, alternativ ist ein elektrischer Harvia-Ofen wählbar.",
      "Ovale tuinsauna met voorruimte die je kunt gebruiken als Finse sauna (ca. 100 °C, luchtvochtigheid 5-10%), Russische banya (65-80 °C, luchtvochtigheid 10-30%) of stoomsauna. Ze heeft toe- en afvoerventilatie. De Diabaz-kachel wordt van buitenaf gestookt en je kunt ook een elektrische Harvia-kachel kiezen.",
    ),
    constructionSystem: L(
      "Owalna bryła z naturalnego drewna z wentylacją nawiewną i wywiewną",
      "Oval body of natural wood with supply and exhaust ventilation",
      "Ovaler Baukörper aus Naturholz mit Zu- und Abluftbelüftung",
      "Ovaal volume van natuurlijk hout met toe- en afvoerventilatie",
    ),
    roofType: ROOF_OPTIONAL,
    equipment: L(
      "piec z kominem i kamieniami, ławeczki, opaski ze stali nierdzewnej, podest wewnętrzny, naturalne nieimpregnowane drewno, szklane drzwi zewnętrzne i wewnętrzne",
      "stove with chimney and stones, benches, stainless steel bands, inner platform, natural untreated wood, glass exterior and interior doors",
      "Ofen mit Schornstein und Steinen, Bänke, Edelstahlbänder, Innenpodest, naturbelassenes unbehandeltes Holz, gläserne Außen- und Innentür",
      "kachel met schoorsteen en stenen, banken, roestvrijstalen banden, binnenpodest, natuurlijk onbehandeld hout, glazen buiten- en binnendeur",
    ),
    specs: {
      claddingMaterial: L("Naturalne drewno", "Natural wood", "Naturholz", "Natuurlijk hout"),
      glazingType: L("Szklane drzwi zewnętrzne i wewnętrzne", "Glass exterior and interior doors", "Gläserne Außen- und Innentür", "Glazen buiten- en binnendeur"),
      seatingCapacity: 6,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek", "Vestibule", "Vorraum", "Voorruimte"),
    },
    variants: [{ code: "SO-OW", label: "SO-OW · 400 × 240 cm", persons: "6-8", vestibule: true, nettoPln: 25100 }],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-pokrycie", "dach-kolor-blacha"],
  },
  {
    key: "horyzont",
    name: "Life Polska Horyzont",
    photoDir: "horyzont",
    externalDimensions: "164 x 240 – 454 x 240 cm (wys. 215 cm)",
    description: L(
      "Modułowa sauna Horyzont pozwala na dowolną konfigurację przestrzeni, od wielkości M2 do M6. Wnętrze można podzielić na przedsionek i saunę w układach 1+2, 2+2, 2+3, 2+4, 3+3 i innych, a drzwi do sauny montuje się w dowolnym module. Piec Diabaz jest ładowany od zewnątrz, można też wybrać piec elektryczny Harvia.",
      "The modular Horyzont sauna allows any space configuration, from size M2 to M6. The interior can be divided into a vestibule and a sauna in 1+2, 2+2, 2+3, 2+4, 3+3 and other layouts, and the sauna door is installed in any module. The Diabaz stove is fed from the outside, and a Harvia electric stove can be chosen as well.",
      "Die modulare Sauna Horyzont erlaubt eine beliebige Raumkonfiguration, von der Größe M2 bis M6. Der Innenraum lässt sich in Vorraum und Sauna in den Aufteilungen 1+2, 2+2, 2+3, 2+4, 3+3 und weiteren gliedern, und die Saunatür wird in einem beliebigen Modul eingebaut. Der Ofen Diabaz wird von außen beschickt, wählbar ist auch ein elektrischer Harvia-Ofen.",
      "De modulaire sauna Horyzont maakt elke ruimte-indeling mogelijk, van maat M2 tot M6. Het interieur kan worden verdeeld in voorruimte en sauna in indelingen 1+2, 2+2, 2+3, 2+4, 3+3 en andere, en de saunadeur wordt in een willekeurige module geplaatst. De Diabaz-kachel wordt van buitenaf gestookt en je kunt ook een elektrische Harvia-kachel kiezen.",
    ),
    constructionSystem: L(
      "Konstrukcja modułowa (moduły M2 do M6) z naturalnego drewna",
      "Modular construction (modules M2 to M6) of natural wood",
      "Modulare Konstruktion (Module M2 bis M6) aus Naturholz",
      "Modulaire constructie (modules M2 tot M6) van natuurlijk hout",
    ),
    roofType: ROOF_OPTIONAL,
    customizationScope: L(
      "Dowolny podział na przedsionek i saunę oraz położenie drzwi w wybranym module; inne wielkości modułowe (np. M7, M8) na zapytanie.",
      "Any division into vestibule and sauna and any door position in the chosen module; other modular sizes (e.g. M7, M8) on request.",
      "Beliebige Aufteilung in Vorraum und Sauna sowie Türposition im gewählten Modul; weitere Modulgrößen (z. B. M7, M8) auf Anfrage.",
      "Elke verdeling in voorruimte en sauna en elke deurpositie in de gekozen module; andere modulaire maten (bijv. M7, M8) op aanvraag.",
    ),
    equipment: EQ_ROUND,
    specs: {
      claddingMaterial: L("Naturalne drewno", "Natural wood", "Naturholz", "Natuurlijk hout"),
      glazingType: L("Szklane drzwi zewnętrzne", "Glass exterior door", "Gläserne Außentür", "Glazen buitendeur"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach M4P, M5P i M6P; podział modułów do ustalenia", "Vestibule in the M4P, M5P and M6P versions; division of the modules to be agreed", "Vorraum in den Varianten M4P, M5P und M6P; Aufteilung der Module nach Absprache", "Voorruimte in de uitvoeringen M4P, M5P en M6P; verdeling van de modules in overleg"),
    },
    variants: [
      { code: "SH-M2", label: "SH-M2 · 164 × 240 cm", persons: "2-4", vestibule: false, nettoPln: 17050 },
      { code: "SH-M3", label: "SH-M3 · 240 × 240 cm", persons: "6-10", vestibule: false, nettoPln: 20600 },
      { code: "SH-M4", label: "SH-M4 · 311 × 240 cm", persons: "8-12", vestibule: false, nettoPln: 24900 },
      { code: "SH-M4P", label: "SH-M4P · 311 × 240 cm", persons: "8-12", vestibule: true, nettoPln: 27400 },
      { code: "SH-M5P", label: "SH-M5P · 382 × 240 cm", persons: "8-12", vestibule: true, nettoPln: 34350 },
      { code: "SH-M6P", label: "SH-M6P · 454 × 240 cm", persons: "8-12", vestibule: true, nettoPln: 41150 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-pokrycie", "dach-kolor-blacha"],
  },
  {
    key: "discovery",
    name: "Life Polska Discovery",
    photoDir: "discovery",
    externalDimensions: "Ø 200 x 300 – 500 cm (wys. 215 cm)",
    description: L(
      "Sauna beczkowa z wypukłym przeszkleniem z poliwęglanu o grubości 8 mm. Szyby w oknach są ze szkła bezpiecznego i atermiczne. Drzwi klejone wielopłaszczyznowo zapobiegają wypaczaniu, a specjalna klamka z dociskiem i uszczelką gumową dba o szczelność. Piec Diabaz jest ładowany od zewnątrz, można też wybrać piec elektryczny Harvia.",
      "A barrel sauna with a convex polycarbonate glazing 8 mm thick. The window panes are made of safety glass and are athermal. Multi-plane glued doors prevent warping, and a special handle with a press and a rubber seal ensures tightness. The Diabaz stove is fed from the outside, and a Harvia electric stove can be chosen as well.",
      "Fasssauna mit gewölbter Polycarbonat-Verglasung von 8 mm Stärke. Die Fensterscheiben bestehen aus Sicherheitsglas und sind athermisch. Mehrfach verleimte Türen verhindern Verzug, und ein spezieller Griff mit Anpressung und Gummidichtung sorgt für Dichtheit. Der Ofen Diabaz wird von außen beschickt, wählbar ist auch ein elektrischer Harvia-Ofen.",
      "Vatsauna met een bolle beglazing van polycarbonaat van 8 mm dik. De ruiten zijn van veiligheidsglas en athermisch. Meervlaksverlijmde deuren voorkomen vervorming en een speciale klink met aandrukking en rubberen afdichting zorgt voor dichtheid. De Diabaz-kachel wordt van buitenaf gestookt en je kunt ook een elektrische Harvia-kachel kiezen.",
    ),
    constructionSystem: L(
      "Beczka z naturalnego drewna z wypukłym przeszkleniem z poliwęglanu 8 mm, szyby ze szkła bezpiecznego atermicznego, drzwi klejone wielopłaszczyznowo",
      "Barrel of natural wood with 8 mm convex polycarbonate glazing, athermal safety glass panes, multi-plane glued doors",
      "Fass aus Naturholz mit gewölbter 8-mm-Polycarbonat-Verglasung, athermische Sicherheitsglasscheiben, mehrfach verleimte Türen",
      "Vat van natuurlijk hout met 8 mm bolle beglazing van polycarbonaat, athermische veiligheidsglasruiten, meervlaksverlijmde deuren",
    ),
    roofType: ROOF_OPTIONAL,
    equipment: L(
      "piec z kominem i kamieniami, ławeczki, opaski ze stali nierdzewnej, podest wewnętrzny, naturalne nieimpregnowane drewno, szklane drzwi zewnętrzne, przeszklenie z poliwęglanu",
      "stove with chimney and stones, benches, stainless steel bands, inner platform, natural untreated wood, glass exterior door, polycarbonate glazing",
      "Ofen mit Schornstein und Steinen, Bänke, Edelstahlbänder, Innenpodest, naturbelassenes unbehandeltes Holz, gläserne Außentür, Polycarbonat-Verglasung",
      "kachel met schoorsteen en stenen, banken, roestvrijstalen banden, binnenpodest, natuurlijk onbehandeld hout, glazen buitendeur, beglazing van polycarbonaat",
    ),
    specs: {
      claddingMaterial: L("Naturalne drewno, dach z gontu bitumicznego lub blachy", "Natural wood, bitumen shingle or sheet metal roof", "Naturholz, Dach aus Bitumenschindeln oder Blech", "Natuurlijk hout, dak van bitumineuze shingles of plaat"),
      glazingType: L("Przeszklenie wypukłe z poliwęglanu 8 mm; szyby ze szkła bezpiecznego, atermiczne; szklane drzwi zewnętrzne", "Convex 8 mm polycarbonate glazing; athermal safety glass panes; glass exterior door", "Gewölbte 8-mm-Polycarbonat-Verglasung; athermische Sicherheitsglasscheiben; gläserne Außentür", "Bolle beglazing van polycarbonaat 8 mm; athermische veiligheidsglasruiten; glazen buitendeur"),
      seatingCapacity: 6,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek i ganek w wariantach 4M i 5M", "Vestibule and porch in the 4M and 5M versions", "Vorraum und Vorbau in den Varianten 4M und 5M", "Voorruimte en portaal in de uitvoeringen 4M en 5M"),
    },
    variants: [
      { code: "SH-DSC 3M", label: "SH-DSC 3M · Ø 200 × 300 cm", persons: "6-8", vestibule: false, nettoPln: 20250, extra: L("z gankiem", "with porch", "mit Vorbau", "met portaal") },
      { code: "SH-DSC 4M", label: "SH-DSC 4M · Ø 200 × 400 cm", persons: "6-8", vestibule: true, nettoPln: 27000, extra: L("z gankiem", "with porch", "mit Vorbau", "met portaal") },
      { code: "SH-DSC 5M", label: "SH-DSC 5M · Ø 200 × 500 cm", persons: "6-8", vestibule: true, nettoPln: 33750, extra: L("z gankiem", "with porch", "mit Vorbau", "met portaal") },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-pokrycie", "dach-kolor-gont"],
  },
  {
    key: "beczka",
    name: "Life Polska Beczka",
    photoDir: "beczka",
    externalDimensions: "Ø 200 x 165 – 400 cm (wys. 215 cm)",
    description: L(
      "Sauna beczkowa z własnym piecem Diabaz: nadaje się do bezpośredniego polewania wodą i utrzymuje żądaną wilgotność dzięki parownikowi dozującemu. Ma otwory zasypowy i rewizyjny usytuowane na zewnątrz, więc nie trzeba wnosić do sauny opału ani jej wietrzyć, a zewnętrzna obsługa pieca zapobiega dostawaniu się dymu do wnętrza. Do wyboru jest także piec elektryczny Harvia.",
      "A barrel sauna with the in-house Diabaz stove: suitable for pouring water directly and keeps the desired humidity thanks to a dosing evaporator. The filling and inspection openings are on the outside, so there is no need to carry fuel into the sauna or air it out, and operating the stove from outside keeps smoke out of the interior. A Harvia electric stove is available as well.",
      "Fasssauna mit dem hauseigenen Ofen Diabaz: Er eignet sich zum direkten Aufgießen und hält dank eines dosierenden Verdampfers die gewünschte Feuchtigkeit. Beschickungs- und Revisionsöffnung liegen außen, sodass man weder Brennstoff in die Sauna tragen noch sie lüften muss, und die Bedienung des Ofens von außen verhindert, dass Rauch in den Innenraum gelangt. Wählbar ist auch ein elektrischer Harvia-Ofen.",
      "Vatsauna met de eigen Diabaz-kachel: geschikt om rechtstreeks water op te gieten en houdt de gewenste vochtigheid dankzij een doserende verdamper. De vul- en inspectieopeningen zitten aan de buitenkant, dus je hoeft geen brandstof de sauna in te dragen of te luchten, en de bediening van de kachel van buitenaf houdt rook uit het interieur. Ook een elektrische Harvia-kachel is beschikbaar.",
    ),
    constructionSystem: L(
      "Beczka z naturalnego drewna z piecem Diabaz obsługiwanym od zewnątrz",
      "Barrel of natural wood with a Diabaz stove operated from the outside",
      "Fass aus Naturholz mit von außen bedientem Ofen Diabaz",
      "Vat van natuurlijk hout met een Diabaz-kachel die van buitenaf wordt bediend",
    ),
    roofType: ROOF_OPTIONAL,
    customizationScope: L(
      "Opcjonalnie dodatkowy daszek, przedsionek oraz przeszklony front lub tył (dopłaty według cennika producenta).",
      "Optionally an additional canopy, a vestibule and a glazed front or back (surcharges according to the producer's price list).",
      "Optional ein zusätzliches Vordach, ein Vorraum sowie eine verglaste Front oder Rückseite (Aufpreise laut Preisliste des Herstellers).",
      "Optioneel een extra afdakje, een voorruimte en een beglaasde voor- of achterzijde (meerprijzen volgens de prijslijst van de producent).",
    ),
    equipment: EQ_ROUND,
    specs: {
      claddingMaterial: L("Naturalne drewno, dach z gontu bitumicznego lub blachy", "Natural wood, bitumen shingle or sheet metal roof", "Naturholz, Dach aus Bitumenschindeln oder Blech", "Natuurlijk hout, dak van bitumineuze shingles of plaat"),
      glazingType: L("Szklane drzwi zewnętrzne", "Glass exterior door", "Gläserne Außentür", "Glazen buitendeur"),
      seatingCapacity: 2,
      hasChangingArea: true,
      changingAreaDescription: L("Przedsionek w wariantach SO-3B i SO-4B", "Vestibule in the SO-3B and SO-4B versions", "Vorraum in den Varianten SO-3B und SO-4B", "Voorruimte in de uitvoeringen SO-3B en SO-4B"),
    },
    variants: [
      { code: "SO-1A", label: "SO-1A · Ø 200 × 165 cm", persons: "2-4", vestibule: false, nettoPln: 12500 },
      { code: "SO-2A", label: "SO-2A · Ø 200 × 200 cm", persons: "4-6", vestibule: false, nettoPln: 14550 },
      { code: "SO-3A", label: "SO-3A · Ø 200 × 300 cm", persons: "6-8", vestibule: false, nettoPln: 18300 },
      { code: "SO-3B", label: "SO-3B · Ø 200 × 300 cm", persons: "4-6", vestibule: true, nettoPln: 21250 },
      { code: "SO-4B", label: "SO-4B · Ø 200 × 400 cm", persons: "6-8", vestibule: true, nettoPln: 23450 },
    ],
    optionGroups: ["piec", "oswietlenie", "impregnacja", "wyposazenie", "dach-pokrycie", "dach-kolor-blacha"],
  },
];

// ---------------------------------------------------------------------------
// Grupy opcji wspólne dla producenta (spec 0059). Ceny opcji pochodzą z cennika akcesoriów (PDF, netto PLN);
// BimSch v2 nie ma w PDF, wzięty z konfiguratora na stronie (799,50 zł brutto = 650 zł netto).
// Opcje nie zależą od wariantu rozmiaru, więc tam, gdzie cennik różnicuje cenę według rozmiaru (impregnacja, pokrycie
// dachu), podana jest cena dla najmniejszych rozmiarów lub dopłata za m².
// ---------------------------------------------------------------------------
export interface GroupOption {
  key: string;
  label: L10n;
  nettoPln: number;
  note?: L10n;
}
export interface OptionGroup {
  key: string;
  name: L10n;
  selectionType: "single" | "multi";
  options: GroupOption[];
}

const perM2 = (nettoPln: number): L10n => {
  const eur = Math.round(nettoPln / EUR_PLN_RATE);
  return L(
    `Dopłata ok. ${eur} € za m² dachu`,
    `Surcharge about € ${eur} per m² of roof`,
    `Aufpreis ca. ${eur} € pro m² Dach`,
    `Meerprijs ca. € ${eur} per m² dak`,
  );
};

export const OPTION_GROUPS: OptionGroup[] = [
  {
    key: "piec",
    name: L("Piec w saunie", "Stove in the sauna", "Ofen in der Sauna", "Kachel in de sauna"),
    selectionType: "single",
    options: [
      { key: "diabaz", label: L("Piec opalany drewnem Diabaz", "Wood-fired stove Diabaz", "Holzbefeuerter Ofen Diabaz", "Houtgestookte kachel Diabaz"), nettoPln: 0 },
      { key: "diabaz-bimsch", label: L("Piec Diabaz + BimSch v2", "Stove Diabaz + BimSch v2", "Ofen Diabaz + BimSch v2", "Kachel Diabaz + BimSch v2"), nettoPln: 650 },
      { key: "cylindro", label: L("Piec elektryczny Harvia Cylindro 9 kW + Blebox (sterowanie Wi-Fi)", "Electric stove Harvia Cylindro 9 kW + Blebox (Wi-Fi control)", "Elektroofen Harvia Cylindro 9 kW + Blebox (WLAN-Steuerung)", "Elektrische kachel Harvia Cylindro 9 kW + Blebox (wifi-besturing)"), nettoPln: 3100 },
      { key: "legend-blebox", label: L("Piec elektryczny Harvia Legend Home 11 kW + Blebox (sterowanie Wi-Fi)", "Electric stove Harvia Legend Home 11 kW + Blebox (Wi-Fi control)", "Elektroofen Harvia Legend Home 11 kW + Blebox (WLAN-Steuerung)", "Elektrische kachel Harvia Legend Home 11 kW + Blebox (wifi-besturing)"), nettoPln: 5200 },
      { key: "legend-harvia", label: L("Piec elektryczny Harvia Legend Home 11 kW + sterowanie Harvia Wi-Fi", "Electric stove Harvia Legend Home 11 kW + Harvia Wi-Fi control", "Elektroofen Harvia Legend Home 11 kW + Harvia-WLAN-Steuerung", "Elektrische kachel Harvia Legend Home 11 kW + Harvia wifi-besturing"), nettoPln: 5900 },
    ],
  },
  {
    key: "oswietlenie",
    name: L("Oświetlenie", "Lighting", "Beleuchtung", "Verlichting"),
    selectionType: "multi",
    options: [
      { key: "standard", label: L("Oświetlenie standardowe z instalacją (lampa, wyłącznik, gniazdo 230 V)", "Standard lighting with installation (lamp, switch, 230 V socket)", "Standardbeleuchtung mit Installation (Lampe, Schalter, 230-V-Steckdose)", "Standaardverlichting met installatie (lamp, schakelaar, stopcontact 230 V)"), nettoPln: 1300 },
      { key: "led", label: L("Oświetlenie LED (dodatkowe)", "LED lighting (additional)", "LED-Beleuchtung (zusätzlich)", "LED-verlichting (extra)"), nettoPln: 800 },
      { key: "lampa", label: L("Dodatkowa lampa z abażurem", "Additional lamp with a shade", "Zusätzliche Lampe mit Schirm", "Extra lamp met kap"), nettoPln: 450 },
    ],
  },
  {
    key: "impregnacja",
    name: L("Impregnacja", "Impregnation", "Imprägnierung", "Impregnering"),
    selectionType: "multi",
    options: [
      { key: "wewnetrzna", label: L("Impregnacja wewnętrzna (cena od, rośnie z rozmiarem)", "Interior impregnation (price from, rises with size)", "Innenimprägnierung (Preis ab, steigt mit der Größe)", "Binnenimpregnering (prijs vanaf, stijgt met de maat)"), nettoPln: 650 },
      { key: "zewnetrzna", label: L("Impregnacja zewnętrzna (cena od, rośnie z rozmiarem)", "Exterior impregnation (price from, rises with size)", "Außenimprägnierung (Preis ab, steigt mit der Größe)", "Buitenimpregnering (prijs vanaf, stijgt met de maat)"), nettoPln: 1200 },
    ],
  },
  {
    key: "wyposazenie",
    name: L("Dodatkowe wyposażenie", "Additional equipment", "Zusatzausstattung", "Extra uitrusting"),
    selectionType: "multi",
    options: [
      { key: "lawka-l", label: L("Ławka w kształcie L z oparciem", "L-shaped bench with a backrest", "L-förmige Bank mit Rückenlehne", "L-vormige bank met rugleuning"), nettoPln: 800 },
      { key: "radio", label: L("Radio z głośnikami", "Radio with speakers", "Radio mit Lautsprechern", "Radio met luidsprekers"), nettoPln: 1300 },
      { key: "obraz-solny", label: L("Obraz solny 1,2 x 0,3 m", "Salt picture 1.2 x 0.3 m", "Salzbild 1,2 x 0,3 m", "Zoutbeeld 1,2 x 0,3 m"), nettoPln: 900 },
      { key: "drzwi-drewniane", label: L("Drzwi drewniane (zamiast szklanych)", "Wooden door (instead of glass)", "Holztür (statt Glas)", "Houten deur (in plaats van glas)"), nettoPln: 400 },
    ],
  },
  {
    key: "przeszklenie-tarasowe",
    name: L("Przeszklenie przesuwne tarasowe", "Sliding terrace glazing", "Terrassen-Schiebeverglasung", "Schuifbeglazing voor het terras"),
    selectionType: "single",
    options: [
      { key: "brak", label: L("Brak", "None", "Keine", "Geen"), nettoPln: 0 },
      ...[2, 3, 4, 5, 6].map((m) => ({
        key: `${m}m`,
        label: L(`${m} m`, `${m} m`, `${m} m`, `${m} m`),
        nettoPln: 2375 * m,
      })),
    ],
  },
  {
    key: "dach-pokrycie",
    name: L("Pokrycie dachu", "Roof covering", "Dachdeckung", "Dakbedekking"),
    selectionType: "single",
    options: [
      { key: "brak", label: L("Bez pokrycia", "No covering", "Ohne Dachdeckung", "Zonder bedekking"), nettoPln: 0 },
      { key: "blacha", label: L("Dach pokryty blachą", "Sheet metal roof covering", "Dach mit Blechdeckung", "Dak met plaatbedekking"), nettoPln: 0, note: perM2(150) },
      { key: "gont", label: L("Dach pokryty gontem bitumicznym", "Bitumen shingle roof covering", "Dach mit Bitumenschindeln", "Dak met bitumineuze shingles"), nettoPln: 0, note: perM2(200) },
    ],
  },
  {
    key: "dach-kolor-blacha",
    name: L("Kolor dachu z blachy", "Sheet metal roof colour", "Farbe des Blechdachs", "Kleur van het plaatdak"),
    selectionType: "single",
    options: [
      { key: "ral-9010", label: L("Biały (RAL 9010)", "White (RAL 9010)", "Weiß (RAL 9010)", "Wit (RAL 9010)"), nettoPln: 0 },
      { key: "ral-8017", label: L("Brąz (RAL 8017)", "Brown (RAL 8017)", "Braun (RAL 8017)", "Bruin (RAL 8017)"), nettoPln: 0 },
      { key: "ral-7016", label: L("Grafit (RAL 7016)", "Graphite (RAL 7016)", "Graphit (RAL 7016)", "Grafiet (RAL 7016)"), nettoPln: 0 },
    ],
  },
  {
    key: "dach-kolor-gont",
    name: L("Kolor gontu", "Shingle colour", "Farbe der Schindeln", "Kleur van de shingles"),
    selectionType: "single",
    options: [
      { key: "czerwony", label: L("Czerwony", "Red", "Rot", "Rood"), nettoPln: 0 },
      { key: "zielony", label: L("Zielony", "Green", "Grün", "Groen"), nettoPln: 0 },
      { key: "grafitowy", label: L("Grafitowy", "Graphite", "Graphit", "Grafiet"), nettoPln: 0 },
    ],
  },
];

export const groupId = (key: string): string => detUuid(`group:${key}`);
export const optionId = (groupKey: string, optionKey: string): string => detUuid(`option:${groupKey}:${optionKey}`);
export const productIdOf = (key: string): string => detUuid(`product:${key}`);
export const variantIdOf = (key: string, code: string): string => detUuid(`variant:${key}:${code}`);

// Zakres modułu pomijany w danych zewnętrznych; stałe pomocnicze wyeksportowane dla importu.
export { ELECTRICAL, INSULATION, INTERIOR, BENCH };
