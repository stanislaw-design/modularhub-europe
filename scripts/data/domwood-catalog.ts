// Domwood (domwood.pl): sauny ogrodowe. Dane przepisane ze stron produktów producenta (stan 2026-10-30), pola,
// których strona nie podaje, zostają puste (produkt wtedy jest szkicem). Każdy tekst widoczny dla klienta ma cztery
// wersje językowe (pl jest źródłem, en/de/nl idą do tabel tłumaczeń, spec 0067). Zdjęcia: prawa potwierdzone przez
// użytkownika; główne zdjęcie strony Modern Barn pominięte na jego prośbę, plany (rysunki techniczne) trafiają jako
// product_floor_plan, nie do galerii.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}
export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:domwood";
export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`domwood:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const PRODUCER_ID = detUuid("producer");

// NBP, tabela 212/A/NBP/2026 z 2026-10-30: 1 EUR = 4,3955 PLN. Strona podaje ceny brutto; baza trzyma netto (VAT 23%).
export const EUR_PLN_RATE = 4.3955;
export const priceCentsOf = (bruttoPln: number): number => Math.round(bruttoPln / 1.23 / EUR_PLN_RATE) * 100;

// Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
export const PRODUCER_DESCRIPTION = L(
  "Polski producent drewnianych saun ogrodowych i budynków modułowych. Konstrukcje powstają w całości w hali producenta i jadą do klienta jako gotowy moduł, bez montażu na miejscu, z wyselekcjonowanego drewna skandynawskiego.",
  "Polish producer of wooden garden saunas and modular buildings. The structures are built entirely in the producer's workshop and delivered to the customer as a ready-made module, with no on-site assembly, from selected Scandinavian timber.",
  "Polnischer Hersteller von Gartensaunen aus Holz und Modulgebäuden. Die Konstruktionen entstehen vollständig in der Halle des Herstellers und werden aus ausgewähltem skandinavischem Holz als fertiges Modul ohne Montage vor Ort zum Kunden geliefert.",
  "Poolse producent van houten tuinsauna's en modulaire gebouwen. De constructies worden volledig in de werkplaats van de producent gebouwd en uit geselecteerd Scandinavisch hout als kant-en-klare module zonder montage ter plaatse bij de klant geleverd.",
);

export const ELIGIBILITY_REASON = L(
  "Producent krajowy, dostawa gotowego modułu",
  "Domestic producer, delivery of a ready-made module",
  "Inländischer Hersteller, Lieferung eines fertigen Moduls",
  "Binnenlandse producent, levering van een kant-en-klare module",
);

export const FOUNDATION = L(
  "Przygotowanie podłoża po stronie klienta; rozładunek (dźwig, HDS lub wózek widłowy o odpowiednim udźwigu) organizuje inwestor",
  "Ground preparation by the customer; unloading (crane, HIAB truck or forklift of adequate capacity) is arranged by the investor",
  "Untergrundvorbereitung durch den Kunden; das Abladen (Kran, HDS oder Gabelstapler mit ausreichender Tragkraft) organisiert der Bauherr",
  "Voorbereiding van de ondergrond door de klant; het lossen (kraan, laadkraan of vorkheftruck met voldoende hefvermogen) wordt door de opdrachtgever geregeld",
);

export interface SaunaSpecs {
  claddingMaterial: L10n;
  interiorWoodType: L10n;
  benchMaterial: L10n;
  insulationType: L10n;
  glazingType: L10n;
  electricalRequirement: L10n;
  // Tylko gdy strona to podaje; bez nich produkt jest szkicem (kształt opublikowany wymaga obu pól).
  seatingCapacity?: number;
  hasChangingArea?: boolean;
  changingAreaDescription?: L10n;
}

export interface PhotoSource {
  file: string;
  kind: "photo" | "plan";
}

export interface DomwoodSauna {
  key: string;
  name: string;
  pricePlnBrutto: number;
  externalDimensions: string;
  description: L10n;
  constructionSystem: L10n;
  roofType: L10n;
  customizationScope?: L10n;
  scopeSummary: L10n;
  specs: SaunaSpecs;
  photos: PhotoSource[];
}

const RAW = "tmp/sauna-import/images";
const photos = (dir: string, files: string[], plans: string[] = []): PhotoSource[] => [
  ...files.map((name) => ({ file: `${RAW}/${dir}/${name}`, kind: "photo" as const })),
  ...plans.map((name) => ({ file: `${RAW}/${dir}/${name}`, kind: "plan" as const })),
];

const INSULATION_WOOL = L(
  "Wełna 10 cm w podłodze i ścianach, wewnątrz ściany wyłożone folią aluminiową",
  "10 cm wool in the floor and walls, walls lined with aluminium foil on the inside",
  "10 cm Wolle in Boden und Wänden, Wände innen mit Aluminiumfolie ausgekleidet",
  "10 cm wol in vloer en wanden, wanden aan de binnenzijde bekleed met aluminiumfolie",
);
const INSULATION_LAMELLO = L(
  "Twarda wełna 10 cm w podłodze, ścianach i dachu; od wewnątrz folia aluminiowa do saun",
  "10 cm hard wool in the floor, walls and roof; sauna aluminium foil on the inside",
  "10 cm harte Wolle in Boden, Wänden und Dach; innen Sauna-Aluminiumfolie",
  "10 cm harde wol in vloer, wanden en dak; aan de binnenzijde sauna-aluminiumfolie",
);
const BENCH_ALDER = L(
  "Olcha (nienagrzewająca się), ławki na dwóch poziomach",
  "Alder (does not heat up), benches on two levels",
  "Erle (heizt sich nicht auf), Bänke auf zwei Ebenen",
  "Els (wordt niet heet), banken op twee niveaus",
);
const BENCH_ALDER_LAMELLO = L(
  "Olcha (ławki i oparcie)",
  "Alder (benches and backrest)",
  "Erle (Bänke und Rückenlehne)",
  "Els (banken en rugleuning)",
);
const INTERIOR_LIPA = L("Bezsęczna boazeria lipowa", "Knot-free linden paneling", "Astfreie Wandverkleidung aus Linde", "Kwastvrije lindehouten wandbekleding");
const CONSTRUCTION_PREFIX = {
  pl: "Prefabrykowany moduł drewniany produkowany w całości w hali, dostarczany w całości.",
  en: "Prefabricated timber module built entirely in the workshop and delivered in one piece.",
  de: "Vorgefertigtes Holzmodul, vollständig in der Halle gefertigt und im Ganzen geliefert.",
  nl: "Geprefabriceerde houten module, volledig in de werkplaats gebouwd en in één stuk geleverd.",
};
const CONSTRUCTION_LAMELLO = L(
  `${CONSTRUCTION_PREFIX.pl} Konstrukcja z drewna C24 (świerk skandynawski, kantówka 45 x 95 mm), ocieplenie twardą wełną 10 cm w podłodze, ścianach i dachu, od zewnątrz płyta bitumowana Steico Black 22 mm i elewacja z pionowych drewnianych lamel na pióro i wpust zabezpieczonych lazurą Remmers.`,
  `${CONSTRUCTION_PREFIX.en} C24 timber structure (Scandinavian spruce, 45 x 95 mm), 10 cm hard wool insulation in the floor, walls and roof, Steico Black 22 mm bitumen board outside and a facade of vertical tongue-and-groove wooden slats protected with Remmers lazure.`,
  `${CONSTRUCTION_PREFIX.de} Konstruktion aus C24-Holz (skandinavische Fichte, Kantholz 45 x 95 mm), 10 cm harte Wolldämmung in Boden, Wänden und Dach, außen Steico-Black-Bitumenplatte 22 mm und Fassade aus senkrechten Holzlamellen mit Nut und Feder, mit Remmers-Lasur geschützt.`,
  `${CONSTRUCTION_PREFIX.nl} C24-houtconstructie (Scandinavisch vuren, regel 45 x 95 mm), 10 cm harde wolisolatie in vloer, wanden en dak, aan de buitenzijde Steico Black bitumenplaat 22 mm en een gevel van verticale houten lamellen met messing en groef, beschermd met Remmers-lazuur.`,
);
const ROOF_ANTHRACITE = L(
  "Blacha trapezowa w kolorze antracytowym",
  "Trapezoidal sheet metal in anthracite",
  "Trapezblech in Anthrazit",
  "Trapeziumplaat in antraciet",
);

export const DOMWOOD_SAUNAS: DomwoodSauna[] = [
  {
    key: "modern-barn",
    name: "Domwood Modern Barn",
    pricePlnBrutto: 46100,
    externalDimensions: "320 x 205 cm + taras 320 x 90 cm (dach 380 x 295 cm)",
    description: L(
      "Nowoczesna sauna ogrodowa w stylu Modern Barn: skandynawski design, jednospadowy dach z wysuniętym okapem, duże przeszklenie i taras. Produkowana w całości w hali producenta i dostarczana jako gotowy moduł.",
      "A modern garden sauna in the Modern Barn style: Scandinavian design, a single-slope roof with a wide overhang, large glazing and a terrace. Built entirely in the producer's workshop and delivered as a ready-made module.",
      "Moderne Gartensauna im Modern-Barn-Stil: skandinavisches Design, Pultdach mit weitem Dachüberstand, große Verglasung und Terrasse. Vollständig in der Halle des Herstellers gefertigt und als fertiges Modul geliefert.",
      "Moderne tuinsauna in Modern Barn-stijl: Scandinavisch design, een lessenaarsdak met brede overstek, grote beglazing en een terras. Volledig in de werkplaats van de producent gebouwd en als kant-en-klare module geleverd.",
    ),
    constructionSystem: L(
      `${CONSTRUCTION_PREFIX.pl} Szkielet 45x95 mm C24, ocieplenie wełną 10 cm (podłoga i ściany), elewacja z deski świerkowej skandynawskiej 19x146 mm malowanej lazurą Remmers, tylna ściana z blachy trapezowej T18+.`,
      `${CONSTRUCTION_PREFIX.en} 45x95 mm C24 frame, 10 cm wool insulation (floor and walls), facade of 19x146 mm Scandinavian spruce boards finished with Remmers lazure, rear wall of T18+ trapezoidal sheet metal.`,
      `${CONSTRUCTION_PREFIX.de} Rahmen 45x95 mm C24, 10 cm Wolldämmung (Boden und Wände), Fassade aus skandinavischen Fichtenbrettern 19x146 mm mit Remmers-Lasur, Rückwand aus Trapezblech T18+.`,
      `${CONSTRUCTION_PREFIX.nl} Frame 45x95 mm C24, 10 cm wolisolatie (vloer en wanden), gevel van Scandinavische vurenplanken 19x146 mm met Remmers-lazuur, achterwand van trapeziumplaat T18+.`,
    ),
    roofType: L(
      "Jednospadowy, blacha trapezowa; okap wysunięty 90 cm z przodu i 30 cm po bokach, podbitka z deski świerkowej",
      "Single-slope, trapezoidal sheet metal; overhang of 90 cm at the front and 30 cm on the sides, spruce soffit boards",
      "Pultdach, Trapezblech; Dachüberstand 90 cm vorne und 30 cm an den Seiten, Untersicht aus Fichtenbrettern",
      "Lessenaarsdak, trapeziumplaat; overstek van 90 cm aan de voorkant en 30 cm aan de zijkanten, onderbetimmering van vurenplanken",
    ),
    scopeSummary: L(
      "Sauna z tarasem 320 x 90 cm (deska modrzewiowa lub sosnowa impregnowana ciśnieniowo), piec Harvia PC110 10,8 kW z zewnętrznym sterownikiem WiFi SaunaBox, 3 punkty świetlne w podbitce, LED pod górną ławką, skrzynka z bezpiecznikami na bocznej ścianie.",
      "Sauna with a 320 x 90 cm terrace (pressure-treated larch or pine decking), Harvia PC110 10.8 kW heater with an external SaunaBox WiFi controller, 3 lights in the soffit, LED under the upper bench, fuse box on the side wall.",
      "Sauna mit Terrasse 320 x 90 cm (druckimprägnierte Lärchen- oder Kiefernholzdielen), Harvia-Ofen PC110 10,8 kW mit externer WiFi-Steuerung SaunaBox, 3 Lichtpunkte in der Untersicht, LED unter der oberen Bank, Sicherungskasten an der Seitenwand.",
      "Sauna met terras van 320 x 90 cm (onder druk geïmpregneerde lariks- of grenen vlonders), Harvia PC110 10,8 kW kachel met externe WiFi-besturing SaunaBox, 3 lichtpunten in de onderbetimmering, LED onder de bovenste bank, zekeringkast op de zijwand.",
    ),
    specs: {
      claddingMaterial: L(
        "Deska świerkowa skandynawska 19x146 mm malowana lazurą Remmers; tylna ściana z blachy trapezowej T18+",
        "Scandinavian spruce boards 19x146 mm finished with Remmers lazure; rear wall of T18+ trapezoidal sheet metal",
        "Skandinavische Fichtenbretter 19x146 mm mit Remmers-Lasur; Rückwand aus Trapezblech T18+",
        "Scandinavische vurenplanken 19x146 mm met Remmers-lazuur; achterwand van trapeziumplaat T18+",
      ),
      interiorWoodType: L(
        "Boazeria lipowa lub z thermo sosny (do wyboru)",
        "Linden or thermo pine paneling (to choose from)",
        "Wandverkleidung aus Linde oder Thermokiefer (zur Wahl)",
        "Wandbekleding van linde of thermo-grenen (naar keuze)",
      ),
      benchMaterial: BENCH_ALDER,
      insulationType: INSULATION_WOOL,
      glazingType: L(
        "Okno trzyszybowe hartowane 190 x 190 cm; drzwi zewnętrzne szklane z pochwytem",
        "Triple-glazed tempered window 190 x 190 cm; glass exterior door with a handle bar",
        "Dreifach verglastes gehärtetes Fenster 190 x 190 cm; gläserne Außentür mit Haltegriff",
        "Gehard drievoudig glazen raam 190 x 190 cm; glazen buitendeur met handgreep",
      ),
      electricalRequirement: L(
        "Piec Harvia PC110 10,8 kW z zewnętrznym sterownikiem WiFi SaunaBox; skrzynka z bezpiecznikami na bocznej ścianie",
        "Harvia PC110 10.8 kW heater with an external SaunaBox WiFi controller; fuse box on the side wall",
        "Harvia-Ofen PC110 10,8 kW mit externer WiFi-Steuerung SaunaBox; Sicherungskasten an der Seitenwand",
        "Harvia PC110 10,8 kW kachel met externe WiFi-besturing SaunaBox; zekeringkast op de zijwand",
      ),
      // Wstępnie, na polecenie użytkownika (strona producenta tego nie podaje): 5 osób, bez przebieralni.
      seatingCapacity: 5,
      hasChangingArea: false,
    },
    // Bez głównego zdjęcia strony (nowoczesnasauna.jpg), na prośbę użytkownika.
    photos: [
      ...photos("domwood-modern-barn", [
        "domwood-modern-barn-01.png",
        "domwood-modern-barn-02.png",
        "domwood-modern-barn-03.png",
        "domwood-modern-barn-04.png",
        "domwood-modern-barn-05.png",
        "domwood-modern-barn-06.jpg",
      ]),
      ...photos("raw-modern-barn-extra", [], ["Sauna-Modern-Barn-scaled.png"]),
    ],
  },
  {
    key: "bold-forest",
    name: "Domwood Bold Forest",
    pricePlnBrutto: 48400,
    externalDimensions: "290 x 270 cm + podłoga tarasu 100 x 290 cm",
    description: L(
      "Sauna ogrodowa Bold Forest: odważny design, front w głębokiej zieleni z podwójnym podświetleniem LED, elewacja boczna z thermo sosny układanej pod skosem, dwupoziomowe ławy i duże okno. Produkowana w całości w hali producenta i dostarczana jako gotowy moduł.",
      "Bold Forest garden sauna: bold design, a deep green front with double LED backlighting, side facade of diagonally laid thermo pine, two-level benches and a large window. Built entirely in the producer's workshop and delivered as a ready-made module.",
      "Gartensauna Bold Forest: mutiges Design, tiefgrüne Front mit doppelter LED-Hinterleuchtung, Seitenfassade aus schräg verlegter Thermokiefer, zweistufige Bänke und großes Fenster. Vollständig in der Halle des Herstellers gefertigt und als fertiges Modul geliefert.",
      "Tuinsauna Bold Forest: gedurfd design, een dieggroene voorzijde met dubbele LED-verlichting, zijgevel van diagonaal gelegd thermo-grenen, banken op twee niveaus en een groot raam. Volledig in de werkplaats van de producent gebouwd en als kant-en-klare module geleverd.",
    ),
    constructionSystem: L(
      `${CONSTRUCTION_PREFIX.pl} Szkielet 45x95 mm C24, ocieplenie wełną 10 cm (podłoga i ściany), elewacja z thermo sosny 19x142 mm, tylna ściana z blachy trapezowej T18+.`,
      `${CONSTRUCTION_PREFIX.en} 45x95 mm C24 frame, 10 cm wool insulation (floor and walls), facade of 19x142 mm thermo pine, rear wall of T18+ trapezoidal sheet metal.`,
      `${CONSTRUCTION_PREFIX.de} Rahmen 45x95 mm C24, 10 cm Wolldämmung (Boden und Wände), Fassade aus Thermokiefer 19x142 mm, Rückwand aus Trapezblech T18+.`,
      `${CONSTRUCTION_PREFIX.nl} Frame 45x95 mm C24, 10 cm wolisolatie (vloer en wanden), gevel van thermo-grenen 19x142 mm, achterwand van trapeziumplaat T18+.`,
    ),
    roofType: L(
      "Jednospadowy, blacha trapezowa; okap wysunięty 30 cm z przodu, podbitka z thermo sosny 19x142 mm",
      "Single-slope, trapezoidal sheet metal; overhang of 30 cm at the front, thermo pine soffit boards 19x142 mm",
      "Pultdach, Trapezblech; Dachüberstand 30 cm vorne, Untersicht aus Thermokiefer 19x142 mm",
      "Lessenaarsdak, trapeziumplaat; overstek van 30 cm aan de voorkant, onderbetimmering van thermo-grenen 19x142 mm",
    ),
    scopeSummary: L(
      "Piec Harvia PC110e 10,8 kW z zewnętrznym sterownikiem WiFi SaunaBox, podłoga tarasu 100 x 290 cm, 2 punkty świetlne w bocznych ściankach i 2 LED na środku, LED pod górną ławką i za oparciem, skrzynka z bezpiecznikami na tylnej ścianie.",
      "Harvia PC110e 10.8 kW heater with an external SaunaBox WiFi controller, 100 x 290 cm terrace floor, 2 lights in the side walls and 2 LEDs in the middle, LED under the upper bench and behind the backrest, fuse box on the rear wall.",
      "Harvia-Ofen PC110e 10,8 kW mit externer WiFi-Steuerung SaunaBox, Terrassenboden 100 x 290 cm, 2 Lichtpunkte in den Seitenwänden und 2 LEDs in der Mitte, LED unter der oberen Bank und hinter der Rückenlehne, Sicherungskasten an der Rückwand.",
      "Harvia PC110e 10,8 kW kachel met externe WiFi-besturing SaunaBox, terrasvloer van 100 x 290 cm, 2 lichtpunten in de zijwanden en 2 LED's in het midden, LED onder de bovenste bank en achter de rugleuning, zekeringkast op de achterwand.",
    ),
    specs: {
      claddingMaterial: L(
        "Thermo sosna 19x142 mm; tylna ściana z blachy trapezowej T18+",
        "Thermo pine 19x142 mm; rear wall of T18+ trapezoidal sheet metal",
        "Thermokiefer 19x142 mm; Rückwand aus Trapezblech T18+",
        "Thermo-grenen 19x142 mm; achterwand van trapeziumplaat T18+",
      ),
      interiorWoodType: L(
        "Boazeria olchowa lub z thermo sosny (do wyboru)",
        "Alder or thermo pine paneling (to choose from)",
        "Wandverkleidung aus Erle oder Thermokiefer (zur Wahl)",
        "Wandbekleding van els of thermo-grenen (naar keuze)",
      ),
      benchMaterial: BENCH_ALDER,
      insulationType: INSULATION_WOOL,
      glazingType: L(
        "Okno fix 70 x 190 cm ze szkła hartowanego; drzwi zewnętrzne szklane z pochwytem",
        "Fixed window 70 x 190 cm of tempered glass; glass exterior door with a handle bar",
        "Festes Fenster 70 x 190 cm aus gehärtetem Glas; gläserne Außentür mit Haltegriff",
        "Vast raam 70 x 190 cm van gehard glas; glazen buitendeur met handgreep",
      ),
      electricalRequirement: L(
        "Piec Harvia PC110e 10,8 kW z zewnętrznym sterownikiem WiFi SaunaBox; skrzynka z bezpiecznikami na tylnej ścianie",
        "Harvia PC110e 10.8 kW heater with an external SaunaBox WiFi controller; fuse box on the rear wall",
        "Harvia-Ofen PC110e 10,8 kW mit externer WiFi-Steuerung SaunaBox; Sicherungskasten an der Rückwand",
        "Harvia PC110e 10,8 kW kachel met externe WiFi-besturing SaunaBox; zekeringkast op de achterwand",
      ),
      // Wstępnie, na polecenie użytkownika (strona producenta tego nie podaje): 5 osób, bez przebieralni.
      seatingCapacity: 5,
      hasChangingArea: false,
    },
    photos: photos("raw-bold-forest", ["Bold-Forest.jpg"], ["Sauna-Bold-Forest-Tech-scaled.png"]),
  },
  {
    key: "minispa",
    name: "Domwood MiniSPA",
    pricePlnBrutto: 28900,
    externalDimensions: "185 x 185 cm (dach 245 x 250 cm)",
    description: L(
      "Kompaktowa sauna ogrodowa w stylu Modern Barn dla ograniczonej przestrzeni: front z naturalnego drewna zestawiony z ciemną blachą na ścianach bocznych i dachu, przeszklone drzwi z długim pochwytem i dwupoziomowe ławy.",
      "A compact garden sauna in the Modern Barn style for limited space: a natural wood front combined with dark sheet metal on the side walls and roof, glazed door with a long handle bar and two-level benches.",
      "Kompakte Gartensauna im Modern-Barn-Stil für begrenzten Platz: Front aus Naturholz in Kombination mit dunklem Blech an Seitenwänden und Dach, Glastür mit langem Haltegriff und zweistufige Bänke.",
      "Compacte tuinsauna in Modern Barn-stijl voor beperkte ruimte: een voorzijde van natuurlijk hout gecombineerd met donkere plaat op zijwanden en dak, glazen deur met lange handgreep en banken op twee niveaus.",
    ),
    constructionSystem: L(
      `${CONSTRUCTION_PREFIX.pl} Szkielet 45x95 mm C24, ocieplenie wełną 10 cm (podłoga i ściany), elewacja frontowa z deski świerkowej skandynawskiej 19x146 mm malowanej lazurą Remmers, ściany boczne z blachy trapezowej T18+.`,
      `${CONSTRUCTION_PREFIX.en} 45x95 mm C24 frame, 10 cm wool insulation (floor and walls), front facade of 19x146 mm Scandinavian spruce boards finished with Remmers lazure, side walls of T18+ trapezoidal sheet metal.`,
      `${CONSTRUCTION_PREFIX.de} Rahmen 45x95 mm C24, 10 cm Wolldämmung (Boden und Wände), Frontfassade aus skandinavischen Fichtenbrettern 19x146 mm mit Remmers-Lasur, Seitenwände aus Trapezblech T18+.`,
      `${CONSTRUCTION_PREFIX.nl} Frame 45x95 mm C24, 10 cm wolisolatie (vloer en wanden), voorgevel van Scandinavische vurenplanken 19x146 mm met Remmers-lazuur, zijwanden van trapeziumplaat T18+.`,
    ),
    roofType: L(
      "Jednospadowy, blacha trapezowa; okap wysunięty 50 cm z przodu, 30 cm po bokach i 15 cm z tyłu, podbitka ze świerka skandynawskiego",
      "Single-slope, trapezoidal sheet metal; overhang of 50 cm at the front, 30 cm on the sides and 15 cm at the back, Scandinavian spruce soffit boards",
      "Pultdach, Trapezblech; Dachüberstand 50 cm vorne, 30 cm an den Seiten und 15 cm hinten, Untersicht aus skandinavischer Fichte",
      "Lessenaarsdak, trapeziumplaat; overstek van 50 cm aan de voorkant, 30 cm aan de zijkanten en 15 cm aan de achterkant, onderbetimmering van Scandinavisch vuren",
    ),
    scopeSummary: L(
      "Piec Harvia SW60e 6 kW, zewnętrzny sterownik WiFi SaunaBox, 2 punkty świetlne w podbitce, LED pod górną ławką, skrzynka z bezpiecznikami na tylnej ścianie.",
      "Harvia SW60e 6 kW heater, external SaunaBox WiFi controller, 2 lights in the soffit, LED under the upper bench, fuse box on the rear wall.",
      "Harvia-Ofen SW60e 6 kW, externe WiFi-Steuerung SaunaBox, 2 Lichtpunkte in der Untersicht, LED unter der oberen Bank, Sicherungskasten an der Rückwand.",
      "Harvia SW60e 6 kW kachel, externe WiFi-besturing SaunaBox, 2 lichtpunten in de onderbetimmering, LED onder de bovenste bank, zekeringkast op de achterwand.",
    ),
    specs: {
      claddingMaterial: L(
        "Front: deska świerkowa skandynawska 19x146 mm malowana lazurą Remmers; ściany boczne z blachy trapezowej T18+",
        "Front: Scandinavian spruce boards 19x146 mm finished with Remmers lazure; side walls of T18+ trapezoidal sheet metal",
        "Front: skandinavische Fichtenbretter 19x146 mm mit Remmers-Lasur; Seitenwände aus Trapezblech T18+",
        "Voorzijde: Scandinavische vurenplanken 19x146 mm met Remmers-lazuur; zijwanden van trapeziumplaat T18+",
      ),
      interiorWoodType: L(
        "Boazeria lipowa lub z thermo sosny (do wyboru)",
        "Linden or thermo pine paneling (to choose from)",
        "Wandverkleidung aus Linde oder Thermokiefer (zur Wahl)",
        "Wandbekleding van linde of thermo-grenen (naar keuze)",
      ),
      benchMaterial: BENCH_ALDER,
      insulationType: INSULATION_WOOL,
      glazingType: L(
        "Drzwi zewnętrzne szklane z pochwytem",
        "Glass exterior door with a handle bar",
        "Gläserne Außentür mit Haltegriff",
        "Glazen buitendeur met handgreep",
      ),
      electricalRequirement: L(
        "Piec Harvia SW60e 6 kW z zewnętrznym sterownikiem WiFi SaunaBox; skrzynka z bezpiecznikami na tylnej ścianie",
        "Harvia SW60e 6 kW heater with an external SaunaBox WiFi controller; fuse box on the rear wall",
        "Harvia-Ofen SW60e 6 kW mit externer WiFi-Steuerung SaunaBox; Sicherungskasten an der Rückwand",
        "Harvia SW60e 6 kW kachel met externe WiFi-besturing SaunaBox; zekeringkast op de achterwand",
      ),
      // Wstępnie, na polecenie użytkownika (strona producenta tego nie podaje): 5 osób, bez przebieralni.
      seatingCapacity: 5,
      hasChangingArea: false,
    },
    photos: photos("raw-minispa", ["Sauna-MiniSpa.jpg"]),
  },
  {
    key: "lamello-hemlock",
    name: "Domwood Lamello Hemlock",
    pricePlnBrutto: 37500,
    externalDimensions: "315 x 210 cm (wnętrze 200 x 174 cm)",
    description: L(
      "Sauna ogrodowa Lamello Hemlock dla 5 osób: minimalistyczna bryła z pionowymi lamelami, duże przeszklenie i zadaszony przedsionek z ławką. Wnętrze z lipową boazerią i olchowymi ławkami, elektryczny piec Harvia 8 kW.",
      "Lamello Hemlock garden sauna for 5 people: a minimalist body with vertical slats, large glazing and a covered vestibule with a bench. Interior with linden paneling and alder benches, Harvia 8 kW electric heater.",
      "Gartensauna Lamello Hemlock für 5 Personen: minimalistischer Baukörper mit senkrechten Lamellen, große Verglasung und überdachter Vorraum mit Bank. Innenraum mit Lindenverkleidung und Erlenbänken, elektrischer Harvia-Ofen 8 kW.",
      "Tuinsauna Lamello Hemlock voor 5 personen: een minimalistisch volume met verticale lamellen, grote beglazing en een overdekte voorruimte met bank. Interieur met lindehouten wandbekleding en elzenbanken, elektrische Harvia-kachel van 8 kW.",
    ),
    constructionSystem: CONSTRUCTION_LAMELLO,
    roofType: ROOF_ANTHRACITE,
    customizationScope: L(
      "Na życzenie wersja w lustrzanym odbiciu, piec opalany drewnem lub rozwiązanie sterowane telefonem; szczegóły wyposażenia i ewentualne dopłaty ustalane są indywidualnie.",
      "On request: a mirrored version, a wood-fired heater or a phone-controlled solution; equipment details and any surcharges are agreed individually.",
      "Auf Wunsch: spiegelverkehrte Ausführung, holzbefeuerter Ofen oder per Telefon steuerbare Lösung; Ausstattungsdetails und etwaige Aufpreise werden individuell vereinbart.",
      "Op verzoek: een gespiegelde uitvoering, een houtgestookte kachel of een met de telefoon bestuurbare oplossing; uitrustingsdetails en eventuele meerprijzen worden individueel afgesproken.",
    ),
    scopeSummary: L(
      "Piec elektryczny Harvia 8 kW z opóźnionym startem do 8 godzin, wewnętrzne oświetlenie RGB z pilotem, zewnętrzne oświetlenie z czujnikiem zmierzchu, wentylacja grawitacyjna ukryta pod lamelami.",
      "Harvia 8 kW electric heater with a delayed start of up to 8 hours, interior RGB lighting with a remote, exterior lighting with a dusk sensor, gravity ventilation hidden under the slats.",
      "Elektrischer Harvia-Ofen 8 kW mit verzögertem Start bis 8 Stunden, RGB-Innenbeleuchtung mit Fernbedienung, Außenbeleuchtung mit Dämmerungssensor, unter den Lamellen verborgene Schwerkraftlüftung.",
      "Elektrische Harvia-kachel van 8 kW met vertraagde start tot 8 uur, RGB-binnenverlichting met afstandsbediening, buitenverlichting met schemerschakelaar, onder de lamellen verborgen natuurlijke ventilatie.",
    ),
    specs: {
      claddingMaterial: L(
        "Pionowe drewniane lamele na pióro i wpust, lazura Remmers; pod spodem płyta bitumowana Steico Black 22 mm",
        "Vertical tongue-and-groove wooden slats, Remmers lazure; Steico Black 22 mm bitumen board underneath",
        "Senkrechte Holzlamellen mit Nut und Feder, Remmers-Lasur; darunter Steico-Black-Bitumenplatte 22 mm",
        "Verticale houten lamellen met messing en groef, Remmers-lazuur; eronder Steico Black bitumenplaat 22 mm",
      ),
      interiorWoodType: INTERIOR_LIPA,
      benchMaterial: BENCH_ALDER_LAMELLO,
      insulationType: INSULATION_LAMELLO,
      glazingType: L(
        "Szkło hartowane w pakiecie dwuszybowym",
        "Tempered glass in a double-glazed unit",
        "Gehärtetes Glas als Zweifachverglasung",
        "Gehard glas in een dubbele beglazing",
      ),
      electricalRequirement: L(
        "Piec elektryczny Harvia 8 kW z opóźnionym startem do 8 godzin; oświetlenie RGB z pilotem; oświetlenie zewnętrzne z czujnikiem zmierzchu",
        "Harvia 8 kW electric heater with a delayed start of up to 8 hours; RGB lighting with a remote; exterior lighting with a dusk sensor",
        "Elektrischer Harvia-Ofen 8 kW mit verzögertem Start bis 8 Stunden; RGB-Beleuchtung mit Fernbedienung; Außenbeleuchtung mit Dämmerungssensor",
        "Elektrische Harvia-kachel van 8 kW met vertraagde start tot 8 uur; RGB-verlichting met afstandsbediening; buitenverlichting met schemerschakelaar",
      ),
      seatingCapacity: 5,
      // Przedsionek jest zadaszoną, otwartą wnęką z ławką, bez wieszaków i zamykanego pomieszczenia.
      hasChangingArea: false,
    },
    photos: photos("raw-hemlock", [
      "IMG-20240225-WA0001.jpg",
      "Sauna-Lamello-Lustrzane-odbicie-scaled.jpg",
      "IMG-20240225-WA0003.jpg",
      "IMG-20240303-WA0005.jpg",
      "IMG-20240303-WA0007.jpg",
    ]),
  },
  {
    key: "lamello",
    name: "Domwood Lamello",
    pricePlnBrutto: 37500,
    externalDimensions: "315 x 210 cm (wnętrze 200 x 174 cm)",
    description: L(
      "Sauna ogrodowa Lamello dla 5 osób: prosta, nowoczesna bryła z naturalnym drewnem, pionowa elewacja lamelowa, duże przeszklenie i zadaszona wnęka wejściowa. Piec elektryczny Harvia 8 kW, wnętrze z lipową boazerią i ławkami z olchy.",
      "Lamello garden sauna for 5 people: a simple, modern body with natural wood, a vertical slat facade, large glazing and a covered entrance niche. Harvia 8 kW electric heater, interior with linden paneling and alder benches.",
      "Gartensauna Lamello für 5 Personen: schlichter, moderner Baukörper mit Naturholz, senkrechte Lamellenfassade, große Verglasung und überdachte Eingangsnische. Elektrischer Harvia-Ofen 8 kW, Innenraum mit Lindenverkleidung und Erlenbänken.",
      "Tuinsauna Lamello voor 5 personen: een eenvoudig, modern volume met natuurlijk hout, een gevel van verticale lamellen, grote beglazing en een overdekte ingangsnis. Elektrische Harvia-kachel van 8 kW, interieur met lindehouten wandbekleding en elzenbanken.",
    ),
    constructionSystem: CONSTRUCTION_LAMELLO,
    roofType: ROOF_ANTHRACITE,
    customizationScope: L(
      "Na życzenie wersja w lustrzanym odbiciu, piec opalany drewnem lub piec elektryczny sterowany telefonem; konfigurację i cenę wybranych zmian ustala się indywidualnie.",
      "On request: a mirrored version, a wood-fired heater or an electric heater controlled by phone; the configuration and the price of selected changes are agreed individually.",
      "Auf Wunsch: spiegelverkehrte Ausführung, holzbefeuerter Ofen oder per Telefon gesteuerter Elektroofen; Konfiguration und Preis ausgewählter Änderungen werden individuell vereinbart.",
      "Op verzoek: een gespiegelde uitvoering, een houtgestookte kachel of een elektrische kachel die met de telefoon wordt bediend; de configuratie en de prijs van gekozen wijzigingen worden individueel afgesproken.",
    ),
    scopeSummary: L(
      "Piec elektryczny Harvia 8 kW z opóźnionym startem do 8 godzin, wewnętrzne oświetlenie RGB z pilotem, zewnętrzne oświetlenie z czujnikiem zmierzchu, wentylacja grawitacyjna ukryta pod lamelami, zadaszona wnęka wejściowa z drewnianą ławką.",
      "Harvia 8 kW electric heater with a delayed start of up to 8 hours, interior RGB lighting with a remote, exterior lighting with a dusk sensor, gravity ventilation hidden under the slats, covered entrance niche with a wooden bench.",
      "Elektrischer Harvia-Ofen 8 kW mit verzögertem Start bis 8 Stunden, RGB-Innenbeleuchtung mit Fernbedienung, Außenbeleuchtung mit Dämmerungssensor, unter den Lamellen verborgene Schwerkraftlüftung, überdachte Eingangsnische mit Holzbank.",
      "Elektrische Harvia-kachel van 8 kW met vertraagde start tot 8 uur, RGB-binnenverlichting met afstandsbediening, buitenverlichting met schemerschakelaar, onder de lamellen verborgen natuurlijke ventilatie, overdekte ingangsnis met houten bank.",
    ),
    specs: {
      claddingMaterial: L(
        "Deska lamelowa grubości 2 cm na pióro i wpust, lazura Remmers; pod spodem płyta bitumowana Steico Black 22 mm",
        "2 cm tongue-and-groove slat boards, Remmers lazure; Steico Black 22 mm bitumen board underneath",
        "Lamellenbretter 2 cm mit Nut und Feder, Remmers-Lasur; darunter Steico-Black-Bitumenplatte 22 mm",
        "Lamellenplanken van 2 cm met messing en groef, Remmers-lazuur; eronder Steico Black bitumenplaat 22 mm",
      ),
      interiorWoodType: INTERIOR_LIPA,
      benchMaterial: BENCH_ALDER_LAMELLO,
      insulationType: INSULATION_LAMELLO,
      glazingType: L(
        "Szkło hartowane w pakiecie dwuszybowym",
        "Tempered glass in a double-glazed unit",
        "Gehärtetes Glas als Zweifachverglasung",
        "Gehard glas in een dubbele beglazing",
      ),
      electricalRequirement: L(
        "Piec elektryczny Harvia 8 kW z opóźnionym startem do 8 godzin; oświetlenie RGB z pilotem; oświetlenie zewnętrzne z czujnikiem zmierzchu",
        "Harvia 8 kW electric heater with a delayed start of up to 8 hours; RGB lighting with a remote; exterior lighting with a dusk sensor",
        "Elektrischer Harvia-Ofen 8 kW mit verzögertem Start bis 8 Stunden; RGB-Beleuchtung mit Fernbedienung; Außenbeleuchtung mit Dämmerungssensor",
        "Elektrische Harvia-kachel van 8 kW met vertraagde start tot 8 uur; RGB-verlichting met afstandsbediening; buitenverlichting met schemerschakelaar",
      ),
      seatingCapacity: 5,
      hasChangingArea: false,
    },
    photos: photos(
      "raw-lamello",
      [
        "sauna-06-2-scaled.jpg",
        "sauna-01-2-scaled.jpg",
        "sauna-07-scaled.jpg",
        "1649105985041.jpg",
        "1649105985087.jpg",
        "IMG_20221018_110435-scaled.jpg",
        "Zdjecie-5-male.jpg",
        "Zdjecie-8-male.jpg",
        "Zdjecie-9-male.jpg",
        "Zdjecie-10-scaled.jpg",
        "Zdjecie-7-scaled.jpg",
        "1649105985246.jpg",
        "1649105985263-rotated.jpg",
        "Zdjecie-11-scaled.jpg",
      ],
      ["Rysunek-techniczny-sauny-Lamello-scaled.jpg"],
    ),
  },
  {
    key: "lamello-firestone",
    name: "Domwood Lamello Firestone",
    pricePlnBrutto: 59900,
    externalDimensions: "400 x 245 cm",
    description: L(
      "Przestronna sauna ogrodowa dla 6-7 osób z elewacją lamelową, dużym przeszkleniem z przesuwną osłoną lamelową dla prywatności, osobnym przedsionkiem i tradycyjnym piecem opalanym drewnem Stoveman z paleniskiem od zewnątrz.",
      "A spacious garden sauna for 6-7 people with a slat facade, large glazing with a sliding slat cover for privacy, a separate vestibule and a traditional Stoveman wood-fired heater with the firebox on the outside.",
      "Geräumige Gartensauna für 6-7 Personen mit Lamellenfassade, großer Verglasung mit verschiebbarer Lamellenblende für Privatsphäre, separatem Vorraum und traditionellem holzbefeuertem Stoveman-Ofen mit Feuerung von außen.",
      "Ruime tuinsauna voor 6-7 personen met een lamellengevel, grote beglazing met een schuifbare lamellenafdekking voor privacy, een aparte voorruimte en een traditionele houtgestookte Stoveman-kachel met stookopening aan de buitenzijde.",
    ),
    constructionSystem: CONSTRUCTION_LAMELLO,
    roofType: ROOF_ANTHRACITE,
    customizationScope: L(
      "Sauna konfigurowana zgodnie z oczekiwaniami klienta; dostępne możliwości wykonania i dopasowania wybranych elementów ustala się indywidualnie.",
      "The sauna is configured to the customer's expectations; the available options for making and adapting selected elements are agreed individually.",
      "Die Sauna wird nach den Wünschen des Kunden konfiguriert; die Möglichkeiten zur Ausführung und Anpassung ausgewählter Elemente werden individuell vereinbart.",
      "De sauna wordt geconfigureerd volgens de wensen van de klant; de mogelijkheden voor uitvoering en aanpassing van gekozen onderdelen worden individueel afgesproken.",
    ),
    scopeSummary: L(
      "Piec Stoveman opalany drewnem z paleniskiem od zewnątrz i ścianą z cegły szamotowej, oświetlenie RGB z pilotem, zewnętrzne oświetlenie z czujnikiem zmierzchu, płytki ceramiczne na podłodze, 6 wieszaków, termometr i higrometr, klepsydra, cebrzyk z chochlą.",
      "Stoveman wood-fired heater with the firebox on the outside and a fireclay brick wall, RGB lighting with a remote, exterior lighting with a dusk sensor, ceramic floor tiles, 6 hangers, thermometer and hygrometer, hourglass, bucket with a ladle.",
      "Holzbefeuerter Stoveman-Ofen mit Feuerung von außen und Schamottewand, RGB-Beleuchtung mit Fernbedienung, Außenbeleuchtung mit Dämmerungssensor, Keramikfliesen auf dem Boden, 6 Kleiderhaken, Thermometer und Hygrometer, Sanduhr, Eimer mit Kelle.",
      "Houtgestookte Stoveman-kachel met stookopening aan de buitenzijde en een muur van chamottestenen, RGB-verlichting met afstandsbediening, buitenverlichting met schemerschakelaar, keramische tegels op de vloer, 6 kapstokhaken, thermometer en hygrometer, zandloper, emmer met pollepel.",
    ),
    specs: {
      claddingMaterial: L(
        "Deska lamelowa grubości 2 cm na pióro i wpust, lazura Remmers; pod spodem płyta bitumowana Steico Black 22 mm",
        "2 cm tongue-and-groove slat boards, Remmers lazure; Steico Black 22 mm bitumen board underneath",
        "Lamellenbretter 2 cm mit Nut und Feder, Remmers-Lasur; darunter Steico-Black-Bitumenplatte 22 mm",
        "Lamellenplanken van 2 cm met messing en groef, Remmers-lazuur; eronder Steico Black bitumenplaat 22 mm",
      ),
      interiorWoodType: L(
        "Bezsęczna boazeria lipowa (część saunowa), boazeria świerkowa (przedsionek)",
        "Knot-free linden paneling (sauna room), spruce paneling (vestibule)",
        "Astfreie Lindenverkleidung (Saunaraum), Fichtenverkleidung (Vorraum)",
        "Kwastvrije lindehouten wandbekleding (saunaruimte), vurenhouten wandbekleding (voorruimte)",
      ),
      benchMaterial: L(
        "Olcha (dwupoziomowe ławki i oparcie); ławka świerkowa w przedsionku",
        "Alder (two-level benches and backrest); spruce bench in the vestibule",
        "Erle (zweistufige Bänke und Rückenlehne); Fichtenbank im Vorraum",
        "Els (banken op twee niveaus en rugleuning); vurenhouten bank in de voorruimte",
      ),
      insulationType: INSULATION_LAMELLO,
      glazingType: L(
        "Duże okno z hartowanego szkła w pakiecie dwuszybowym z zewnętrzną przesuwną osłoną lamelową; drzwi do części saunowej ze szkła hartowanego",
        "Large tempered double-glazed window with an exterior sliding slat cover; tempered glass door to the sauna room",
        "Großes gehärtetes Zweifachverglasungsfenster mit äußerer verschiebbarer Lamellenblende; Tür zum Saunaraum aus gehärtetem Glas",
        "Groot gehard raam met dubbele beglazing en een buitenste schuifbare lamellenafdekking; deur naar de saunaruimte van gehard glas",
      ),
      electricalRequirement: L(
        "Piec opalany drewnem Stoveman (bez pieca elektrycznego); zasilanie dla oświetlenia RGB z pilotem i oświetlenia zewnętrznego z czujnikiem zmierzchu",
        "Stoveman wood-fired heater (no electric heater); power for the RGB lighting with a remote and the exterior lighting with a dusk sensor",
        "Holzbefeuerter Stoveman-Ofen (kein Elektroofen); Strom für die RGB-Beleuchtung mit Fernbedienung und die Außenbeleuchtung mit Dämmerungssensor",
        "Houtgestookte Stoveman-kachel (geen elektrische kachel); stroom voor de RGB-verlichting met afstandsbediening en de buitenverlichting met schemerschakelaar",
      ),
      // Strona podaje "6-7 osób"; pole liczbowe przyjmuje dolną granicę.
      seatingCapacity: 6,
      hasChangingArea: true,
      changingAreaDescription: L(
        "Osobny przedsionek z boazerią świerkową, ławką, 6 wieszakami i płytkami ceramicznymi na podłodze",
        "Separate vestibule with spruce paneling, a bench, 6 hangers and ceramic floor tiles",
        "Separater Vorraum mit Fichtenverkleidung, Bank, 6 Kleiderhaken und Keramikfliesen auf dem Boden",
        "Aparte voorruimte met vurenhouten wandbekleding, een bank, 6 kapstokhaken en keramische vloertegels",
      ),
    },
    photos: photos("raw-firestone", [
      "sauna-firestone-14.jpg",
      "sauna-firestone-dscf0553-hdr.jpg",
      "sauna-firestone-15.jpg",
      "sauna-firestone-dscf0678.jpg",
      "sauna-firestone-2.jpg",
      "sauna-firestone-12.jpg",
      "sauna-firestone-dscf0588-hdr.jpg",
      "sauna-firestone-dscf0608-hdr.jpg",
      "sauna-firestone-dscf0732.jpg",
      "sauna-firestone-dscf0694-hdr.jpg",
      "sauna-firestone-dscf0643-hdr.jpg",
      "sauna-firestone-dscf0719.jpg",
      "sauna-firestone-dscf0727.jpg",
    ]),
  },
  {
    key: "lamello-big",
    name: "Domwood Lamello Big",
    pricePlnBrutto: 58900,
    externalDimensions: "370 x 245 cm",
    description: L(
      "Rozbudowana sauna ogrodowa dla 5-6 osób: ciemna elewacja z pionowych lamelek, duże frontowe przeszklenie, dekoracyjne oświetlenie oraz osobny przedsionek z prysznicem. Piec Harvia PC90, system audio z głośnikami JBL.",
      "An extended garden sauna for 5-6 people: a dark facade of vertical slats, large front glazing, decorative lighting and a separate vestibule with a shower. Harvia PC90 heater, audio system with JBL speakers.",
      "Erweiterte Gartensauna für 5-6 Personen: dunkle Fassade aus senkrechten Lamellen, große Frontverglasung, dekorative Beleuchtung und separater Vorraum mit Dusche. Harvia-Ofen PC90, Audiosystem mit JBL-Lautsprechern.",
      "Uitgebreide tuinsauna voor 5-6 personen: een donkere gevel van verticale lamellen, grote beglazing aan de voorzijde, decoratieve verlichting en een aparte voorruimte met douche. Harvia PC90 kachel, audiosysteem met JBL-luidsprekers.",
    ),
    constructionSystem: CONSTRUCTION_LAMELLO,
    roofType: ROOF_ANTHRACITE,
    customizationScope: L(
      "Możliwość wyboru innego pieca oraz bojlera do strefy prysznicowej; szczegóły konfiguracji i zmiany wyposażenia uzgadnia się indywidualnie przy zamówieniu.",
      "A different heater and a different boiler for the shower area can be chosen; configuration details and equipment changes are agreed individually when ordering.",
      "Ein anderer Ofen und ein anderer Boiler für den Duschbereich sind wählbar; Konfigurationsdetails und Ausstattungsänderungen werden bei der Bestellung individuell vereinbart.",
      "Een andere kachel en een andere boiler voor de douchezone zijn te kiezen; configuratiedetails en uitrustingswijzigingen worden bij de bestelling individueel afgesproken.",
    ),
    scopeSummary: L(
      "Piec elektryczny Harvia PC90, oświetlenie RGB z pilotem, zewnętrzne oświetlenie z czujnikiem zmierzchu, audio (2 głośniki JBL, sterowanie Dexon z dotykowym wyświetlaczem), prysznic z deszczownicą i bojlerem, płytki ceramiczne, 6 wieszaków, wentylacja mechaniczna z czujnikiem wilgoci.",
      "Harvia PC90 electric heater, RGB lighting with a remote, exterior lighting with a dusk sensor, audio (2 JBL speakers, Dexon control with a touch display), shower with a rain head and a boiler, ceramic tiles, 6 hangers, mechanical ventilation with a humidity sensor.",
      "Elektrischer Harvia-Ofen PC90, RGB-Beleuchtung mit Fernbedienung, Außenbeleuchtung mit Dämmerungssensor, Audio (2 JBL-Lautsprecher, Dexon-Steuerung mit Touchdisplay), Dusche mit Regenbrause und Boiler, Keramikfliesen, 6 Kleiderhaken, mechanische Lüftung mit Feuchtesensor.",
      "Elektrische Harvia PC90 kachel, RGB-verlichting met afstandsbediening, buitenverlichting met schemerschakelaar, audio (2 JBL-luidsprekers, Dexon-besturing met touchscreen), douche met regendouche en boiler, keramische tegels, 6 kapstokhaken, mechanische ventilatie met vochtsensor.",
    ),
    specs: {
      claddingMaterial: L(
        "Pionowe drewniane lamelki na pióro i wpust, lazura Remmers; pod spodem płyta bitumowana Steico Black 22 mm",
        "Vertical tongue-and-groove wooden slats, Remmers lazure; Steico Black 22 mm bitumen board underneath",
        "Senkrechte Holzlamellen mit Nut und Feder, Remmers-Lasur; darunter Steico-Black-Bitumenplatte 22 mm",
        "Verticale houten lamellen met messing en groef, Remmers-lazuur; eronder Steico Black bitumenplaat 22 mm",
      ),
      interiorWoodType: INTERIOR_LIPA,
      benchMaterial: L(
        "Olcha (ławki i oparcia)",
        "Alder (benches and backrests)",
        "Erle (Bänke und Rückenlehnen)",
        "Els (banken en rugleuningen)",
      ),
      insulationType: INSULATION_LAMELLO,
      glazingType: L(
        "Okno ze szkła hartowanego w pakiecie dwuszybowym; drzwi do sauny ze szkła hartowanego",
        "Tempered double-glazed window; tempered glass sauna door",
        "Fenster aus gehärtetem Glas als Zweifachverglasung; Saunatür aus gehärtetem Glas",
        "Raam van gehard glas met dubbele beglazing; saunadeur van gehard glas",
      ),
      electricalRequirement: L(
        "Piec elektryczny Harvia PC90 (możliwość wyboru innego pieca); oświetlenie RGB z pilotem; audio JBL ze sterowaniem Dexon; bojler do prysznica; wentylacja mechaniczna z czujnikiem wilgoci",
        "Harvia PC90 electric heater (another heater can be chosen); RGB lighting with a remote; JBL audio with Dexon control; shower boiler; mechanical ventilation with a humidity sensor",
        "Elektrischer Harvia-Ofen PC90 (anderer Ofen wählbar); RGB-Beleuchtung mit Fernbedienung; JBL-Audio mit Dexon-Steuerung; Duschboiler; mechanische Lüftung mit Feuchtesensor",
        "Elektrische Harvia PC90 kachel (andere kachel te kiezen); RGB-verlichting met afstandsbediening; JBL-audio met Dexon-besturing; douche-boiler; mechanische ventilatie met vochtsensor",
      ),
      // Strona podaje "5-6 osób"; pole liczbowe przyjmuje dolną granicę.
      seatingCapacity: 5,
      hasChangingArea: true,
      changingAreaDescription: L(
        "Wydzielony przedsionek z prysznicem z deszczownicą, 6 wieszakami i płytkami ceramicznymi",
        "Separate vestibule with a rain-head shower, 6 hangers and ceramic tiles",
        "Separater Vorraum mit Regenbrause-Dusche, 6 Kleiderhaken und Keramikfliesen",
        "Aparte voorruimte met regendouche, 6 kapstokhaken en keramische tegels",
      ),
    },
    photos: photos(
      "raw-lamello-big",
      [
        "sauna-lamello-big-img_20230505_210511_719.jpg",
        "sauna-lamello-big-dsc08075.jpg",
        "sauna-lamello-big-dsc08076.jpg",
        "sauna-lamello-big-dsc08077.jpg",
        "sauna-lamello-big-dsc08082.jpg",
        "sauna-lamello-big-dsc08083.jpg",
        "sauna-lamello-big-dsc08084.jpg",
        "sauna-lamello-big-dsc08102.jpg",
        "sauna-lamello-big-dsc08103.jpg",
        "sauna-lamello-big-dsc08105.jpg",
        "sauna-lamello-big-dsc08106.jpg",
        "sauna-lamello-big-dsc08107.jpg",
        "sauna-lamello-big-dsc08110.jpg",
      ],
      ["sauna-lamello-big-rysunek-techniczny.jpg"],
    ),
  },
];
