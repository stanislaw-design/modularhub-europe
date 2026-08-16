import { describe, expect, it } from "vitest";
import { getEligibilityByCountry, getProjectById, getProjects } from "./projects";

describe("getProjects", () => {
  it("returns every project when no filter is given (AC-3)", async () => {
    const projects = await getProjects();
    expect(projects).toHaveLength(6);
  });

  it("hides blocked projects for a country and keeps approved/conditional ones (AC-2)", async () => {
    const projects = await getProjects({ countryCode: "NL" });
    const ids = projects.map((p) => p.id);
    // prj-karpaty-alpine-104 is "blocked" in NL per the fixture data.
    expect(ids).not.toContain("prj-karpaty-alpine-104");
    // prj-baltyk-studio-38 is "conditional" in NL, which still counts as visible.
    expect(ids).toContain("prj-baltyk-studio-38");
  });

  it("matches the DE/50-100 scenario from the spec's verify steps (AC-1, AC-2, AC-4)", async () => {
    const projects = await getProjects({ countryCode: "DE", sizeMin: 50, sizeMax: 100 });
    const ids = projects.map((p) => p.id).sort();
    expect(ids).toEqual(
      ["prj-modulor-compact-56", "prj-modulor-family-90", "prj-karpaty-ridge-72"].sort()
    );
  });

  it("filters floorAreaM2 on a closed interval (AC-4)", async () => {
    const exact = await getProjects({ sizeMin: 90, sizeMax: 90 });
    expect(exact.map((p) => p.id)).toEqual(["prj-modulor-family-90"]);

    const none = await getProjects({ sizeMin: 200 });
    expect(none).toEqual([]);
  });

  it("applies only sizeMin when sizeMax is absent, and vice versa (AC-4)", async () => {
    const minOnly = await getProjects({ sizeMin: 100 });
    expect(minOnly.every((p) => p.floorAreaM2 >= 100)).toBe(true);

    const maxOnly = await getProjects({ sizeMax: 56 });
    expect(maxOnly.every((p) => p.floorAreaM2 <= 56)).toBe(true);
  });
});

describe("getEligibilityByCountry", () => {
  it("returns only the rows for the requested country", async () => {
    const rows = await getEligibilityByCountry("NL");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.countryCode === "NL")).toBe(true);
  });

  it("reports the documented conditional status for Baltyk Studio 38 in NL (AC-7)", async () => {
    const rows = await getEligibilityByCountry("NL");
    const row = rows.find((r) => r.projectId === "prj-baltyk-studio-38");
    expect(row?.status).toBe("conditional");
  });
});

describe("getProjectById", () => {
  it("returns null for an unknown id instead of throwing", async () => {
    expect(await getProjectById("does-not-exist")).toBeNull();
  });

  it("returns the matching project for a known id", async () => {
    const project = await getProjectById("prj-modulor-family-90");
    expect(project?.name).toBe("Modulor Family 90");
  });
});
