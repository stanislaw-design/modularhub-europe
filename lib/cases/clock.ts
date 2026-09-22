// Wstrzykiwany zegar (spec 0048 AC-6): interwały i okna czasowe czytają czas
// stąd, nie z Date.now(), żeby dało się je testować bez czekania.
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
