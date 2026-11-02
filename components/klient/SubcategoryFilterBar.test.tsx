import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultsFilter } from "@/lib/results-filters";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { SubcategoryFilterBar } from "./SubcategoryFilterBar";

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

const TRIGGER = { name: "Podkategoria kontenera modułowego" };

describe("SubcategoryFilterBar", () => {
  beforeEach(() => push.mockClear());

  it("renders nothing for family dom (AC-8: subcategories are kontenery-modulowe only)", async () => {
    const { container } = render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "dom" }} />));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for family spa-modulowe: saunas have their own /sauna page, subcategories return with a second spa type", async () => {
    const { container } = render(
      await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "spa-modulowe" }} />)
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a dropdown with Wszystkie and the three container subcategories (AC-8, spec 0039)", async () => {
    const user = userEvent.setup();
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={{ family: "kontenery-modulowe" }} />));

    const trigger = screen.getByRole("button", TRIGGER);
    expect(trigger).toHaveTextContent("Wszystkie");
    await user.click(trigger);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Wszystkie",
      "Gastronomiczny",
      "Usługowy",
      "Mieszkalny",
    ]);
  });

  it("shows the active containerSubcategory and navigates to its results URL on pick", async () => {
    const user = userEvent.setup();
    render(
      await resolveAsyncTree(
        <SubcategoryFilterBar
          locale="pl"
          filter={{ family: "kontenery-modulowe", containerSubcategory: "mieszkalne" }}
        />
      )
    );

    const trigger = screen.getByRole("button", TRIGGER);
    expect(trigger).toHaveTextContent("Mieszkalny");
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Gastronomiczny" }));
    expect(push).toHaveBeenCalledWith("/pl/results?family=kontenery-modulowe&containerSubcategory=gastronomiczne");
  });

  it("clears the subcategory with Wszystkie", async () => {
    const user = userEvent.setup();
    render(
      await resolveAsyncTree(
        <SubcategoryFilterBar
          locale="pl"
          filter={{ family: "kontenery-modulowe", containerSubcategory: "mieszkalne" }}
        />
      )
    );

    await user.click(screen.getByRole("button", TRIGGER));
    await user.click(screen.getByRole("option", { name: "Wszystkie" }));
    expect(push).toHaveBeenCalledWith("/pl/results?family=kontenery-modulowe");
  });

  it("preserves other active filters (q, sort) alongside family when picking a subcategory", async () => {
    const user = userEvent.setup();
    const filter: ResultsFilter = { family: "kontenery-modulowe", q: "kont", sort: "price-asc" };
    render(await resolveAsyncTree(<SubcategoryFilterBar locale="pl" filter={filter} />));

    await user.click(screen.getByRole("button", TRIGGER));
    await user.click(screen.getByRole("option", { name: "Usługowy" }));
    expect(push).toHaveBeenCalledWith(
      "/pl/results?family=kontenery-modulowe&containerSubcategory=uslugowe&sort=price-asc&q=kont"
    );
  });
});
