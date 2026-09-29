import type { ProductFamily } from "@/lib/data/types";

// Grupa, do której może należeć rodzina produktu w wyszukiwaniu (spec 0035):
// "dom" jest zarówno prawdziwą rodziną, jak i jednoelementową grupą samą w
// sobie; "wiecej-niz-dom" grupuje pod jednym przełącznikiem hero/wyników
// każdą rodzinę "stylu życia" (dziś spa-modulowe i kontenery-modulowe, spec 0039).
export type ProductFamilyGroup = "dom" | "wiecej-niz-dom";

// Jedyne źródło prawdy o tym, jakie rodziny należą do której grupy (spec 0035
// AC-4): dodanie kolejnej rodziny do "Więcej niż dom" w przyszłości to jedna
// linijka tutaj, nie osobna zmiana w SearchCard.tsx, FamilyTabs.tsx i
// lib/results-filters.ts każdym z osobna.
export const FAMILY_GROUPS: Record<ProductFamilyGroup, ProductFamily[]> = {
  dom: ["dom"],
  "wiecej-niz-dom": ["spa-modulowe", "kontenery-modulowe", "outdoor-tv"],
};

// Wartość, jaką może przyjąć parametr URL/filtra `family`: dowolna prawdziwa
// rodzina, albo sentinel grupy "wiecej-niz-dom" oznaczający widok łączony.
export type FamilyFilterValue = ProductFamily | "wiecej-niz-dom";

const GROUP_BY_FAMILY = new Map<ProductFamily, ProductFamilyGroup>(
  (Object.entries(FAMILY_GROUPS) as [ProductFamilyGroup, ProductFamily[]][]).flatMap(([group, families]) =>
    families.map((family) => [family, group] as const)
  )
);

// Do której grupy należy dana wartość filtra, do podświetlania zakładek
// (FamilyTabs, SearchCard): prawdziwa rodzina rozwiązuje się do swojej grupy
// (spa-modulowe/kontenery-modulowe -> wiecej-niz-dom), sentinel rozwiązuje się do siebie.
export function resolveFamilyGroup(value: FamilyFilterValue): ProductFamilyGroup {
  if (value === "wiecej-niz-dom") return "wiecej-niz-dom";
  return GROUP_BY_FAMILY.get(value) ?? "dom";
}

// Każda prawdziwa rodzina, jaką reprezentuje wartość filtra (getProjects()'s
// WHERE ... IN, matchesResultsFilter): sentinel rozwija się do każdej rodziny
// swojej grupy, prawdziwa rodzina rozwija się do samej siebie.
export function resolveFamilies(value: FamilyFilterValue): ProductFamily[] {
  // Kopia, nie referencja (przedistniejący bug, ujawniony przy dodaniu trzeciej
  // rodziny do grupy): zwracanie FAMILY_GROUPS["wiecej-niz-dom"] wprost pozwalało
  // wywołującemu, który zmutuje wynik (np. push), trwale zepsuć współdzieloną mapę.
  if (value === "wiecej-niz-dom") return [...FAMILY_GROUPS["wiecej-niz-dom"]];
  return [value];
}

// Jedyne miejsce, które wie, pod jakim route'em żyje strona produktu danej
// rodziny (spec 0056 AC-5): outdoor-tv ma własną, katalogową stronę produktu
// (/outdoor-tv/[id]), każda inna rodzina używa strony domu (/project/[id]).
// Każde miejsce budujące link do produktu (lista wyników, ulubione,
// porównywarka) przechodzi przez tę funkcję zamiast składać ścieżkę samemu,
// żeby dodanie kolejnej rodziny katalogowej w przyszłości było jedną zmianą
// tutaj, nie zmianą we wszystkich miejscach linkujących.
export function resolveProductHref(family: ProductFamily, id: string, locale: string): string {
  const segment = family === "outdoor-tv" ? "outdoor-tv" : "project";
  return `/${locale}/${segment}/${id}`;
}
