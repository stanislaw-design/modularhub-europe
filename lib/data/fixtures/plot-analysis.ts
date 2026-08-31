import type { PlotAnalysisResult } from "../types";

// Result keyed only by projectId: the analysis stage of Facade mocks the same
// outcome for every client and address (see spec 0006 Consequences), one row
// per Project.id, same coverage discipline as fixtures/eligibility.ts.
export const plotAnalysisResults: PlotAnalysisResult[] = [
  {
    projectId: "prj-modulor-family-90",
    status: "approved",
    reason: "Metraż i kształt działki mieszczą się w wymaganym obrysie budynku wraz ze strefami odsunięcia od granic.",
  },
  {
    projectId: "prj-modulor-compact-56",
    status: "approved",
    reason: "Działka spełnia minimalne wymagania powierzchni i dostępu do drogi publicznej dla tego projektu.",
  },
  {
    projectId: "prj-baltyk-loft-120",
    status: "conditional",
    reason: "Wymagany dodatkowy operat geotechniczny potwierdzający nośność gruntu pod konstrukcję stalową na tej wielkości działki.",
  },
  {
    projectId: "prj-baltyk-studio-38",
    status: "approved",
    reason: "Kompaktowy obrys budynku mieści się na działce z zapasem na wymagane odsunięcia od granic.",
  },
  {
    projectId: "prj-karpaty-alpine-104",
    status: "blocked",
    reason: "Zgłoszony metraż działki jest zbyt mały dla obrysu budynku wraz z wymaganym zapasem na obciążenie śniegiem i skarpy terenu.",
  },
  {
    projectId: "prj-karpaty-ridge-72",
    status: "conditional",
    reason: "Wymagane potwierdzenie spadku terenu działki; przy nachyleniu powyżej 10% konieczny jest projekt posadowienia na fundamencie punktowym.",
  },
  {
    projectId: "prj-cocomodule-ch24-coco",
    status: "conditional",
    reason: "Wersja pływająca wymaga dostępu do zbiornika wodnego i zgody wodnoprawnej; wersja lądowa nie ma tego wymogu.",
  },
  {
    projectId: "prj-cocomodule-ch36-coco",
    status: "approved",
    reason: "Wydłużony, wąski obrys modułu mieści się na działce z zapasem na wymagane odsunięcia od granic.",
  },
  {
    projectId: "prj-cocomodule-ch72-2",
    status: "approved",
    reason: "Metraż i kształt działki mieszczą się w wymaganym obrysie budynku dwumodułowego wraz ze strefami odsunięcia od granic.",
  },
  {
    projectId: "prj-cocomodule-ch90",
    status: "approved",
    reason: "Kwadratowy obrys trzymodułowego budynku mieści się na działce z zapasem na wymagane odsunięcia od granic.",
  },
  {
    projectId: "prj-cocomodule-ch140",
    status: "conditional",
    reason: "Wymagany dodatkowy operat geotechniczny potwierdzający nośność gruntu pod skrzyżowane stalowe podpory drugiej kondygnacji.",
  },
];
