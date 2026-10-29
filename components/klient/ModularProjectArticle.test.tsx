import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModularProjectArticle } from "./ModularProjectArticle";
import { ModularProjectCard } from "./ModularProjectCard";
import { getModularProjectBySlug } from "@/lib/data/modularprojects";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

describe("ModularProjectArticle (spec 0076 AC-7, AC-12)", () => {
  it("renders one h1, facts, three gallery groups and both calls to action", async () => {
    const project = await getModularProjectBySlug("cocoleisure", "pl");
    render(await resolveAsyncTree(await ModularProjectArticle({ project: project!, locale: "pl" })));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CocoLeisure – 49 nowoczesnych domków rekreacyjnych");
    expect(screen.getByText("BUDMAN HOUSE")).toBeInTheDocument();
    for (const name of ["Wizualizacje", "Projekt konstrukcji", "Budowa"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Zleć podobny projekt/ })).toHaveAttribute("href", "/pl/project-request");
    expect(screen.getByRole("link", { name: /Realizuj takie projekty/ })).toHaveAttribute("href", "/pl/producer/registration");
    expect(screen.getByRole("link", { name: /Wszystkie realizacje/ })).toHaveAttribute("href", "/pl/modularprojects");
  });
});

describe("ModularProjectCard (spec 0076 AC-6)", () => {
  it("is one link to the entry with title, status text and facts", async () => {
    const project = await getModularProjectBySlug("cocoleisure", "pl");
    render(await resolveAsyncTree(await ModularProjectCard({ project: project!, locale: "pl" })));

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/pl/modularprojects/cocoleisure");
    expect(link).toHaveTextContent("W produkcji");
    expect(link).toHaveTextContent("CocoLeisure – 49 nowoczesnych domków rekreacyjnych");
    expect(link).toHaveTextContent("BUDMAN HOUSE");
  });
});
