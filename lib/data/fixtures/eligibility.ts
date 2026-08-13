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
];
