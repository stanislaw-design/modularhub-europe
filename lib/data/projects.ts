import { eligibility } from "./fixtures/eligibility";
import { projects } from "./fixtures/projects";
import type { CountryCode, Project } from "./types";

interface GetProjectsFilters {
  countryCode?: CountryCode;
}

// countryCode filter: a project surfaces for a country when it has an
// eligibility row there and that row is not "blocked" ("approved" and
// "conditional" both count as usable, per brand-guidelines-v3.md section 12,
// which treats a conditional status as a valid, displayable outcome, not a
// hidden one). Screen 6's own spec (/architect wyniki z filtrem prawnym)
// should confirm this boundary before it's load-bearing for that screen.
export async function getProjects(filters?: GetProjectsFilters): Promise<Project[]> {
  const countryCode = filters?.countryCode;
  if (!countryCode) return projects;

  return projects.filter((project) => {
    const match = eligibility.find(
      (row) => row.projectId === project.id && row.countryCode === countryCode
    );
    return match !== undefined && match.status !== "blocked";
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  return projects.find((project) => project.id === id) ?? null;
}
