import { eligibility } from "./fixtures/eligibility";
import { projects } from "./fixtures/projects";
import type { CountryCode, EligibilityByCountry, Project, ProductFamily } from "./types";

interface GetProjectsFilters {
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
}

// countryCode filter: a project surfaces for a country when it has an
// eligibility row there and that row is not "blocked" ("approved" and
// "conditional" both count as usable, per brand-guidelines-v3.md section 12,
// which treats a conditional status as a valid, displayable outcome, not a
// hidden one). Boundary confirmed as spec 0004's Decision (Option 1).
// sizeMin/sizeMax filter floorAreaM2 on a closed interval, independently.
// family "dom" only: this feeds house search/results (/wyniki, Popularne
// domy, Porównaj domy), which the fixture's two non-dom teaser entries
// (spa-modulowe, pergola — see fixtures/projects.ts) are not meant to appear
// in. Those are reachable only via getProjectById and getFeaturedProjectByFamily.
export async function getProjects(filters?: GetProjectsFilters): Promise<Project[]> {
  const { countryCode, sizeMin, sizeMax } = filters ?? {};

  return projects.filter((project) => {
    if (project.family !== "dom") return false;
    if (countryCode) {
      const match = eligibility.find(
        (row) => row.projectId === project.id && row.countryCode === countryCode
      );
      if (match === undefined || match.status === "blocked") return false;
    }
    if (sizeMin !== undefined && project.floorAreaM2 < sizeMin) return false;
    if (sizeMax !== undefined && project.floorAreaM2 > sizeMax) return false;
    return true;
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  return projects.find((project) => project.id === id) ?? null;
}

// Public: feeds CategoryShowcase on the home page with one real, clickable
// project per family instead of a generic unfiltered /wyniki link — reads the
// raw fixture (not getProjects(), which is dom-only) since this is the one
// place spa-modulowe/pergola example projects are meant to surface.
export async function getFeaturedProjectByFamily(family: ProductFamily): Promise<Project | null> {
  return projects.find((project) => project.family === family && project.featured) ?? null;
}

export async function getEligibilityByCountry(
  countryCode: CountryCode
): Promise<EligibilityByCountry[]> {
  return eligibility.filter((row) => row.countryCode === countryCode);
}
