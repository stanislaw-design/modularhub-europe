import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResultsFilter } from "@/lib/results-filters";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { CategoryFilterBar } from "./CategoryFilterBar";

const baseFilter: ResultsFilter = { family: "dom" };

describe("CategoryFilterBar", () => {
  it("renders exactly two real, enabled links (Parterowy, Piętrowy) (AC-7)", async () => {
    render(await resolveAsyncTree(<CategoryFilterBar locale="pl" filter={baseFilter} />));

    const nav = screen.getByRole("navigation", { name: "Filtry atrybutów domu" });
    const links = screen.getAllByRole("link", { name: /Parterowy|Piętrowy/ });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(nav).toContainElement(link);
      expect(link).not.toHaveAttribute("disabled");
    }
  });

  it("does not render the removed decorative chips, the old Filtry button, or the heat/ventilation/energy chips", async () => {
    render(await resolveAsyncTree(<CategoryFilterBar locale="pl" filter={baseFilter} />));

    for (const removed of [
      "Fotowoltaika",
      "Tereny górskie",
      "Nad wodą",
      "Ogród",
      "Garaż",
      "Bez barier",
      "Konstrukcja CLT",
      "Filtry",
      "Pompa ciepła",
      "Rekuperacja",
      "Klasa A+",
    ]) {
      expect(screen.queryByText(removed)).not.toBeInTheDocument();
    }
  });

  it("links each chip to the results URL with only its own filter set, when no filter is active", async () => {
    render(await resolveAsyncTree(<CategoryFilterBar locale="pl" filter={baseFilter} />));

    expect(screen.getByRole("link", { name: "Parterowy" })).toHaveAttribute(
      "href",
      "/pl/results?storeys=parterowy"
    );
    expect(screen.getByRole("link", { name: "Piętrowy" })).toHaveAttribute(
      "href",
      "/pl/results?storeys=pietrowy"
    );
  });

  it("marks the active chip with aria-current and links it back to a URL clearing that filter (toggle, AC-7)", async () => {
    render(
      await resolveAsyncTree(<CategoryFilterBar locale="pl" filter={{ ...baseFilter, storeys: "parterowy" }} />)
    );

    const activeChip = screen.getByRole("link", { name: "Parterowy" });
    expect(activeChip).toHaveAttribute("aria-current", "true");
    expect(activeChip).toHaveAttribute("href", "/pl/results");

    const inactiveChip = screen.getByRole("link", { name: "Piętrowy" });
    expect(inactiveChip).not.toHaveAttribute("aria-current");
  });

  it("preserves every other active filter (sort, q, size) when building a chip's href (spec 0026 AC-10)", async () => {
    render(
      await resolveAsyncTree(
        <CategoryFilterBar
          locale="pl"
          filter={{ ...baseFilter, sort: "price-asc", q: "Baltyk", sizeMin: 50, sizeMax: 100 }}
        />
      )
    );

    expect(screen.getByRole("link", { name: "Parterowy" })).toHaveAttribute(
      "href",
      "/pl/results?sizeMin=50&sizeMax=100&storeys=parterowy&sort=price-asc&q=Baltyk"
    );
  });

  it("gives Parterowy and Piętrowy mutually exclusive hrefs (storeys is a single-select dimension)", async () => {
    render(await resolveAsyncTree(<CategoryFilterBar locale="pl" filter={{ ...baseFilter, storeys: "parterowy" }} />));

    expect(screen.getByRole("link", { name: "Parterowy" })).toHaveAttribute("aria-current", "true");
    // Clicking Piętrowy while Parterowy is active must switch, not add to, the storeys value.
    expect(screen.getByRole("link", { name: "Piętrowy" })).toHaveAttribute(
      "href",
      "/pl/results?storeys=pietrowy"
    );
  });
});
