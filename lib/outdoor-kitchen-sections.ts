import type { Project } from "@/lib/data/types";
import type { OutdoorKitchenType } from "@/lib/product-technical-specs";
import { sortResults } from "@/lib/results-filters";

export interface OutdoorKitchenSection {
  kitchenType: OutdoorKitchenType;
  projects: Project[];
}

// Kolejność sekcji na /outdoor-kitchen (spec 0086 AC-12): najpierw kuchnie w obudowie,
// potem zestawy modułowe.
const SECTION_ORDER: readonly OutdoorKitchenType[] = ["box", "modular"];

// Podział po kitchenType z technicalSpecs, nigdy po tekście (spec 0086 Key invariants).
// Każda sekcja jest posortowana po cenie od (domyślnie rosnąco, filtr może odwrócić); produkt bez poprawnych danych kuchni nie trafia nigdzie,
// a sekcja bez produktów jest pomijana (AC-13).
export function splitOutdoorKitchenSections(
  projects: Project[],
  sort: "price-asc" | "price-desc" = "price-asc",
): OutdoorKitchenSection[] {
  return SECTION_ORDER.map((kitchenType) => ({
    kitchenType,
    projects: sortResults(
      projects.filter((project) => project.outdoorKitchenTechnicalSpecs?.kitchenType === kitchenType),
      sort,
    ),
  })).filter((section) => section.projects.length > 0);
}
