import type { Producer } from "./data/types";

// Wspólna selekcja strony głównej i listy /producers: tylko producenci ze
// statusem zatwierdzonym (nagłówek obiecuje weryfikację), najpierw z największą
// liczbą oddanych domów, potem z największą liczbą modeli.
export function sortVerifiedProducers(producers: Producer[]): Producer[] {
  return producers
    .filter((producer) => producer.verified)
    .sort(
      (a, b) =>
        b.completedProjectsCount - a.completedProjectsCount || b.modelsCount - a.modelsCount,
    );
}
