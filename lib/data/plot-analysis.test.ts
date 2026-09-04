import { describe, expect, it } from "vitest";
import { plotAnalysisResults } from "./fixtures/plot-analysis";
import { getPlotAnalysisResult } from "./plot-analysis";
// The plot analysis fixture was built against the retired example-project
// catalog (spec 0006), not the real database getProjects() now reads (spec
// 0023) — producer-mock-projects.ts keeps that catalog available exactly for
// this kind of fixture-consistency check.
import { getProjects } from "./producer-mock-projects";

describe("getPlotAnalysisResult", () => {
  it("returns the fixture row for a known project id (AC-5)", async () => {
    const result = await getPlotAnalysisResult("prj-modulor-family-90");
    expect(result?.status).toBe("approved");
    expect(result?.reason).toMatch(/obrysie budynku/);
  });

  it("returns null for an unknown project id instead of throwing", async () => {
    expect(await getPlotAnalysisResult("does-not-exist")).toBeNull();
  });

  it("has exactly one fixture row per current Project.id (spec 0006 fixture coverage, AC-5)", async () => {
    const projects = await getProjects();
    const fixtureIds = plotAnalysisResults.map((row) => row.projectId).sort();
    const projectIds = projects.map((project) => project.id).sort();
    expect(fixtureIds).toEqual(projectIds);
  });

  it.each(["approved", "conditional", "blocked"] as const)(
    "the fixture set includes at least one %s row",
    (status) => {
      expect(plotAnalysisResults.some((row) => row.status === status)).toBe(true);
    }
  );
});
