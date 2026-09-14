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
  "wiecej-niz-dom": ["spa-modulowe", "kontenery-modulowe"],
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
  if (value === "wiecej-niz-dom") return FAMILY_GROUPS["wiecej-niz-dom"];
  return [value];
}
