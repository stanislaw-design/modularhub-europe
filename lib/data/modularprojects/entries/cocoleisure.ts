import { same, type ModularProjectEntry } from "../types";

// Pierwsza realizacja ModularProjects i zarazem wpis wyróżniony na stronie głównej (spec 0076 AC-9).
export const cocoleisure: ModularProjectEntry = {
  slug: "cocoleisure",
  publishedAt: "2026-10-24",
  featured: true,
  status: "in_production",
  title: {
    pl: "CocoLeisure – 49 nowoczesnych domków rekreacyjnych",
    en: "CocoLeisure – 49 modern holiday cabins",
    de: "CocoLeisure – 49 moderne Ferienhäuser",
    nl: "CocoLeisure – 49 moderne vakantiehuisjes",
  },
  lead: {
    pl: "ModularHub Europe prezentuje inwestycję obejmującą 49 nowoczesnych domków rekreacyjnych realizowanych dla CocoLeisure. Do produkcji wybrano firmę BUDMAN HOUSE, specjalizującą się w budownictwie prefabrykowanym.",
    en: "ModularHub Europe presents an investment of 49 modern holiday cabins being built for CocoLeisure. BUDMAN HOUSE, a specialist in prefabricated construction, was chosen for production.",
    de: "ModularHub Europe präsentiert eine Investition von 49 modernen Ferienhäusern, die für CocoLeisure realisiert werden. Für die Produktion wurde BUDMAN HOUSE ausgewählt, ein Spezialist für Fertigbau.",
    nl: "ModularHub Europe presenteert een investering van 49 moderne vakantiehuisjes die worden gerealiseerd voor CocoLeisure. Voor de productie is gekozen voor BUDMAN HOUSE, specialist in prefabbouw.",
  },
  facts: [
    {
      label: { pl: "Inwestor", en: "Investor", de: "Investor", nl: "Investeerder" },
      value: same("CocoLeisure"),
    },
    {
      label: { pl: "Producent", en: "Producer", de: "Hersteller", nl: "Producent" },
      value: same("BUDMAN HOUSE"),
    },
    {
      label: { pl: "Liczba domków", en: "Number of cabins", de: "Anzahl der Häuser", nl: "Aantal huisjes" },
      value: same("49"),
    },
    {
      label: { pl: "Model", en: "Model", de: "Modell", nl: "Model" },
      value: same("Voorgewel Chalet"),
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
      label: {
        pl: "Łączna powierzchnia domków",
        en: "Total area of the cabins",
        de: "Gesamtfläche der Häuser",
        nl: "Totale oppervlakte van de huisjes",
      },
      value: { pl: "2 459,8 m²", en: "2,459.8 m²", de: "2.459,8 m²", nl: "2.459,8 m²" },
    },
    {
      label: { pl: "Status", en: "Status", de: "Status", nl: "Status" },
      value: {
        pl: "Produkcja w toku",
        en: "Production in progress",
        de: "Produktion läuft",
        nl: "Productie loopt",
      },
    },
  ],
  sections: [
    {
      heading: { pl: "O realizacji", en: "About the project", de: "Über das Projekt", nl: "Over het project" },
      body: {
        pl: "Inwestycja obejmuje 49 domków rekreacyjnych w modelu Voorgewel Chalet. Każdy domek ma 50,2 m² powierzchni, a do tego 42,3 m² tarasu.\n\nDo produkcji wybrano firmę BUDMAN HOUSE, specjalizującą się w budownictwie prefabrykowanym. Domy powstają w hali produkcyjnej, a na budowę trafiają jako gotowe elementy.",
        en: "The investment covers 49 holiday cabins in the Voorgewel Chalet model. Each cabin has 50.2 m² of floor area plus a 42.3 m² terrace.\n\nBUDMAN HOUSE, a specialist in prefabricated construction, was chosen for production. The houses are built in a production hall and reach the site as finished elements.",
        de: "Die Investition umfasst 49 Ferienhäuser im Modell Voorgewel Chalet. Jedes Haus hat 50,2 m² Fläche und zusätzlich eine 42,3 m² große Terrasse.\n\nFür die Produktion wurde BUDMAN HOUSE ausgewählt, ein Spezialist für Fertigbau. Die Häuser entstehen in einer Produktionshalle und kommen als fertige Elemente auf die Baustelle.",
        nl: "De investering omvat 49 vakantiehuisjes van het model Voorgewel Chalet. Elk huisje heeft 50,2 m² woonoppervlak plus een terras van 42,3 m².\n\nVoor de productie is gekozen voor BUDMAN HOUSE, specialist in prefabbouw. De huizen worden in een productiehal gebouwd en komen als kant-en-klare elementen op de bouwplaats.",
      },
    },
  ],
  gallery: [
    {
      file: "01-zgory.webp",
      group: "visualization",
      alt: { pl: "Widok z góry", en: "Top view", de: "Ansicht von oben", nl: "Bovenaanzicht" },
    },
    {
      file: "02-bok.webp",
      group: "visualization",
      alt: { pl: "Widok z boku", en: "Side view", de: "Seitenansicht", nl: "Zijaanzicht" },
    },
    {
      file: "03-prawo.webp",
      group: "visualization",
      alt: { pl: "Widok z prawej", en: "Right view", de: "Ansicht von rechts", nl: "Rechteraanzicht" },
    },
    {
      file: "04-przod.webp",
      group: "visualization",
      alt: { pl: "Widok z przodu", en: "Front view", de: "Vorderansicht", nl: "Vooraanzicht" },
    },
    {
      file: "01-projekt.jpeg",
      group: "design",
      alt: {
        pl: "Konstrukcja szkieletowa, widok z przodu",
        en: "Timber frame structure, front view",
        de: "Holzrahmenkonstruktion, Ansicht von vorne",
        nl: "Houtskeletconstructie, vooraanzicht",
      },
    },
    {
      file: "02-projekt.jpeg",
      group: "design",
      alt: {
        pl: "Szkielet ścian i stropu, widok z góry",
        en: "Wall and floor framing, view from above",
        de: "Wand- und Bodenrahmen, Ansicht von oben",
        nl: "Wand- en vloerframe, bovenaanzicht",
      },
    },
    {
      file: "03-projekt.jpeg",
      group: "design",
      alt: {
        pl: "Podłoga i konstrukcja tarasu",
        en: "Floor and terrace structure",
        de: "Boden- und Terrassenkonstruktion",
        nl: "Vloer- en terrasconstructie",
      },
    },
    {
      file: "01-budowa.jpeg",
      group: "construction",
      alt: {
        pl: "Dom w hali produkcyjnej, widok z przodu",
        en: "House in the production hall, front view",
        de: "Haus in der Produktionshalle, Ansicht von vorne",
        nl: "Huis in de productiehal, vooraanzicht",
      },
    },
    {
      file: "02-budowa.jpeg",
      group: "construction",
      alt: {
        pl: "Elewacja boczna w trakcie budowy",
        en: "Side facade under construction",
        de: "Seitenfassade im Bau",
        nl: "Zijgevel in aanbouw",
      },
    },
    {
      file: "03-budowa.jpeg",
      group: "construction",
      alt: {
        pl: "Taras i przeszklenia w trakcie budowy",
        en: "Terrace and glazing under construction",
        de: "Terrasse und Verglasung im Bau",
        nl: "Terras en beglazing in aanbouw",
      },
    },
  ],
  cover: "04-przod.webp",
  model: {
    type: "stilt-chalet",
    alt: {
      pl: "Interaktywny model 3D domku Voorgewel Chalet na słupach, z tarasem. Można go obracać i przełączać między gotowym domem a szkieletem konstrukcji.",
      en: "Interactive 3D model of the Voorgewel Chalet cabin on stilts with a terrace. You can rotate it and switch between the finished house and the structural frame.",
      de: "Interaktives 3D-Modell des Ferienhauses Voorgewel Chalet auf Stützen mit Terrasse. Es lässt sich drehen und zwischen fertigem Haus und Tragwerk umschalten.",
      nl: "Interactief 3D-model van het huisje Voorgewel Chalet op palen met terras. U kunt het draaien en schakelen tussen het afgewerkte huis en de draagconstructie.",
    },
  },
};
