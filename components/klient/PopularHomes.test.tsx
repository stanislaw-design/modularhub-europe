import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { PopularHomes } from "./PopularHomes";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

// PopularHomes is a plain (sync) Server Component, but it renders
// PopularHomeCard, which is async (it awaits getTranslations) — Testing
// Library's render() can't resolve that nested async component itself, so
// every case resolves the tree first.
describe("PopularHomes", () => {
  it("shows only featured projects", async () => {
    const projects = [
      createMockProject({ id: "prj-a", name: "Featured Home", featured: true }),
      createMockProject({ id: "prj-b", name: "Hidden Home", featured: false }),
    ];
    render(await resolveAsyncTree(<PopularHomes locale="pl" projects={projects} countries={countries} />));

    expect(screen.getByRole("heading", { name: "Featured Home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hidden Home" })).not.toBeInTheDocument();
  });

  it("links each card to its own project details page (spec 0020 AC-2)", async () => {
    const projects = [createMockProject({ id: "prj-modulor-family-90", featured: true })];
    render(await resolveAsyncTree(<PopularHomes locale="pl" projects={projects} countries={countries} />));

    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl/klient/projekt/prj-modulor-family-90");
  });

  it("renders nothing in the grid when no project is featured", async () => {
    const projects = [createMockProject({ id: "prj-a", featured: false })];
    render(await resolveAsyncTree(<PopularHomes locale="pl" projects={projects} countries={countries} />));

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
