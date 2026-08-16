import type { ExportReadinessCountryStatus } from "../types";

export const exportReadiness: ExportReadinessCountryStatus[] = [
  {
    countryCode: "PL",
    status: "approved",
    reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
    gaps: [],
  },
  {
    countryCode: "DE",
    status: "conditional",
    reason: "Większość wymagań spełniona, brakuje kilku dokumentów dopuszczających do sprzedaży.",
    gaps: [
      "Obliczenia statyczne dla strefy śniegowej 2 wymagane w części Niemiec południowych.",
      "Deklaracja właściwości użytkowych (DoP) zgodna z rozporządzeniem CPR 305/2011.",
      "Protokół badania odporności ogniowej ścian zewnętrznych wystawiony przez notyfikowaną jednostkę niemiecką.",
    ],
  },
  {
    countryCode: "NL",
    status: "blocked",
    reason: "Współczynnik przenikania ciepła nie spełnia holenderskich wymagań BENG dla budynków mieszkalnych.",
    gaps: [],
  },
];
