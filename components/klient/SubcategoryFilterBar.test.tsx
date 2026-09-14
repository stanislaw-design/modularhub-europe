import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResultsFilter } from "@/lib/results-filters";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { SubcategoryFilterBar } from "./SubcategoryFilterBar";

describe("SubcategoryFilterBar", () => {
  it("renders nothing for family dom (AC-8: subcategories are spa/kontenery-modulowe only)", async () => {
    const { container } = render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "dom" }} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the three spa subcategory chips for family spa-modulowe (AC-8)", async () => {
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "spa-modulowe" }} />));

    const nav = screen.getByRole("navigation", { name: "Podkategoria spa modułowego" });
    expect(nav).toBeInTheDocument();
    for (const label of ["Sauna", "Jacuzzi", "Kabina wellness (sauna + jacuzzi)"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the three container subcategory chips for family kontenery-modulowe (AC-8, spec 0039)", async () => {
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "kontenery-modulowe" }} />));

    const nav = screen.getByRole("navigation", { name: "Podkategoria kontenera modułowego" });
    expect(nav).toBeInTheDocument();
    for (const label of ["Gastronomiczny", "Usługowy", "Mieszkalny"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("links each spa chip to the results URL scoped to spaSubcategory, preserving family", async () => {
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "spa-modulowe" }} />));

    expect(screen.getByRole("link", { name: "Jacuzzi" })).toHaveAttribute(
      "href",
      "/pl/results?family=spa-modulowe&spaSubcategory=jacuzzi"
    );
  });

  it("marks the active subcategory with aria-current and toggles it off on its own href", async () => {
    render(
      await resolveAsyncTree(
        <SubcategoryFilterBar locale="pl" filter={{ family: "spa-modulowe", spaSubcategory: "jacuzzi" }} />
      )
    );

    const active = screen.getByRole("link", { name: "Jacuzzi" });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(active).toHaveAttribute("href", "/pl/results?family=spa-modulowe");

    expect(screen.getByRole("link", { name: "Sauna" })).not.toHaveAttribute("aria-current");
  });

  it("uses containerSubcategory, not spaSubcategory, when family is kontenery-modulowe (spec 0039)", async () => {
    render(
      await resolveAsyncTree(
        <SubcategoryFilterBar
          locale="pl"
          filter={{ family: "kontenery-modulowe", containerSubcategory: "mieszkalne" }}
        />
      )
    );

    expect(screen.getByRole("link", { name: "Mieszkalny" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Gastronomiczny" })).toHaveAttribute(
      "href",
      "/pl/results?family=kontenery-modulowe&containerSubcategory=gastronomiczne"
    );
  });

  it("preserves other active filters (q, sort) alongside family when linking a subcategory chip", async () => {
    const filter: ResultsFilter = { family: "spa-modulowe", q: "spa", sort: "price-asc" };
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={filter} />));

    expect(screen.getByRole("link", { name: "Sauna" })).toHaveAttribute(
      "href",
      "/pl/results?family=spa-modulowe&spaSubcategory=sauna&sort=price-asc&q=spa"
    );
  });
});
