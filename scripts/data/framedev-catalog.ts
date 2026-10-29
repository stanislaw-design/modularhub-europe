// FrameDEV (framedev.pl, stan 2026-10-22): 43 domy na szkielecie stalowym LGS wybrane ze strony /modele
// (partia 1: 13 domów, 6 Homekoncept i 7 Z500/FDPL; partia 2: 30 domów, głównie małych i średnich, framedev-projects-batch2.ts). Źródło to publiczne strony modeli; producent potwierdził
// zgodę na użycie zdjęć. Każdy tekst widoczny dla klienta ma tu cztery wersje językowe (pl jest źródłem,
// en/de/nl idą do tabel tłumaczeń, spec 0067). Same projekty są w framedev-projects.ts.
//
// Ceny: strona podaje trzy pakiety (Stan deweloperski, Pod klucz, All-Inclusive) jako "szacunkowe" i nie mówi,
// czy to netto czy brutto; przeliczamy je jak Logbar (PLN / kurs NBP, bez korekty VAT). Enum standardu
// wykończenia nie ma "all-inclusive" (a "katalogowy" jest zarezerwowany dla produktów katalogowych), więc
// w bazie są dwa warianty (deweloperski, pod klucz), a cena i zakres All-Inclusive wchodzą do FAQ produktu.
import { createHash } from "node:crypto";

export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export const L = (pl: string, en: string, de: string, nl: string): L10n => ({ pl, en, de, nl });

export const IMPORT_USER_ID = "catalog-import:framedev";
export const PRODUCER_ID = "e0030000-0000-4000-8000-000000000102";
export const PHOTO_DIR = "tmp/framedev-catalog";

// Deterministyczny UUID: ten sam klucz zawsze daje ten sam id, więc ponowny import jest idempotentny.
export const detUuid = (key: string): string => {
  const h = createHash("sha1").update(`framedev:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// NBP, tabela 196/A/NBP/2026 z 2026-10-08: 1 EUR = 4,3789 PLN (ten sam kurs co import Logbar).
export const EUR_PLN_RATE = 4.3789;
export const plnToEurCents = (amountPln: number): number => Math.round(amountPln / EUR_PLN_RATE) * 100;

export const FRAMEDEV_PRODUCER = {
  name: "FrameDEV",
  nip: "CATALOG-FRAMEDEV",
  // Bez danych kontaktowych (reguła: kontakt wyłącznie przez platformę).
  description: L(
    "Producent całorocznych domów na prefabrykowanym szkielecie stalowym LGS (ocynkowane profile cienkościenne): konstrukcja powstaje w hali na liniach CNC, a na działce jest montowana w kilka dni. Oferta obejmuje gotowe projekty z serii Homekoncept i Z500, każdy w trzech pakietach wykończenia od stanu deweloperskiego po pełne wyposażenie. Płatności są podzielone na osiem etapów, a cena materiałów zostaje zamrożona po podpisaniu umowy. Projekt można zaadaptować do działki i potrzeb inwestora.",
    "Producer of year-round houses on a prefabricated LGS steel frame (galvanised light-gauge profiles): the structure is made in a factory on CNC lines and assembled on site within days. The range covers ready-made designs from the Homekoncept and Z500 series, each in three finishing packages from shell-and-core to fully equipped. Payments are split into eight stages and the material price is frozen once the contract is signed. A design can be adapted to the plot and the investor's needs.",
    "Hersteller ganzjährig nutzbarer Häuser auf vorgefertigtem LGS-Stahlskelett (verzinkte Leichtstahlprofile): Die Konstruktion entsteht im Werk auf CNC-Linien und wird auf dem Grundstück innerhalb weniger Tage montiert. Das Angebot umfasst fertige Entwürfe der Serien Homekoncept und Z500, jeweils in drei Ausbaupaketen vom Bauträgerstandard bis zur vollständigen Ausstattung. Die Zahlung ist in acht Etappen aufgeteilt, und der Materialpreis wird mit Vertragsabschluss eingefroren. Ein Entwurf kann an das Grundstück und die Wünsche des Bauherrn angepasst werden.",
    "Producent van jaarrondwoningen op een geprefabriceerd LGS-staalskelet (verzinkte lichtgewicht profielen): de constructie wordt in de fabriek op CNC-lijnen gemaakt en binnen enkele dagen op de bouwplaats gemonteerd. Het aanbod omvat kant-en-klare ontwerpen uit de series Homekoncept en Z500, elk in drie afwerkingspakketten van casco tot volledig uitgerust. De betaling is verdeeld over acht etappes en de materiaalprijs wordt bij ondertekening van het contract bevroren. Een ontwerp kan worden aangepast aan de kavel en de wensen van de bouwheer.",
  ),
} as const;

export const ELIGIBILITY_REASON = L(
  "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
  "Feasibility and formal requirements depend on the specific plot and local regulations.",
  "Machbarkeit und formale Anforderungen hängen vom konkreten Grundstück und den örtlichen Vorgaben ab.",
  "De haalbaarheid en de formele vereisten hangen af van de specifieke kavel en de lokale regels.",
);

export const CONSTRUCTION_SYSTEM = L(
  "Prefabrykowany szkielet stalowy LGS (ocynkowane profile) z wypełnieniem z wełny mineralnej, płytą cementowo-wiórową, wiatroizolacją i izolacją fasadową 150 mm.",
  "Prefabricated LGS steel frame (galvanised profiles) with mineral wool filling, cement-bonded particleboard, wind barrier and 150 mm facade insulation.",
  "Vorgefertigtes LGS-Stahlskelett (verzinkte Profile) mit Mineralwolle-Füllung, zementgebundener Spanplatte, Winddichtung und 150 mm Fassadendämmung.",
  "Geprefabriceerd LGS-staalskelet (verzinkte profielen) met minerale wolvulling, cementgebonden spaanplaat, windscherm en 150 mm gevelisolatie.",
);

export const CUSTOMIZATION_SCOPE = L(
  "Projekt można zaadaptować z architektami producenta: zmiana układu ścian działowych, rozmiaru i rozmieszczenia okien oraz modyfikacja bryły budynku.",
  "The design can be adapted with the producer's architects: changing the partition layout, the size and placement of windows and modifying the building form.",
  "Der Entwurf kann mit den Architekten des Herstellers angepasst werden: Änderung der Trennwände, Größe und Anordnung der Fenster sowie Änderung der Gebäudeform.",
  "Het ontwerp kan samen met de architecten van de producent worden aangepast: een andere indeling van de tussenwanden, andere maat en plaatsing van de ramen en een gewijzigde vorm van het gebouw.",
);

export const WALL_BUILD_UP = "Szkielet LGS + wełna mineralna, płyta cementowo-wiórowa, wiatroizolacja, izolacja fasadowa 150 mm, paroizolacja, płyta G-K (x2).";
export const INSULATION = "Wełna mineralna w szkielecie i izolacja fasadowa 150 mm.";

// Zakres pakietów jest identyczny na wszystkich stronach modeli: zdanie wstępne trafia do scopeSummary,
// punkty listy "Zakres pakietu" do pozycji kosztowych (cost_line_item, status "w-cenie"), słowo w słowo ze strony.
export const DEV_INTRO = L(
  "Podstawowy pakiet w technologii stalowego szkieletu FrameDEV – gotowy dom w stanie zamkniętym, z pełnym dociepleniem, stolarką i instalacjami.",
  "The basic package in the FrameDEV steel frame technology – a weathertight house with full insulation, joinery and installations.",
  "Das Basispaket in der FrameDEV-Stahlskelett-Technologie – ein wetterdichtes Haus mit vollständiger Dämmung, Fenstern und Installationen.",
  "Het basispakket in de FrameDEV-staalskelettechnologie – een winddicht huis met volledige isolatie, ramen en installaties.",
);
export const DEV_ITEMS: L10n[] = [
  L(
    "Konstrukcja: prefabrykowany szkielet stalowy ocynkowany",
    "Structure: prefabricated galvanised steel frame",
    "Konstruktion: vorgefertigtes verzinktes Stahlskelett",
    "Constructie: geprefabriceerd verzinkt staalskelet",
  ),
  L(
    "Ściany zewnętrzne: Płyta G-K (x2), Ruszt instalacyjny (opcjonalnie), Paroizolacja, Szkielet LGS + wełna mineralna, Płyta cementowo-wiórowa, Wiatroizolacja, Izolacja fasadowa 150 mm, elewacja zgodnie z projektem",
    "External walls: plasterboard (x2), installation battens (optional), vapour barrier, LGS frame + mineral wool, cement-bonded particleboard, wind barrier, 150 mm facade insulation, facade according to the design",
    "Außenwände: Gipskartonplatte (x2), Installationslattung (optional), Dampfsperre, LGS-Skelett + Mineralwolle, zementgebundene Spanplatte, Winddichtung, 150 mm Fassadendämmung, Fassade gemäß Entwurf",
    "Buitenwanden: gipsplaat (x2), installatieregelwerk (optioneel), dampscherm, LGS-skelet + minerale wol, cementgebonden spaanplaat, windscherm, 150 mm gevelisolatie, gevel volgens het ontwerp",
  ),
  L(
    "Ściany i sufity: wykończone płytą gipsowo-kartonową, przygotowane do malowania",
    "Walls and ceilings: finished with plasterboard, ready for painting",
    "Wände und Decken: mit Gipskartonplatten verkleidet, bereit zum Streichen",
    "Wanden en plafonds: afgewerkt met gipsplaat, klaar om te schilderen",
  ),
  L(
    "Stolarka: okna i drzwi zewnętrzne w standardzie energooszczędnym",
    "Joinery: energy-efficient windows and external doors",
    "Fenster und Türen: energieeffiziente Fenster und Außentüren",
    "Buitenschrijnwerk: energiezuinige ramen en buitendeuren",
  ),
  L(
    "Instalacje: elektryczna i hydrauliczna rozprowadzona w całości",
    "Installations: electrical and plumbing fully distributed",
    "Installationen: Elektro- und Sanitärinstallation vollständig verlegt",
    "Installaties: elektrische en sanitaire installatie volledig aangelegd",
  ),
];
export const DEV_EXCLUDED = L(
  "Płyta fundamentowa (w cenie dopiero w pakiecie All-Inclusive), wymiana gruntu (według faktycznych kosztów), wykończenie wnętrz, kuchnia i wyposażenie łazienek.",
  "Foundation slab (included only in the All-Inclusive package), soil replacement (at actual cost), interior finishing, kitchen and bathroom fittings.",
  "Fundamentplatte (nur im Paket All-Inclusive enthalten), Bodenaustausch (nach tatsächlichen Kosten), Innenausbau, Küche und Badausstattung.",
  "Funderingsplaat (alleen inbegrepen in het pakket All-Inclusive), grondvervanging (tegen werkelijke kosten), interieurafwerking, keuken en badkamerinrichting.",
);
export const TURNKEY_INTRO = L(
  "Dom gotowy do zamieszkania zaraz po odbiorze. Zawiera wszystkie elementy pakietu deweloperskiego oraz pełne wykończenie wnętrz.",
  "A house ready to move into right after handover. It includes all elements of the shell-and-core package and full interior finishing.",
  "Ein Haus, das gleich nach der Übergabe bezugsfertig ist. Es enthält alle Elemente des Bauträgerpakets sowie den vollständigen Innenausbau.",
  "Een woning die direct na oplevering bewoonbaar is. Ze omvat alle onderdelen van het casco-pakket en de volledige interieurafwerking.",
);
export const TURNKEY_ITEMS: L10n[] = [
  L(
    "Wszystkie elementy z pakietu Stan Deweloperski",
    "All elements of the Shell-and-core package",
    "Alle Elemente des Pakets Bauträgerstandard",
    "Alle onderdelen van het pakket Casco",
  ),
  L(
    "Ogrzewanie podłogowe: maty grafenowe – nowoczesne i energooszczędne",
    "Underfloor heating: graphene mats – modern and energy-efficient",
    "Fußbodenheizung: Graphenmatten – modern und energieeffizient",
    "Vloerverwarming: grafeenmatten – modern en energiezuinig",
  ),
  L(
    "Podłogi: panele SPC o wysokiej odporności i wodoodporności",
    "Floors: SPC panels with high durability and water resistance",
    "Böden: SPC-Paneele mit hoher Strapazierfähigkeit und Wasserbeständigkeit",
    "Vloeren: SPC-panelen met hoge slijtvastheid en waterbestendigheid",
  ),
  L(
    "Ściany: dekoracyjne panele węglowe – niepalne, wilgocioodporne",
    "Walls: decorative carbon panels – non-flammable, moisture-resistant",
    "Wände: dekorative Carbonpaneele – nicht brennbar, feuchtigkeitsbeständig",
    "Wanden: decoratieve carbonpanelen – onbrandbaar, vochtbestendig",
  ),
  L(
    "Sufity: wygładzone i pomalowane w wybranym kolorze",
    "Ceilings: smoothed and painted in the chosen colour",
    "Decken: geglättet und in der gewählten Farbe gestrichen",
    "Plafonds: gladgemaakt en geschilderd in de gekozen kleur",
  ),
  L(
    "Drzwi wewnętrzne z ościeżnicami",
    "Interior doors with frames",
    "Innentüren mit Zargen",
    "Binnendeuren met kozijnen",
  ),
  L(
    "Elektryka: zamontowane gniazdka, włączniki, oprawy LED",
    "Electrics: installed sockets, switches and LED fittings",
    "Elektrik: montierte Steckdosen, Schalter und LED-Leuchten",
    "Elektra: gemonteerde stopcontacten, schakelaars en LED-armaturen",
  ),
];
export const TURNKEY_EXCLUDED = L(
  "Płyta fundamentowa i rekuperacja (w cenie dopiero w pakiecie All-Inclusive), wymiana gruntu (według faktycznych kosztów), kuchnia z AGD i wyposażenie łazienek, umeblowanie.",
  "Foundation slab and heat recovery ventilation (included only in the All-Inclusive package), soil replacement (at actual cost), kitchen with appliances and bathroom fittings, furniture.",
  "Fundamentplatte und Lüftung mit Wärmerückgewinnung (nur im Paket All-Inclusive enthalten), Bodenaustausch (nach tatsächlichen Kosten), Küche mit Geräten und Badausstattung, Möblierung.",
  "Funderingsplaat en ventilatie met warmteterugwinning (alleen inbegrepen in het pakket All-Inclusive), grondvervanging (tegen werkelijke kosten), keuken met apparatuur en badkamerinrichting, meubilering.",
);

export const FAQ_PAYMENTS = {
  question: L(
    "Jak wygląda harmonogram płatności i czy cena jest stała?",
    "What is the payment schedule and is the price fixed?",
    "Wie sieht der Zahlungsplan aus und ist der Preis fest?",
    "Hoe ziet het betalingsschema eruit en is de prijs vast?",
  ),
  answer: L(
    "Inwestycja jest podzielona na osiem etapów, a kolejną transzę wpłaca się po sprawdzeniu efektów poprzedniej: 10% projekt i rezerwacja, 20% uruchomienie maszyn, 10% odbiór w fabryce, 10% pakowanie i wysyłka, 10% materiał na działce, 10% złożenie bryły, 15% stan deweloperski, 15% przekazanie kluczy. Po podpisaniu umowy cena materiałów zostaje zamrożona na cały okres budowy.",
    "The investment is split into eight stages and the next instalment is paid after the previous result has been checked: 10% design and reservation, 20% machine start-up, 10% factory acceptance, 10% packing and shipping, 10% materials on site, 10% shell assembly, 15% shell-and-core stage, 15% handover of keys. After the contract is signed the price of materials is frozen for the whole construction period.",
    "Die Investition ist in acht Etappen aufgeteilt, die nächste Rate wird nach Prüfung des vorherigen Ergebnisses gezahlt: 10 % Entwurf und Reservierung, 20 % Anlauf der Maschinen, 10 % Werksabnahme, 10 % Verpackung und Versand, 10 % Material auf dem Grundstück, 10 % Montage des Rohbaus, 15 % Bauträgerstandard, 15 % Schlüsselübergabe. Nach Vertragsabschluss wird der Materialpreis für die gesamte Bauzeit eingefroren.",
    "De investering is verdeeld over acht etappes en de volgende termijn wordt betaald nadat het vorige resultaat is gecontroleerd: 10% ontwerp en reservering, 20% opstarten van de machines, 10% fabrieksoplevering, 10% verpakking en verzending, 10% materiaal op de bouwplaats, 10% montage van de ruwbouw, 15% casco-stadium, 15% overdracht van de sleutels. Na ondertekening van het contract wordt de materiaalprijs voor de hele bouwperiode bevroren.",
  ),
};

export const FAQ_TIMELINE = {
  question: L(
    "Ile trwa realizacja od zamówienia do odbioru kluczy?",
    "How long does the build take from order to handover of the keys?",
    "Wie lange dauert die Realisierung von der Bestellung bis zur Schlüsselübergabe?",
    "Hoe lang duurt de realisatie van bestelling tot overdracht van de sleutels?",
  ),
  answer: L(
    "Od zamówienia do odbioru kluczy realizacja trwa 4-6 miesięcy, a montaż na działce do 14 dni. Producent zapewnia transport i montaż; fundament płytowy jest dodatkowym kosztem poza pakietem All-Inclusive, a wymiana gruntu jest rozliczana według faktycznych kosztów.",
    "From order to handover of the keys the build takes 4-6 months, with on-site assembly of up to 14 days. The producer provides transport and assembly; the foundation slab is an extra cost outside the All-Inclusive package, and soil replacement is charged at actual cost.",
    "Von der Bestellung bis zur Schlüsselübergabe dauert die Realisierung 4-6 Monate, die Montage auf dem Grundstück bis zu 14 Tage. Der Hersteller übernimmt Transport und Montage; die Fundamentplatte ist außerhalb des Pakets All-Inclusive ein Zusatzposten, der Bodenaustausch wird nach tatsächlichen Kosten abgerechnet.",
    "Van bestelling tot overdracht van de sleutels duurt de realisatie 4-6 maanden, met een montage op de bouwplaats van maximaal 14 dagen. De producent verzorgt transport en montage; de funderingsplaat is buiten het pakket All-Inclusive een meerprijs en grondvervanging wordt tegen werkelijke kosten gerekend.",
  ),
};

export const faqAllInclusive = (pricePln: number): { question: L10n; answer: L10n } => {
  const pl = new Intl.NumberFormat("pl-PL").format(pricePln);
  const en = new Intl.NumberFormat("en-GB").format(pricePln);
  const de = new Intl.NumberFormat("de-DE").format(pricePln);
  const nl = new Intl.NumberFormat("nl-NL").format(pricePln);
  return {
    question: L(
      "Czy dostępny jest pakiet All-Inclusive i ile kosztuje?",
      "Is the All-Inclusive package available and how much does it cost?",
      "Gibt es das Paket All-Inclusive und was kostet es?",
      "Is het pakket All-Inclusive beschikbaar en wat kost het?",
    ),
    answer: L(
      `Tak, cena szacunkowa pakietu All-Inclusive to ${pl} zł. Obejmuje wszystko z pakietu Pod klucz oraz płytę fundamentową, rekuperację z odzyskiem ciepła, kuchnię na wymiar z kompletnym AGD i pełne wyposażenie łazienek (armatura, ceramika, płytki). Pełne umeblowanie jest opcją wycenianą indywidualnie.`,
      `Yes, the estimated price of the All-Inclusive package is PLN ${en}. It covers everything in the Turnkey package plus the foundation slab, heat recovery ventilation, a made-to-measure kitchen with full appliances and complete bathroom fittings (taps, sanitaryware, tiles). Full furnishing is an option priced individually.`,
      `Ja, der geschätzte Preis des Pakets All-Inclusive beträgt ${de} PLN. Es umfasst alles aus dem Paket Schlüsselfertig plus Fundamentplatte, Lüftung mit Wärmerückgewinnung, eine Maßküche mit kompletten Geräten und die vollständige Badausstattung (Armaturen, Sanitärkeramik, Fliesen). Die vollständige Möblierung ist eine individuell kalkulierte Option.`,
      `Ja, de geschatte prijs van het pakket All-Inclusive is ${nl} PLN. Het omvat alles uit het pakket Sleutelklaar plus de funderingsplaat, ventilatie met warmteterugwinning, een keuken op maat met complete apparatuur en volledige badkamerinrichting (kranen, sanitair, tegels). Volledige meubilering is een optie die individueel wordt geprijsd.`,
    ),
  };
};

export type FloorLevel = "parter" | "pietro" | "poddasze";

export interface RoomSource {
  name: L10n;
  areaM2: number;
  floorLevel: FloorLevel;
}

export interface FramedevProjectSource {
  key: string;
  id: string;
  name: string;
  series: "Homekoncept" | "Z500";
  floorAreaM2: number;
  builtUpAreaM2: number;
  garageAreaM2: number;
  minPlotWidthM: number;
  plotMinimum: string;
  bedrooms: number | null;
  bathrooms: number;
  storeys: number;
  roofType: L10n;
  heatSource: "gazowe" | "pompa-ciepla-powietrze-woda" | null;
  description: L10n;
  // PLN, wartości ze strony modelu (pakiety szacunkowe).
  pricePln: { developer: number; turnkey: number; allInclusive: number };
  rooms: RoomSource[];
  // Ścieżki względem katalogu głównego repo (tmp/ jest w .gitignore), okładka pierwsza.
  photos: string[];
  // Rzuty od parteru w górę; floorLevel null, gdy rzut nie jest kondygnacją (np. rzut dachu).
  floorPlans: { file: string; floorLevel: "parter" | "pietro" | "poddasze" | null }[];
  sourceUrl: string;
}

const n = (pl: string, en: string, de: string, nl: string) => L(pl, en, de, nl);

export const ROOM_NAMES: Record<string, L10n> = {
  GARDEROBA: n("Garderoba", "Walk-in wardrobe", "Ankleidezimmer", "Inloopkast"),
  SYPIALNIA: n("Sypialnia", "Bedroom", "Schlafzimmer", "Slaapkamer"),
  ŁAZIENKA: n("Łazienka", "Bathroom", "Badezimmer", "Badkamer"),
  KOMUNIKACJA: n("Komunikacja", "Hallway", "Flur", "Gang"),
  WIATROŁAP: n("Wiatrołap", "Entrance lobby", "Windfang", "Portaal"),
  SPIŻARNIA: n("Spiżarnia", "Pantry", "Vorratsraum", "Voorraadkast"),
  GARAŻ: n("Garaż", "Garage", "Garage", "Garage"),
  PRALNIA: n("Pralnia", "Laundry room", "Waschküche", "Wasruimte"),
  KUCHNIA: n("Kuchnia", "Kitchen", "Küche", "Keuken"),
  GABINET: n("Gabinet", "Study", "Arbeitszimmer", "Studeerkamer"),
  "POM. GOSPODARCZE": n("Pomieszczenie gospodarcze", "Utility room", "Hauswirtschaftsraum", "Bijkeuken"),
  POKÓJ: n("Pokój", "Room", "Zimmer", "Kamer"),
  JADALNIA: n("Jadalnia", "Dining room", "Esszimmer", "Eetkamer"),
  SALON: n("Salon", "Living room", "Wohnzimmer", "Woonkamer"),
  "KOTŁOWNIA/POM.GOSP.": n("Kotłownia / pomieszczenie gospodarcze", "Boiler room / utility room", "Heizraum / Hauswirtschaftsraum", "Ketelruimte / bijkeuken"),
  "STREFA DZIENNA": n("Strefa dzienna", "Living area", "Wohnbereich", "Leefruimte"),
  TOALETA: n("Toaleta", "Toilet", "Gäste-WC", "Toilet"),
  "KOTŁOWNIA/PRALNIA": n("Kotłownia / pralnia", "Boiler room / laundry room", "Heizraum / Waschküche", "Ketelruimte / wasruimte"),
  "SALON/JADALNIA": n("Salon z jadalnią", "Living and dining room", "Wohn- und Esszimmer", "Woon- en eetkamer"),
  "SALON / JADALNIA": n("Salon z jadalnią", "Living and dining room", "Wohn- und Esszimmer", "Woon- en eetkamer"),
  KOTŁOWNIA: n("Kotłownia", "Boiler room", "Heizraum", "Ketelruimte"),
  ANTRESOLA: n("Antresola", "Mezzanine", "Galerie", "Mezzanine"),
  "ŁAZIENKA Z SAUNĄ": n("Łazienka z sauną", "Bathroom with sauna", "Badezimmer mit Sauna", "Badkamer met sauna"),
  "KOMUNIKACJA + SCHODY": n("Komunikacja ze schodami", "Hallway with stairs", "Flur mit Treppe", "Gang met trap"),
  SIŁOWNIA: n("Siłownia", "Gym", "Fitnessraum", "Fitnessruimte"),
  SCHOWEK: n("Schowek", "Storage closet", "Abstellraum", "Berging"),
  "BIBLIOTEKA/GABINET": n("Biblioteka / gabinet", "Library / study", "Bibliothek / Arbeitszimmer", "Bibliotheek / studeerkamer"),
  // Nazwy z drugiej partii (modele 14-43), pisownia klucza jak na stronie producenta.
  HOL: n("Hol", "Hall", "Diele", "Hal"),
  HALL: n("Hol", "Hall", "Diele", "Hal"),
  SIEŃ: n("Sień", "Entrance hall", "Eingangshalle", "Entree"),
  KORYTARZ: n("Korytarz", "Corridor", "Korridor", "Gang"),
  WC: n("WC", "Toilet", "WC", "Toilet"),
  SAUNA: n("Sauna", "Sauna", "Sauna", "Sauna"),
  "POMIESZCZENIE GOSPODARCZE": n("Pomieszczenie gospodarcze", "Utility room", "Hauswirtschaftsraum", "Bijkeuken"),
  "POMIESZCZENIE USŁUGOWE": n("Pomieszczenie usługowe", "Service room", "Serviceraum", "Serviceruimte"),
  "P.G. + SPIŻARKA": n("Pomieszczenie gospodarcze ze spiżarką", "Utility room with pantry", "Hauswirtschaftsraum mit Vorratsraum", "Bijkeuken met voorraadkast"),
  "SALON + JADALNIA": n("Salon z jadalnią", "Living and dining room", "Wohn- und Esszimmer", "Woon- en eetkamer"),
  "SALON + KUCHNIA": n("Salon z kuchnią", "Living room with kitchen", "Wohnzimmer mit Küche", "Woonkamer met keuken"),
  "KUCHNIA + JADALNIA": n("Kuchnia z jadalnią", "Kitchen and dining room", "Küche mit Essbereich", "Keuken met eethoek"),
  "POKÓJ DZIENNY + JADALNIA": n("Pokój dzienny z jadalnią", "Living and dining room", "Wohn- und Esszimmer", "Woon- en eetkamer"),
  "POKÓJ DZIENNY + KUCHNIA + JADALNIA": n(
    "Pokój dzienny z kuchnią i jadalnią",
    "Living room with kitchen and dining area",
    "Wohnzimmer mit Küche und Essbereich",
    "Woonkamer met keuken en eethoek",
  ),
  "KOTŁOWNIA + PRALNIA": n("Kotłownia / pralnia", "Boiler room / laundry room", "Heizraum / Waschküche", "Ketelruimte / wasruimte"),
  "KOTŁOWNIA / PRALNIA": n("Kotłownia / pralnia", "Boiler room / laundry room", "Heizraum / Waschküche", "Ketelruimte / wasruimte"),
  "HOL + SCHODY": n("Hol ze schodami", "Hall with stairs", "Diele mit Treppe", "Hal met trap"),
};

export const ROOF_TYPES = {
  flatEpdm: L(
    "Stropodach płaski kryty membraną EPDM",
    "Flat roof with an EPDM membrane",
    "Flachdach mit EPDM-Membran",
    "Plat dak met EPDM-membraan",
  ),
  gable: L(
    "Dwuspadowy, 35°, pokrycie: gont, blacha, blachodachówka lub dachówka",
    "Gable roof, 35°, covering: shingle, sheet metal, metal tile or ceramic tile",
    "Satteldach, 35°, Eindeckung: Schindel, Blech, Blechdachziegel oder Dachziegel",
    "Zadeldak, 35°, dekking: shingle, plaatstaal, metalen dakpan of keramische dakpan",
  ),
  flatPvc: L(
    "Płaski, pokrycie: folia PVC lub papa bitumiczna",
    "Flat roof, covering: PVC membrane or bitumen felt",
    "Flachdach, Eindeckung: PVC-Folie oder Bitumenbahn",
    "Plat dak, dekking: PVC-folie of bitumen dakbedekking",
  ),
  flatMetal: L(
    "Płaski, pokrycie: blacha, folia PVC lub papa bitumiczna",
    "Flat roof, covering: sheet metal, PVC membrane or bitumen felt",
    "Flachdach, Eindeckung: Blech, PVC-Folie oder Bitumenbahn",
    "Plat dak, dekking: plaatstaal, PVC-folie of bitumen dakbedekking",
  ),
  lowPitch: L(
    "Dach o niewielkim spadku (6° / 3°), pokrycie: papa bitumiczna",
    "Low-pitch roof (6° / 3°), covering: bitumen felt",
    "Flach geneigtes Dach (6° / 3°), Eindeckung: Bitumenbahn",
    "Licht hellend dak (6° / 3°), dekking: bitumen dakbedekking",
  ),
};

export const room = (key: string, areaM2: number, floorLevel: FloorLevel = "parter"): RoomSource => ({
  name: ROOM_NAMES[key],
  areaM2,
  floorLevel,
});

export const photos = (slug: string, names: string[]): string[] => names.map((name) => `${PHOTO_DIR}/${slug}/${name}`);
export const plan = (slug: string, name: string, floorLevel: "parter" | "pietro" | "poddasze" | null) => ({
  file: `${PHOTO_DIR}/${slug}/${name}`,
  floorLevel,
});
