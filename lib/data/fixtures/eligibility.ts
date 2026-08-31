import type { EligibilityByCountry } from "../types";

export const eligibility: EligibilityByCountry[] = [
  // Modulor Family 90
  {
    projectId: "prj-modulor-family-90",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-modulor-family-90",
    countryCode: "DE",
    status: "conditional",
    reason: "Brakuje obliczeń statycznych dla strefy śniegowej 2 wymaganych w części Niemiec południowych.",
  },
  {
    projectId: "prj-modulor-family-90",
    countryCode: "NL",
    status: "approved",
    reason: "Spełnia holenderskie wymagania BENG dla budynków mieszkalnych.",
  },

  // Modulor Compact 56
  {
    projectId: "prj-modulor-compact-56",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-modulor-compact-56",
    countryCode: "DE",
    status: "approved",
    reason: "Klasa odporności ogniowej i izolacyjność zgodne z normą DIN dla budynków jednorodzinnych.",
  },
  {
    projectId: "prj-modulor-compact-56",
    countryCode: "NL",
    status: "conditional",
    reason: "Współczynnik przenikania ciepła okien (Uw = 1.0) przekracza próg BENG; wymagana wymiana stolarki na klasę A+.",
  },

  // Baltyk Loft 120
  {
    projectId: "prj-baltyk-loft-120",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-baltyk-loft-120",
    countryCode: "DE",
    status: "approved",
    reason: "Konstrukcja stalowa i klasa odporności ogniowej REI 60 spełniają wymagania krajów związkowych.",
  },
  {
    projectId: "prj-baltyk-loft-120",
    countryCode: "NL",
    status: "approved",
    reason: "Spełnia holenderskie wymagania BENG i warunki dotyczące dużych przeszkleń.",
  },

  // Baltyk Studio 38
  {
    projectId: "prj-baltyk-studio-38",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-baltyk-studio-38",
    countryCode: "DE",
    status: "blocked",
    reason: "Odporność ogniowa REI 30 nie spełnia minimum REI 60 wymaganego przy zabudowie blisko granicy działki w tej jurysdykcji.",
  },
  {
    projectId: "prj-baltyk-studio-38",
    countryCode: "NL",
    status: "conditional",
    reason: "Brakuje certyfikatu odporności na obciążenie wiatrem dla strefy przybrzeżnej.",
  },

  // Karpaty Alpine 104
  {
    projectId: "prj-karpaty-alpine-104",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-karpaty-alpine-104",
    countryCode: "DE",
    status: "approved",
    reason: "Konstrukcja CLT z podwyższoną odpornością na obciążenie śniegiem spełnia normy krajów alpejskich Niemiec.",
  },
  {
    projectId: "prj-karpaty-alpine-104",
    countryCode: "NL",
    status: "blocked",
    reason: "Projekt na obciążenie śniegiem, nie na lokalne wymagania dotyczące poziomu wód gruntowych i posadowienia na terenach depresyjnych.",
  },

  // Karpaty Ridge 72
  {
    projectId: "prj-karpaty-ridge-72",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  },
  {
    projectId: "prj-karpaty-ridge-72",
    countryCode: "DE",
    status: "conditional",
    reason: "Brakuje obliczeń statycznych dla strefy śniegowej 2.",
  },
  {
    projectId: "prj-karpaty-ridge-72",
    countryCode: "NL",
    status: "approved",
    reason: "Spełnia holenderskie wymagania konstrukcyjne i energetyczne (BENG).",
  },

  // Cocomodule CH-24 Coco
  {
    projectId: "prj-cocomodule-ch24-coco",
    countryCode: "PL",
    status: "conditional",
    reason: "Wersja pływająca wymaga odrębnej zgody wodnoprawnej; wersja lądowa na podporach nie podlega temu ograniczeniu.",
  },
  {
    projectId: "prj-cocomodule-ch24-coco",
    countryCode: "DE",
    status: "approved",
    reason: "Kompaktowy moduł mieści się w wymaganiach dla obiektów tymczasowych/rekreacyjnych.",
  },
  {
    projectId: "prj-cocomodule-ch24-coco",
    countryCode: "NL",
    status: "approved",
    reason: "Format zgodny z powszechną w Holandii praktyką zabudowy pływającej nad wodą.",
  },

  // Cocomodule CH-36 Coco
  {
    projectId: "prj-cocomodule-ch36-coco",
    countryCode: "PL",
    status: "approved",
    reason: "Metraż poniżej progu zgłoszeniowego, zgodny z warunkami technicznymi dla zabudowy rekreacyjnej.",
  },
  {
    projectId: "prj-cocomodule-ch36-coco",
    countryCode: "DE",
    status: "approved",
    reason: "Zgodne z wymaganiami dla małych budynków modułowych w większości krajów związkowych.",
  },
  {
    projectId: "prj-cocomodule-ch36-coco",
    countryCode: "NL",
    status: "conditional",
    reason: "Katalog producenta nie podaje współczynników przenikania ciepła okien wymaganych do weryfikacji BENG.",
  },

  // Cocomodule CH-72
  {
    projectId: "prj-cocomodule-ch72-2",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi dla budynków całorocznych w Polsce.",
  },
  {
    projectId: "prj-cocomodule-ch72-2",
    countryCode: "DE",
    status: "approved",
    reason: "Dwumodułowa konstrukcja CLT spełnia standardowe wymagania krajów związkowych.",
  },
  {
    projectId: "prj-cocomodule-ch72-2",
    countryCode: "NL",
    status: "approved",
    reason: "Spełnia holenderskie wymagania konstrukcyjne dla budynków modułowych tej wielkości.",
  },

  // Cocomodule CH-90
  {
    projectId: "prj-cocomodule-ch90",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi dla budynków całorocznych w Polsce.",
  },
  {
    projectId: "prj-cocomodule-ch90",
    countryCode: "DE",
    status: "conditional",
    reason: "Katalog producenta nie podaje odporności ogniowej wymaganej do pełnej weryfikacji w tej jurysdykcji.",
  },
  {
    projectId: "prj-cocomodule-ch90",
    countryCode: "NL",
    status: "approved",
    reason: "Trzymodułowy układ spełnia holenderskie wymagania konstrukcyjne dla tej klasy budynków.",
  },

  // Cocomodule CH-140 Premium
  {
    projectId: "prj-cocomodule-ch140",
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi dla budynków dwukondygnacyjnych w Polsce.",
  },
  {
    projectId: "prj-cocomodule-ch140",
    countryCode: "DE",
    status: "approved",
    reason: "Stalowa konstrukcja wsporcza spełnia standardowe wymagania krajów związkowych dla konstrukcji wspornikowych.",
  },
  {
    projectId: "prj-cocomodule-ch140",
    countryCode: "NL",
    status: "blocked",
    reason: "Katalog producenta nie zawiera obliczeń dla stalowej konstrukcji wspornikowej wymaganych przy holenderskich warunkach gruntowych i wietrznych.",
  },
];
