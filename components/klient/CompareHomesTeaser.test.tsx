import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatPriceEur } from "@/lib/format-price";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { CompareHomesTeaser } from "./CompareHomesTeaser";

const plain = (value: string) => value.replace(/\s/g, " ");
const projects = [
  createMockProject({ id: "a", name: "Dom A", featured: true, priceMin: 129000 }),
  createMockProject({ id: "b", name: "Dom B", featured: true, priceMin: 95000 }),
];

describe("CompareHomesTeaser (spec 0073)", () => {
  it("renders nothing with fewer than two featured projects (AC-9)", async () => {
    const { container } = render(await resolveAsyncTree(<CompareHomesTeaser locale="pl" projects={projects.slice(0, 1)} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("formats prices with the current language, not always Polish (AC-6)", async () => {
    render(await resolveAsyncTree(<CompareHomesTeaser locale="de" projects={projects} />));

    const cells = screen.getAllByRole("cell").map((cell) => plain(cell.textContent ?? ""));
    expect(cells.some((cell) => cell.includes(plain(formatPriceEur(129000, "de"))))).toBe(true);
    expect(cells.some((cell) => cell.includes("129 000 €"))).toBe(false);
  });

  it("marks the lowest price as the best value in its row", async () => {
    render(await resolveAsyncTree(<CompareHomesTeaser locale="pl" projects={projects} />));

    const priceRow = screen.getByRole("row", { name: /Cena od/ });
    const cells = within(priceRow).getAllByRole("cell");
    expect(cells[0]).not.toHaveTextContent("Najniższa");
    expect(cells[1]).toHaveTextContent("Najniższa");
  });
});
