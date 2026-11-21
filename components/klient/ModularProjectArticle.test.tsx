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

  it("turns an internal link in the text into a link with the language prefix", async () => {
    const project = await getModularProjectBySlug("resort-niemcy-28-domkow", "de");
    render(await resolveAsyncTree(await ModularProjectArticle({ project: project!, locale: "de" })));

    expect(screen.getByRole("link", { name: "CocoLeisure" })).toHaveAttribute("href", "/de/modularprojects/cocoleisure");
    expect(screen.queryByText(/\]\(/)).not.toBeInTheDocument();
  });

  it("asks producers for an offer on an open request (status planned)", async () => {
    const project = await getModularProjectBySlug("resort-holandia-23-domki", "pl");
    render(await resolveAsyncTree(await ModularProjectArticle({ project: project!, locale: "pl" })));

    const quoteLinks = screen.getAllByRole("link", { name: /Wyceń ten projekt/ });
    expect(quoteLinks).toHaveLength(3);
    for (const link of quoteLinks) expect(link).toHaveAttribute("href", "/pl/producer/registration");
    expect(screen.getAllByRole("link", { name: /tablicy zapytań/ })[0]).toHaveAttribute("href", "/pl/producer/panel/board");
    expect(screen.getByRole("heading", { level: 2, name: "Złóż ofertę na ten projekt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Chcesz wycenić ten projekt?" })).toBeInTheDocument();
  });

  it("keeps the producer band away from entries that are not open requests", async () => {
    const project = await getModularProjectBySlug("cocoleisure", "pl");
    render(await resolveAsyncTree(await ModularProjectArticle({ project: project!, locale: "pl" })));

    expect(screen.queryByRole("link", { name: /Wyceń ten projekt/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Złóż ofertę na ten projekt" })).not.toBeInTheDocument();
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
