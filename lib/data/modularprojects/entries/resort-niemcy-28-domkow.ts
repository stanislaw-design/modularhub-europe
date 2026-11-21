import { same, type ModularProjectEntry } from "../types";

// Otwarte zapytanie (zbieramy oferty), zachęta dla nowych producentów. Bez nazwy inwestora:
// to ten sam model co CocoLeisure, wybrany przez innego inwestora.
// Wizualizacje są poglądowe (wygenerowane), rzuty przerysowane z zapytania ofertowego.
export const resortNiemcy28Domkow: ModularProjectEntry = {
  slug: "resort-niemcy-28-domkow",
  publishedAt: "2026-11-20",
  status: "planned",
  title: {
    pl: "Resort w Niemczech – 28 domków rekreacyjnych",
    en: "Resort in Germany – 28 holiday cabins",
    de: "Resort in Deutschland – 28 Ferienhäuser",
    nl: "Resort in Duitsland – 28 vakantiehuisjes",
  },
  lead: {
    pl: "ModularHub Europe zbiera oferty na 28 identycznych domków rekreacyjnych dla resortu wypoczynkowego w zachodnich Niemczech. Zapytanie jest otwarte dla producentów domów prefabrykowanych, realizacja planowana jest na 2027 rok.",
    en: "ModularHub Europe is collecting offers for 28 identical holiday cabins for a holiday resort in western Germany. The request is open to prefabricated house manufacturers, with delivery planned for 2027.",
    de: "ModularHub Europe sammelt Angebote für 28 identische Ferienhäuser für ein Ferienresort im Westen Deutschlands. Die Anfrage steht Herstellern von Fertighäusern offen, die Umsetzung ist für 2027 geplant.",
    nl: "ModularHub Europe verzamelt offertes voor 28 identieke vakantiehuisjes voor een vakantieresort in het westen van Duitsland. De aanvraag staat open voor fabrikanten van prefabwoningen, de realisatie is gepland voor 2027.",
  },
  facts: [
    {
      label: { pl: "Liczba domków", en: "Number of cabins", de: "Anzahl der Häuser", nl: "Aantal huisjes" },
      value: same("28"),
    },
    {
      label: { pl: "Kraj dostawy", en: "Delivery country", de: "Lieferland", nl: "Land van levering" },
      value: {
        pl: "Niemcy, zachodnia część kraju",
        en: "Western Germany",
        de: "Westdeutschland",
        nl: "West-Duitsland",
      },
    },
    {
      label: {
        pl: "Powierzchnia jednego domku",
        en: "Area of a single cabin",
        de: "Fläche eines Hauses",
        nl: "Oppervlakte per huisje",
      },
      value: { pl: "50,2 m²", en: "50.2 m²", de: "50,2 m²", nl: "50,2 m²" },
    },
    {
      label: { pl: "Powierzchnia tarasu", en: "Terrace area", de: "Terrassenfläche", nl: "Oppervlakte terras" },
      value: { pl: "42,3 m²", en: "42.3 m²", de: "42,3 m²", nl: "42,3 m²" },
    },
    {
      label: { pl: "Układ", en: "Layout", de: "Raumaufteilung", nl: "Indeling" },
      value: {
        pl: "3 sypialnie, do 6 osób",
        en: "3 bedrooms, up to 6 guests",
        de: "3 Schlafzimmer, bis zu 6 Personen",
        nl: "3 slaapkamers, tot 6 personen",
      },
    },
    {
      label: { pl: "Konstrukcja", en: "Structure", de: "Konstruktion", nl: "Constructie" },
      value: {
        pl: "Drewniana szkieletowa, dom na słupach",
        en: "Timber frame, house on stilts",
        de: "Holzrahmenbau, Haus auf Stützen",
        nl: "Houtskelet, huis op palen",
      },
    },
    {
      label: { pl: "Realizacja", en: "Delivery", de: "Umsetzung", nl: "Realisatie" },
      value: same("2027"),
    },
    {
      label: { pl: "Etap", en: "Stage", de: "Phase", nl: "Fase" },
      value: {
        pl: "Zbieramy oferty",
        en: "Collecting offers",
        de: "Angebote werden gesammelt",
        nl: "Offertes worden verzameld",
      },
    },
  ],
  sections: [
    {
      heading: { pl: "O projekcie", en: "About the project", de: "Über das Projekt", nl: "Over het project" },
      body: {
        pl: "Inwestor buduje resort wypoczynkowy w zachodnich Niemczech i planuje w nim 28 identycznych domków rekreacyjnych. To domy na pobyty wypoczynkowe, nie do całorocznego zamieszkania.\n\nKażdy domek ma 50,2 m² powierzchni i 42,3 m² tarasu. Jest parterowy, ma konstrukcję drewnianą i stoi nad terenem na słupach. W środku są salon z kuchnią, trzy sypialnie, łazienka i osobne WC.\n\nTo ten sam model, który ModularHub realizuje już dla [CocoLeisure](/modularprojects/cocoleisure). Kolejny inwestor wybrał go do swojego resortu.",
        en: "The investor is building a holiday resort in western Germany and plans 28 identical holiday cabins there. The houses are meant for holiday stays, not for year round living.\n\nEach cabin has 50.2 m² of floor area and a 42.3 m² terrace. It is single storey, timber built and raised above the ground on stilts. Inside there is a living room with kitchen, three bedrooms, a bathroom and a separate WC.\n\nIt is the same model ModularHub is already delivering for [CocoLeisure](/modularprojects/cocoleisure). Another investor has now chosen it for their resort.",
        de: "Der Investor baut ein Ferienresort im Westen Deutschlands und plant dort 28 identische Ferienhäuser. Die Häuser sind für Ferienaufenthalte gedacht, nicht zum ganzjährigen Wohnen.\n\nJedes Haus hat 50,2 m² Fläche und eine 42,3 m² große Terrasse. Es ist eingeschossig, in Holzbauweise errichtet und steht auf Stützen über dem Gelände. Innen gibt es einen Wohnraum mit Küche, drei Schlafzimmer, ein Bad und ein separates WC.\n\nEs ist dasselbe Modell, das ModularHub bereits für [CocoLeisure](/modularprojects/cocoleisure) realisiert. Ein weiterer Investor hat es nun für sein Resort gewählt.",
        nl: "De investeerder bouwt een vakantieresort in het westen van Duitsland en plant daar 28 identieke vakantiehuisjes. De huisjes zijn bedoeld voor vakantieverblijf, niet voor permanente bewoning.\n\nElk huisje heeft 50,2 m² woonoppervlak en een terras van 42,3 m². Het is gelijkvloers, in houtbouw uitgevoerd en staat op palen boven het terrein. Binnen zijn er een woonkamer met keuken, drie slaapkamers, een badkamer en een apart toilet.\n\nHet is hetzelfde model dat ModularHub al realiseert voor [CocoLeisure](/modularprojects/cocoleisure). Een volgende investeerder heeft het nu gekozen voor zijn resort.",
      },
    },
    {
      heading: {
        pl: "Dwa warianty do wyceny",
        en: "Two variants to quote",
        de: "Zwei Varianten zur Kalkulation",
        nl: "Twee varianten om te offreren",
      },
      body: {
        pl: "Wariant A to stan surowy zamknięty z montażem: podłoga, ściany i dach z izolacją, elewacja, okna PCV trzyszybowe, przesuwne drzwi tarasowe, taras na konstrukcji nośnej oraz instalacje wbudowane (woda, kanalizacja, peszle elektryczne, kanały wentylacji).\n\nWariant B to dom pod klucz, w standardzie wykończenia producenta. Producent opisuje, co obejmuje jego standard.\n\nWymagania są podane jako współczynniki U ścian, podłogi i dachu. Układ warstw jest referencyjny, więc można zaproponować własną technologię o równoważnych parametrach.",
        en: "Variant A is a closed shell with assembly: insulated floor, walls and roof, facade, triple glazed PVC windows, sliding terrace doors, a terrace on a load bearing structure and built in installations (water, drainage, electrical conduits, ventilation ducts).\n\nVariant B is a turnkey house in the manufacturer's own finishing standard. The manufacturer describes what that standard includes.\n\nThe requirements are given as U values for the walls, floor and roof. The layer build up is a reference only, so manufacturers can propose their own technology with equivalent performance.",
        de: "Variante A ist ein geschlossener Rohbau mit Montage: gedämmter Boden, Wände und Dach, Fassade, dreifach verglaste PVC-Fenster, Schiebetüren zur Terrasse, Terrasse auf tragender Unterkonstruktion sowie eingebaute Installationen (Wasser, Abwasser, Leerrohre für Elektrik, Lüftungskanäle).\n\nVariante B ist ein schlüsselfertiges Haus im Ausbaustandard des Herstellers. Der Hersteller beschreibt, was sein Standard umfasst.\n\nDie Anforderungen sind als U-Werte für Wände, Boden und Dach angegeben. Der Schichtaufbau ist nur eine Referenz, eigene Technologien mit gleichwertigen Werten sind willkommen.",
        nl: "Variant A is een gesloten casco met montage: geïsoleerde vloer, wanden en dak, gevel, PVC-ramen met triple glas, schuifpuien naar het terras, een terras op een draagconstructie en ingebouwde installaties (water, afvoer, elektra-buizen, ventilatiekanalen).\n\nVariant B is een sleutelklaar huis in de afwerkingsstandaard van de fabrikant. De fabrikant beschrijft wat die standaard omvat.\n\nDe eisen zijn opgegeven als U-waarden voor wanden, vloer en dak. De laagopbouw is alleen een referentie, dus een eigen technologie met gelijkwaardige prestaties is welkom.",
      },
    },
    {
      heading: { pl: "Dla producentów", en: "For manufacturers", de: "Für Hersteller", nl: "Voor fabrikanten" },
      body: {
        pl: "Szukamy producentów domów prefabrykowanych, którzy w 2027 roku mają moce na serię identycznych domów. Doświadczenie w dostawach do Niemiec jest atutem, ale nie warunkiem.\n\nNa tym etapie wystarczy wycena orientacyjna, widełki cenowe w pełni wystarczą. Oferty porównujemy według ceny domu dostarczonego i zmontowanego, a także terminu, możliwości dostaw partiami, gwarancji i jakości materiałów.",
        en: "We are looking for prefabricated house manufacturers with capacity in 2027 for a series of identical houses. Experience with deliveries to Germany is an advantage, not a requirement.\n\nAt this stage an indicative quote is enough, a price range is perfectly fine. We compare offers on the price of the delivered and assembled house, as well as lead time, ability to deliver in batches, warranty and material quality.",
        de: "Wir suchen Fertighaushersteller, die 2027 Kapazitäten für eine Serie identischer Häuser haben. Erfahrung mit Lieferungen nach Deutschland ist ein Vorteil, aber keine Bedingung.\n\nIn dieser Phase genügt ein Richtangebot, eine Preisspanne reicht völlig aus. Wir vergleichen die Angebote nach dem Preis des gelieferten und montierten Hauses sowie nach Termin, Lieferung in Etappen, Garantie und Materialqualität.",
        nl: "We zoeken fabrikanten van prefabwoningen die in 2027 capaciteit hebben voor een serie identieke huizen. Ervaring met leveringen naar Duitsland is een pluspunt, geen voorwaarde.\n\nIn deze fase volstaat een indicatieve offerte, een prijsbandbreedte is ruim voldoende. We vergelijken offertes op de prijs van het geleverde en gemonteerde huis, en op levertijd, levering in fasen, garantie en materiaalkwaliteit.",
      },
    },
  ],
  gallery: [
    {
      file: "01-front.webp",
      group: "visualization",
      alt: {
        pl: "Wizualizacja poglądowa: domek na słupach z tarasem, wśród sosen nad jeziorem",
        en: "Illustrative visualization: cabin on stilts with a terrace, among pines by a lake",
        de: "Illustrative Visualisierung: Haus auf Stützen mit Terrasse, zwischen Kiefern am See",
        nl: "Indicatieve visualisatie: huisje op palen met terras, tussen dennen aan een meer",
      },
    },
    {
      file: "02-taras.webp",
      group: "visualization",
      alt: {
        pl: "Wizualizacja poglądowa: taras i otwarte drzwi przesuwne do salonu",
        en: "Illustrative visualization: terrace and open sliding doors to the living room",
        de: "Illustrative Visualisierung: Terrasse und offene Schiebetüren zum Wohnraum",
        nl: "Indicatieve visualisatie: terras en open schuifpui naar de woonkamer",
      },
    },
    {
      file: "03-resort.webp",
      group: "visualization",
      alt: {
        pl: "Wizualizacja poglądowa: resort z rzędem identycznych domków w lesie",
        en: "Illustrative visualization: resort with a row of identical cabins in the forest",
        de: "Illustrative Visualisierung: Resort mit einer Reihe identischer Häuser im Wald",
        nl: "Indicatieve visualisatie: resort met een rij identieke huisjes in het bos",
      },
    },
    {
      file: "04-wnetrze.webp",
      group: "visualization",
      alt: {
        pl: "Wizualizacja poglądowa: salon z kuchnią i wyjściem na taras",
        en: "Illustrative visualization: living room with kitchen and access to the terrace",
        de: "Illustrative Visualisierung: Wohnraum mit Küche und Zugang zur Terrasse",
        nl: "Indicatieve visualisatie: woonkamer met keuken en toegang tot het terras",
      },
    },
    {
      file: "01-rzut.webp",
      group: "design",
      alt: {
        pl: "Rzut parteru 8,00 × 7,00 m: salon z kuchnią, trzy sypialnie, łazienka i WC",
        en: "Floor plan 8.00 × 7.00 m: living room with kitchen, three bedrooms, bathroom and WC",
        de: "Grundriss 8,00 × 7,00 m: Wohnraum mit Küche, drei Schlafzimmer, Bad und WC",
        nl: "Plattegrond 8,00 × 7,00 m: woonkamer met keuken, drie slaapkamers, badkamer en toilet",
      },
    },
    {
      file: "02-otwory-taras.webp",
      group: "design",
      alt: {
        pl: "Otwory okienne i taras 42,3 m², schemat",
        en: "Window openings and the 42.3 m² terrace, schematic",
        de: "Fensteröffnungen und Terrasse 42,3 m², Schema",
        nl: "Raamopeningen en terras van 42,3 m², schema",
      },
    },
  ],
  cover: "01-front.webp",
  model: {
    type: "stilt-chalet",
    alt: {
      pl: "Interaktywny model 3D domku na słupach z tarasem, w tym samym układzie co w zapytaniu. Można go obracać i przełączać między gotowym domem a szkieletem konstrukcji.",
      en: "Interactive 3D model of the cabin on stilts with a terrace, in the same layout as in the request. You can rotate it and switch between the finished house and the structural frame.",
      de: "Interaktives 3D-Modell des Hauses auf Stützen mit Terrasse, im gleichen Grundriss wie in der Anfrage. Es lässt sich drehen und zwischen fertigem Haus und Tragwerk umschalten.",
      nl: "Interactief 3D-model van het huisje op palen met terras, in dezelfde indeling als in de aanvraag. U kunt het draaien en schakelen tussen het afgewerkte huis en de draagconstructie.",
    },
  },
};
