// MirageVision: telewizory zewnętrzne, serie Silver i Gold jako 2 produkty (Platinum już istnieje
// w bazie od 2026-09-30 jako 'Platinum Series', z cenami i zdjęciami, więc nie jest tu importowany),
// rozmiary jako warianty `katalogowy` (spec 0056). Źródło: Spec Poster 2026-10-01, karty rodzin
// z 2026-09-22 i pionowe specyfikacje serii. Bez cen (priceOnRequest) do potwierdzenia z MirageVision.
// Pominięte celowo: Emerald/Ruby/Diamond (zasilanie 110-120 V, nie na rynek UE), Silver 32"/43"
// (sprzeczna rozdzielczość w źródle), tuner (standard amerykański) w polu wejść.

export type Locale = "pl" | "en" | "de" | "nl";
export interface L10n {
  pl: string;
  en: string;
  de: string;
  nl: string;
}

export const MIRAGEVISION_PRODUCER_ID = "90e8bc66-e10a-4fba-9afe-b31544a37d40";

interface TvSize {
  sku: string;
  inch: number;
  /** Wymiary W × H × D w calach. */
  dimsIn: [number, number, number];
  weightLb: number;
  /** Rozstaw VESA, np. "400x300"; brak = niepotwierdzony w źródle. */
  vesa?: string;
  screw: string;
  peakNits: number;
  sustainedNits: number;
}

interface FaqSource {
  id: string;
  question: L10n;
  answer: L10n;
}

export interface TvSeriesSource {
  id: string;
  /** Wartość filtra paska Outdoor TV (spec 0071): product.outdoor_tv_sun_exposure. */
  sunExposure: "cien" | "czesciowe-slonce" | "pelne-slonce";
  name: L10n;
  description: L10n;
  usageNote: L10n;
  features: L10n[];
  defaultInch: number;
  sizes: TvSize[];
  /** Pola wspólne dla serii: klucz jsonb (PL) -> etykieta i wartość w 4 językach. */
  specs: Record<string, { label: L10n; value: L10n }>;
  faq: FaqSource[];
}

const same = (value: string): L10n => ({ pl: value, en: value, de: value, nl: value });

const L = {
  sizes: { pl: "Dostępne przekątne", en: "Available screen sizes", de: "Verfügbare Bildschirmgrößen", nl: "Beschikbare schermgroottes" },
  resolution: { pl: "Rozdzielczość", en: "Resolution", de: "Auflösung", nl: "Resolutie" },
  brightness: { pl: "Jasność", en: "Brightness", de: "Helligkeit", nl: "Helderheid" },
  usage: { pl: "Zakres użytkowania", en: "Intended use", de: "Einsatzbereich", nl: "Beoogd gebruik" },
  panel: { pl: "Technologia panelu", en: "Panel technology", de: "Paneltechnologie", nl: "Paneeltechnologie" },
  smart: { pl: "System smart TV", en: "Smart TV platform", de: "Smart-TV-Plattform", nl: "Smart-tv-platform" },
  inputs: { pl: "Wejścia", en: "Inputs", de: "Eingänge", nl: "Ingangen" },
  audioOut: { pl: "Wyjście audio", en: "Audio output", de: "Audioausgang", nl: "Audio-uitgang" },
  connectivity: { pl: "Łączność bezprzewodowa", en: "Wireless connectivity", de: "Drahtlose Verbindung", nl: "Draadloze verbinding" },
  control: { pl: "Sterowanie", en: "Control", de: "Steuerung", nl: "Bediening" },
  ip: { pl: "Stopień ochrony", en: "Ingress protection", de: "Schutzart", nl: "Beschermingsklasse" },
  temp: { pl: "Temperatura pracy", en: "Operating temperature", de: "Betriebstemperatur", nl: "Bedrijfstemperatuur" },
  power: { pl: "Zasilanie", en: "Power supply", de: "Stromversorgung", nl: "Voeding" },
  refresh: { pl: "Częstotliwość odświeżania", en: "Refresh rate", de: "Bildwiederholrate", nl: "Verversingssnelheid" },
  colors: { pl: "Gama kolorów", en: "Color gamut", de: "Farbraum", nl: "Kleurbereik" },
  box: { pl: "W zestawie", en: "In the box", de: "Lieferumfang", nl: "In de doos" },
  warranty: { pl: "Gwarancja", en: "Warranty", de: "Garantie", nl: "Garantie" },
  dims: { pl: "Wymiary i waga wg przekątnej", en: "Dimensions and weight by size", de: "Maße und Gewicht je Größe", nl: "Afmetingen en gewicht per formaat" },
  vesa: { pl: "Rozstaw VESA wg przekątnej", en: "VESA pattern by size", de: "VESA-Lochbild je Größe", nl: "VESA-patroon per formaat" },
};

const COMMON = {
  ip: same("IP55"),
  temp: same("10–50 °C"),
  power: { pl: "100–240 V, 50/60 Hz", en: "100–240 V, 50/60 Hz", de: "100–240 V, 50/60 Hz", nl: "100–240 V, 50/60 Hz" },
  resolution: same("4K (3840 × 2160)"),
  audioOut: { pl: "optyczne, HDMI eARC", en: "optical, HDMI eARC", de: "optisch, HDMI eARC", nl: "optisch, HDMI eARC" },
  warranty: {
    pl: "1 rok części i robocizny od MirageVision, możliwość przedłużenia o 2. i 3. rok",
    en: "1 year parts and labor from MirageVision, extendable to a 2nd and 3rd year",
    de: "1 Jahr Garantie auf Teile und Arbeit von MirageVision, Verlängerung auf ein 2. und 3. Jahr möglich",
    nl: "1 jaar garantie op onderdelen en arbeid van MirageVision, verlengbaar tot een 2e en 3e jaar",
  },
  box: {
    pl: "Telewizor, pokrowiec, pilot, instrukcja, zestaw montażowy",
    en: "TV, TV cover, remote, manual, hardware pack",
    de: "Fernseher, Schutzhülle, Fernbedienung, Anleitung, Montagesatz",
    nl: "Tv, beschermhoes, afstandsbediening, handleiding, montageset",
  },
};

const faqWaterproof: FaqSource = {
  id: "czy-wodoodporny",
  question: {
    pl: "Czy ten telewizor jest wodoodporny?",
    en: "Is this TV waterproof?",
    de: "Ist dieser Fernseher wasserdicht?",
    nl: "Is deze tv waterdicht?",
  },
  answer: {
    pl: "Nie w sensie dosłownym, telewizor nie działa pod wodą. Stopień ochrony IP55 oznacza odporność na kurz i na strugi wody z dowolnego kierunku, a wnętrze chroni powłoka KryptoShield. Jest przeznaczony do stałego montażu na zewnątrz.",
    en: "Not in the literal sense: the TV does not work underwater. The IP55 rating means protection against dust and water jets from any direction, and the electronics are protected by the KryptoShield coating. It is made for permanent outdoor installation.",
    de: "Nicht im wörtlichen Sinne, der Fernseher funktioniert nicht unter Wasser. Die Schutzart IP55 bedeutet Schutz gegen Staub und Strahlwasser aus beliebiger Richtung, und die Elektronik ist durch die KryptoShield-Beschichtung geschützt. Er ist für die dauerhafte Montage im Freien gedacht.",
    nl: "Niet letterlijk: de tv werkt niet onder water. Beschermingsklasse IP55 betekent bescherming tegen stof en waterstralen uit elke richting, en de elektronica is beschermd door de KryptoShield-coating. Hij is bedoeld voor permanente montage buiten.",
  },
};

const faqVoltage: FaqSource = {
  id: "zasilanie-europa",
  question: {
    pl: "Czy telewizor zadziała z europejską siecią 230 V?",
    en: "Will the TV work on a European 230 V supply?",
    de: "Funktioniert der Fernseher am europäischen 230-V-Netz?",
    nl: "Werkt de tv op het Europese 230 V-net?",
  },
  answer: {
    pl: "Specyfikacja producenta podaje zasilanie 100–240 V, 50/60 Hz, więc nie potrzeba transformatora, wystarczy kabel z europejską wtyczką. Zgodność z wymaganiami UE (CE) potwierdzamy z MirageVision przy zapytaniu ofertowym.",
    en: "The manufacturer's specification lists 100–240 V, 50/60 Hz, so no transformer is needed, only a cable with a European plug. Compliance with EU requirements (CE) is confirmed with MirageVision when you send an inquiry.",
    de: "Laut Herstellerangabe beträgt die Stromversorgung 100–240 V, 50/60 Hz, ein Transformator ist also nicht nötig, nur ein Kabel mit europäischem Stecker. Die Konformität mit den EU-Anforderungen (CE) klären wir bei einer Anfrage mit MirageVision.",
    nl: "Volgens de specificatie van de fabrikant is de voeding 100–240 V, 50/60 Hz, dus een transformator is niet nodig, alleen een kabel met Europese stekker. Conformiteit met de EU-eisen (CE) bevestigen we met MirageVision bij een offerteaanvraag.",
  },
};

const faqWarranty: FaqSource = {
  id: "gwarancja-outdoor",
  question: {
    pl: "Jaka jest gwarancja na telewizor?",
    en: "What warranty does the TV have?",
    de: "Welche Garantie hat der Fernseher?",
    nl: "Welke garantie heeft de tv?",
  },
  answer: {
    pl: "1 rok części i robocizny od MirageVision, z możliwością przedłużenia o 2. i 3. rok. Warunki serwisu na terenie Unii Europejskiej potwierdzamy przy zapytaniu ofertowym.",
    en: "1 year of parts and labor from MirageVision, extendable to a 2nd and 3rd year. We confirm the terms of service within the European Union when you send an inquiry.",
    de: "1 Jahr Garantie auf Teile und Arbeit von MirageVision, verlängerbar auf ein 2. und 3. Jahr. Die Servicebedingungen innerhalb der Europäischen Union klären wir bei einer Anfrage.",
    nl: "1 jaar garantie op onderdelen en arbeid van MirageVision, verlengbaar tot een 2e en 3e jaar. De servicevoorwaarden binnen de Europese Unie bevestigen we bij een offerteaanvraag.",
  },
};

function sunFaq(answer: L10n): FaqSource {
  return {
    id: "pelne-slonce",
    question: {
      pl: "Czy mogę oglądać ten telewizor w słońcu?",
      en: "Can I watch this TV in sunlight?",
      de: "Kann ich diesen Fernseher in der Sonne ansehen?",
      nl: "Kan ik deze tv in de zon bekijken?",
    },
    answer,
  };
}

const gridInputs = (hdmi: number): L10n => ({
  pl: `HDMI ×${hdmi}, USB, Composite, Ethernet`,
  en: `HDMI ×${hdmi}, USB, Composite, Ethernet`,
  de: `HDMI ×${hdmi}, USB, Composite, Ethernet`,
  nl: `HDMI ×${hdmi}, USB, Composite, Ethernet`,
});

export const TV_SERIES: TvSeriesSource[] = [
  {
    id: "9ca9dfbe-330f-4019-9fd7-2a2e24113d7e",
    sunExposure: "cien",
    name: {
      pl: "Silver — telewizor zewnętrzny do strefy zacienionej",
      en: "Silver — Outdoor TV for Shaded Areas",
      de: "Silver — Outdoor-Fernseher für schattige Bereiche",
      nl: "Silver — buitentelevisie voor schaduwrijke plekken",
    },
    description: {
      pl: "Telewizor zewnętrzny z serii Silver (rodzina Shade) do zadaszonych i zacienionych miejsc: pod pergolą, w zabudowanej altanie czy na zadaszonym tarasie, także wieczorem. Jasność do 1000 nit wystarcza przy rozproszonym świetle, ale nie w bezpośrednim słońcu. Smart TV z Fire TV, Wi-Fi 6 i sterowaniem głosowym Alexa. Obudowa ma stopień ochrony IP55, a wnętrze chroni powłoka KryptoShield.",
      en: "An outdoor TV from the Silver series (Shade family) for covered and shaded spots: under a pergola, in an enclosed gazebo or on a roofed terrace, also in the evening. Up to 1,000 nits of brightness is enough in diffuse light, but not in direct sunlight. Smart TV with Fire TV, Wi-Fi 6 and Alexa voice control. The housing is rated IP55 and the electronics are protected by the KryptoShield coating.",
      de: "Ein Outdoor-Fernseher der Serie Silver (Familie Shade) für überdachte und schattige Plätze: unter der Pergola, im geschlossenen Pavillon oder auf der überdachten Terrasse, auch am Abend. Bis zu 1.000 Nits Helligkeit genügen bei diffusem Licht, aber nicht in direkter Sonne. Smart TV mit Fire TV, Wi-Fi 6 und Alexa-Sprachsteuerung. Das Gehäuse hat die Schutzart IP55, die Elektronik schützt die KryptoShield-Beschichtung.",
      nl: "Een buitentelevisie uit de Silver-serie (Shade-familie) voor overdekte en schaduwrijke plekken: onder een pergola, in een gesloten tuinhuis of op een overdekt terras, ook 's avonds. Tot 1.000 nits helderheid volstaat bij diffuus licht, maar niet in direct zonlicht. Smart-tv met Fire TV, Wi-Fi 6 en Alexa-spraakbediening. De behuizing heeft beschermingsklasse IP55 en de elektronica is beschermd door de KryptoShield-coating.",
    },
    usageNote: {
      pl: "Seria Silver jest przeznaczona do w pełni zadaszonych, zacienionych stref, z minimalnym światłem dziennym. Do miejsc ze słońcem wybierz serię Gold (częściowe słońce) lub Platinum (pełne słońce).",
      en: "The Silver series is made for fully covered, shaded areas with minimal daylight. For sunny spots choose the Gold (partial sun) or Platinum (full sun) series.",
      de: "Die Serie Silver ist für vollständig überdachte, schattige Bereiche mit wenig Tageslicht gedacht. Für sonnige Plätze wählen Sie die Serie Gold (teilweise Sonne) oder Platinum (volle Sonne).",
      nl: "De Silver-serie is bedoeld voor volledig overdekte, schaduwrijke plekken met weinig daglicht. Kies voor zonnige plekken de Gold-serie (gedeeltelijke zon) of Platinum (volle zon).",
    },
    features: [
      {
        pl: "Jasność do 1000 nit (850 nit ciągle) do pracy w cieniu",
        en: "Up to 1,000 nits (850 nits sustained) for use in shade",
        de: "Bis zu 1.000 Nits (850 Nits dauerhaft) für den Einsatz im Schatten",
        nl: "Tot 1.000 nits (850 nits continu) voor gebruik in de schaduw",
      },
      {
        pl: "Fire TV, Wi-Fi 6 i sterowanie głosowe Alexa",
        en: "Fire TV, Wi-Fi 6 and Alexa voice control",
        de: "Fire TV, Wi-Fi 6 und Alexa-Sprachsteuerung",
        nl: "Fire TV, Wi-Fi 6 en Alexa-spraakbediening",
      },
      {
        pl: "Obudowa IP55 i powłoka KryptoShield chroniąca elektronikę",
        en: "IP55 housing and KryptoShield coating protecting the electronics",
        de: "IP55-Gehäuse und KryptoShield-Beschichtung zum Schutz der Elektronik",
        nl: "IP55-behuizing en KryptoShield-coating die de elektronica beschermt",
      },
    ],
    defaultInch: 55,
    sizes: [
      { sku: "MTS-050SS", inch: 50, dimsIn: [43.7, 25.5, 3.6], weightLb: 23, vesa: "400x300", screw: "M6", peakNits: 1000, sustainedNits: 850 },
      { sku: "MTS-055SS", inch: 55, dimsIn: [48.3, 28.1, 3.6], weightLb: 31, screw: "M6", peakNits: 1000, sustainedNits: 850 },
      { sku: "MTS-065SS", inch: 65, dimsIn: [56.9, 33.0, 3.6], weightLb: 41, vesa: "400x300", screw: "M6", peakNits: 1000, sustainedNits: 850 },
      { sku: "MTS-075SS", inch: 75, dimsIn: [65.7, 37.9, 3.6], weightLb: 57, vesa: "500x400", screw: "M6", peakNits: 1000, sustainedNits: 850 },
      { sku: "MTS-085SS", inch: 85, dimsIn: [74.4, 42.8, 3.6], weightLb: 69, vesa: "600x400", screw: "M6", peakNits: 1000, sustainedNits: 850 },
    ],
    specs: {
      zakresUżytkowania: {
        label: L.usage,
        value: {
          pl: "Strefa zadaszona i zacieniona (rodzina Shade)",
          en: "Covered, shaded area (Shade family)",
          de: "Überdachter, schattiger Bereich (Familie Shade)",
          nl: "Overdekte, schaduwrijke plek (Shade-familie)",
        },
      },
      jasność: { label: L.brightness, value: { pl: "1000 nit szczytowo, 850 nit ciągle", en: "1,000 nits peak, 850 nits sustained", de: "1.000 Nits Spitze, 850 Nits dauerhaft", nl: "1.000 nits piek, 850 nits continu" } },
      rozdzielczość: { label: L.resolution, value: COMMON.resolution },
      technologiaPanelu: { label: L.panel, value: same("Mini LED QLED") },
      systemSmartTv: { label: L.smart, value: same("Fire TV") },
      wejścia: { label: L.inputs, value: gridInputs(4) },
      wyjścieAudio: { label: L.audioOut, value: COMMON.audioOut },
      łączność: { label: L.connectivity, value: same("Wi-Fi 6, Bluetooth 5.3") },
      sterowanie: { label: L.control, value: same("HDMI CEC, Alexa") },
      stopieńOchrony: { label: L.ip, value: COMMON.ip },
      temperaturaPracy: { label: L.temp, value: COMMON.temp },
      zasilanie: { label: L.power, value: COMMON.power },
      wZestawie: { label: L.box, value: COMMON.box },
      gwarancja: { label: L.warranty, value: COMMON.warranty },
    },
    faq: [
      faqWaterproof,
      sunFaq({
        pl: "Nie w bezpośrednim. Silver jest przeznaczona do stref zacienionych i zadaszonych (jasność do 1000 nit). Do miejsc z częściowym słońcem producent oferuje serię Gold (do 2900 nit), a do pełnego słońca serię Platinum (do 3000 nit).",
        en: "Not in direct sunlight. The Silver is made for shaded and covered areas (up to 1,000 nits). For partial sun the manufacturer offers the Gold series (up to 2,900 nits), and for full sun the Platinum series (up to 3,000 nits).",
        de: "Nicht in direkter Sonne. Der Silver ist für schattige und überdachte Bereiche gedacht (bis 1.000 Nits). Für teilweise Sonne bietet der Hersteller die Serie Gold (bis 2.900 Nits), für volle Sonne die Serie Platinum (bis 3.000 Nits).",
        nl: "Niet in direct zonlicht. De Silver is bedoeld voor schaduwrijke en overdekte plekken (tot 1.000 nits). Voor gedeeltelijke zon biedt de fabrikant de Gold-serie (tot 2.900 nits), en voor volle zon de Platinum-serie (tot 3.000 nits).",
      }),
      faqVoltage,
      faqWarranty,
    ],
  },
  {
    id: "539c8b77-dc60-4487-8f22-c4a3bf84cd5c",
    sunExposure: "czesciowe-slonce",
    name: {
      pl: "Gold — telewizor zewnętrzny do częściowego słońca",
      en: "Gold — Outdoor TV for Partial Sun",
      de: "Gold — Outdoor-Fernseher für teilweise Sonne",
      nl: "Gold — buitentelevisie voor gedeeltelijke zon",
    },
    description: {
      pl: "Telewizor zewnętrzny z serii Gold (rodzina Partial Sun) do miejsc częściowo nasłonecznionych: tarasów, ganków, kuchni letnich i innych stref w ogrodzie. Jasność do 2900 nit szczytowo i 2000 nit ciągle, według producenta jedna z najjaśniejszych w tej klasie. Google TV, Wi-Fi 6E oraz sterowanie Control4 i Serial/IP. Obudowa IP55 i powłoka KryptoShield.",
      en: "An outdoor TV from the Gold series (Partial Sun family) for partly sunlit spots: terraces, porches, summer kitchens and other areas of the garden. Up to 2,900 nits peak and 2,000 nits sustained brightness, according to the manufacturer one of the brightest in its class. Google TV, Wi-Fi 6E and Control4 and Serial/IP control. IP55 housing and KryptoShield coating.",
      de: "Ein Outdoor-Fernseher der Serie Gold (Familie Partial Sun) für teilweise sonnige Plätze: Terrassen, Veranden, Sommerküchen und andere Bereiche im Garten. Bis zu 2.900 Nits Spitzenhelligkeit und 2.000 Nits dauerhaft, laut Hersteller einer der hellsten seiner Klasse. Google TV, Wi-Fi 6E sowie Control4- und Serial/IP-Steuerung. IP55-Gehäuse und KryptoShield-Beschichtung.",
      nl: "Een buitentelevisie uit de Gold-serie (Partial Sun-familie) voor deels bezonde plekken: terrassen, veranda's, zomerkeukens en andere delen van de tuin. Tot 2.900 nits piekhelderheid en 2.000 nits continu, volgens de fabrikant een van de helderste in zijn klasse. Google TV, Wi-Fi 6E en Control4- en Serial/IP-bediening. IP55-behuizing en KryptoShield-coating.",
    },
    usageNote: {
      pl: "Seria Gold jest przeznaczona do miejsc częściowo nasłonecznionych. Do pełnej ekspozycji słonecznej producent oferuje serię Platinum.",
      en: "The Gold series is made for partly sunlit spots. For full sun exposure the manufacturer offers the Platinum series.",
      de: "Die Serie Gold ist für teilweise sonnige Plätze gedacht. Für volle Sonneneinstrahlung bietet der Hersteller die Serie Platinum an.",
      nl: "De Gold-serie is bedoeld voor deels bezonde plekken. Voor volle zon biedt de fabrikant de Platinum-serie.",
    },
    features: [
      {
        pl: "2900 nit szczytowo, 2000 nit ciągle: obraz widoczny w częściowym słońcu",
        en: "2,900 nits peak, 2,000 nits sustained: a clear picture in partial sun",
        de: "2.900 Nits Spitze, 2.000 Nits dauerhaft: klares Bild bei teilweiser Sonne",
        nl: "2.900 nits piek, 2.000 nits continu: een helder beeld bij gedeeltelijke zon",
      },
      {
        pl: "Google TV, Wi-Fi 6E, sterowanie Control4 i Serial/IP",
        en: "Google TV, Wi-Fi 6E, Control4 and Serial/IP control",
        de: "Google TV, Wi-Fi 6E, Control4- und Serial/IP-Steuerung",
        nl: "Google TV, Wi-Fi 6E, Control4- en Serial/IP-bediening",
      },
      {
        pl: "Obudowa IP55 i powłoka KryptoShield chroniąca elektronikę",
        en: "IP55 housing and KryptoShield coating protecting the electronics",
        de: "IP55-Gehäuse und KryptoShield-Beschichtung zum Schutz der Elektronik",
        nl: "IP55-behuizing en KryptoShield-coating die de elektronica beschermt",
      },
    ],
    defaultInch: 65,
    sizes: [
      { sku: "MTP-055GS", inch: 55, dimsIn: [48.3, 28.1, 4.0], weightLb: 33.3, vesa: "400x200", screw: "M6", peakNits: 2900, sustainedNits: 2000 },
      { sku: "MTP-065GS", inch: 65, dimsIn: [56.9, 33.0, 4.0], weightLb: 47, vesa: "400x400", screw: "M8", peakNits: 2900, sustainedNits: 2000 },
      { sku: "MTP-075GS", inch: 75, dimsIn: [65.7, 37.9, 4.0], weightLb: 63.9, vesa: "600x400", screw: "M8", peakNits: 2900, sustainedNits: 2000 },
      { sku: "MTP-085GS", inch: 85, dimsIn: [74.5, 43.0, 4.2], weightLb: 92.6, vesa: "600x400", screw: "M8", peakNits: 2900, sustainedNits: 2000 },
      { sku: "MTP-100GS", inch: 100, dimsIn: [87.8, 50.5, 4.2], weightLb: 136.7, vesa: "800x400", screw: "M8", peakNits: 2900, sustainedNits: 2000 },
    ],
    specs: {
      zakresUżytkowania: {
        label: L.usage,
        value: {
          pl: "Miejsca częściowo nasłonecznione (rodzina Partial Sun)",
          en: "Partly sunlit spots (Partial Sun family)",
          de: "Teilweise sonnige Plätze (Familie Partial Sun)",
          nl: "Deels bezonde plekken (Partial Sun-familie)",
        },
      },
      jasność: { label: L.brightness, value: { pl: "2900 nit szczytowo, 2000 nit ciągle", en: "2,900 nits peak, 2,000 nits sustained", de: "2.900 Nits Spitze, 2.000 Nits dauerhaft", nl: "2.900 nits piek, 2.000 nits continu" } },
      rozdzielczość: { label: L.resolution, value: COMMON.resolution },
      technologiaPanelu: { label: L.panel, value: same("Mini LED QLED") },
      systemSmartTv: { label: L.smart, value: same("Google TV") },
      wejścia: { label: L.inputs, value: gridInputs(4) },
      wyjścieAudio: { label: L.audioOut, value: COMMON.audioOut },
      łączność: { label: L.connectivity, value: same("Wi-Fi 6E, Bluetooth 5.3") },
      sterowanie: { label: L.control, value: same("Serial/IP, Control4, HDMI CEC") },
      stopieńOchrony: { label: L.ip, value: COMMON.ip },
      temperaturaPracy: { label: L.temp, value: COMMON.temp },
      zasilanie: { label: L.power, value: COMMON.power },
      wZestawie: { label: L.box, value: COMMON.box },
      gwarancja: { label: L.warranty, value: COMMON.warranty },
    },
    faq: [
      faqWaterproof,
      sunFaq({
        pl: "W częściowym słońcu tak, to właśnie przeznaczenie serii Gold (2900 nit szczytowo, 2000 nit ciągle). Do pełnego, całodziennego słońca producent oferuje serię Platinum (do 3000 nit).",
        en: "In partial sun, yes, that is exactly what the Gold series is made for (2,900 nits peak, 2,000 nits sustained). For full all-day sun the manufacturer offers the Platinum series (up to 3,000 nits).",
        de: "Bei teilweiser Sonne ja, dafür ist die Serie Gold gedacht (2.900 Nits Spitze, 2.000 Nits dauerhaft). Für volle, ganztägige Sonne bietet der Hersteller die Serie Platinum (bis 3.000 Nits).",
        nl: "Bij gedeeltelijke zon ja, daar is de Gold-serie voor bedoeld (2.900 nits piek, 2.000 nits continu). Voor volle zon de hele dag biedt de fabrikant de Platinum-serie (tot 3.000 nits).",
      }),
      faqVoltage,
      faqWarranty,
    ],
  },
];

export const SIZE_LABELS: Record<Locale, (inch: number) => string> = {
  pl: (inch) => `${inch}″, 4K`,
  en: (inch) => `${inch}″, 4K`,
  de: (inch) => `${inch}″, 4K`,
  nl: (inch) => `${inch}″, 4K`,
};

const IN_TO_CM = 2.54;
const LB_TO_KG = 0.45359237;

function number(value: number, locale: Locale): string {
  const text = value.toFixed(1);
  return locale === "en" ? text : text.replace(".", ",");
}

/** "55″: 122,7 × 71,4 × 9,1 cm, 14,1 kg" per przekątna, połączone średnikiem. */
export function sizeDimsLine(series: TvSeriesSource, locale: Locale): string {
  return series.sizes
    .map((size) => {
      const dims = size.dimsIn.map((value) => number(value * IN_TO_CM, locale)).join(" × ");
      return `${size.inch}″: ${dims} cm, ${number(size.weightLb * LB_TO_KG, locale)} kg`;
    })
    .join("; ");
}

export function sizeVesaLine(series: TvSeriesSource): string | null {
  const parts = series.sizes
    .filter((size) => size.vesa !== undefined)
    .map((size) => `${size.inch}″: ${size.vesa!.replace("x", " × ")} mm, ${size.screw}`);
  return parts.length === 0 ? null : parts.join("; ");
}

export function sizesLine(series: TvSeriesSource): string {
  return series.sizes.map((size) => `${size.inch}″`).join(", ");
}

export const SIZE_SPEC_LABELS = { sizes: L.sizes, dims: L.dims, vesa: L.vesa };
