import { z } from "zod";

// Spec 0075 AC-6, AC-7: planowane użytkowanie w zapytaniach (cały rok albo sezonowo).
// Pole jest opcjonalne. Walidacja Zod wymaga miesięcy przy `seasonal` (baza świadomie
// dopuszcza `seasonal` bez miesięcy, żeby bezpośredni zapis nie padał na CHECK).
export const INTENDED_USES = ["year_round", "seasonal"] as const;
export type IntendedUse = (typeof INTENDED_USES)[number];

export const INTENDED_USE_MONTHS_MIN = 1;
export const INTENDED_USE_MONTHS_MAX = 11;

export const intendedUseShape = {
  intendedUse: z.enum(INTENDED_USES).optional(),
  intendedUseMonths: z.number().int().min(INTENDED_USE_MONTHS_MIN).max(INTENDED_USE_MONTHS_MAX).optional(),
};

export const INTENDED_USE_ERROR = "Dla użytkowania sezonowego podaj liczbę miesięcy od 1 do 11.";

interface IntendedUseFields {
  intendedUse?: IntendedUse;
  intendedUseMonths?: number;
}

// Miesiące mają sens tylko przy `seasonal`, a `seasonal` wymaga miesięcy.
export function isIntendedUseConsistent(data: IntendedUseFields): boolean {
  if (data.intendedUse === "seasonal") return data.intendedUseMonths !== undefined;
  return data.intendedUseMonths === undefined;
}

export const intendedUseRefinement = {
  check: isIntendedUseConsistent,
  params: { message: INTENDED_USE_ERROR, path: ["intendedUseMonths"] as string[] },
};

export function intendedUseColumns(data: IntendedUseFields) {
  return {
    intendedUse: data.intendedUse ?? null,
    intendedUseMonths: data.intendedUse === "seasonal" ? (data.intendedUseMonths ?? null) : null,
  };
}
