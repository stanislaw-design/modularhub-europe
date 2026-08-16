import { eligibility } from "./fixtures/eligibility";
import { projects } from "./fixtures/projects";
import type { CountryCode, EligibilityByCountry, Project } from "./types";

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
export async function getProjects(filters?: GetProjectsFilters): Promise<Project[]> {
  const { countryCode, sizeMin, sizeMax } = filters ?? {};

  return projects.filter((project) => {
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

export async function getFeaturedProjects(): Promise<Project[]> {
  return projects.filter((project) => project.featured);
}

export async function getEligibilityByCountry(
  countryCode: CountryCode
): Promise<EligibilityByCountry[]> {
  return eligibility.filter((row) => row.countryCode === countryCode);
}
