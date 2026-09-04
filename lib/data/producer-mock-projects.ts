import { projects } from "./fixtures/projects";
import type { Project } from "./types";

// Read-only lookups against the retired example-project catalog, kept alive
// only for producer side mock screens (zapytania/oferta, realizacja(e),
// weryfikacja-firmy) that decorate a producer's own mock inquiry/order rows
// with project details. The producer side has no real product catalog yet
// (spec 0023 Consequences: the project wizard, spec 0016, stays on
// localStorage); lib/data/projects.ts's getProjects/getProjectById now read
// the real database for the klient journey (spec 0023 Key invariants), so
// this module exists to keep these five producer pages on the fixture data
// they were built against, unaffected by that switch.
export async function getProjects(): Promise<Project[]> {
  return projects.filter((project) => project.family === "dom");
}

export async function getProjectById(id: string): Promise<Project | null> {
  return projects.find((project) => project.id === id) ?? null;
}
