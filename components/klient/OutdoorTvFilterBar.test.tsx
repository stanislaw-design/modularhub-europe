import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResultsFilter } from "@/lib/results-filters";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { OutdoorTvFilterBar } from "./OutdoorTvFilterBar";

const base: ResultsFilter = { family: "outdoor-tv" };

async function renderBar(filter: ResultsFilter) {
  return render(await resolveAsyncTree(<OutdoorTvFilterBar locale="pl" filter={filter} />));
}

// spec 0071 AC-1, AC-2, AC-11, AC-13
describe("OutdoorTvFilterBar", () => {
  it("renders both chip groups and the keyword field, but no country, size or sort fields (AC-1)", async () => {
    await renderBar(base);

    expect(screen.getByRole("group", { name: "Sposób montażu" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Przeznaczenie (nasłonecznienie)" })).toBeInTheDocument();
    for (const label of ["Na ścianę", "W szafie z windą", "Cień", "Częściowe słońce", "Pełne słońce"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Słowo kluczowe")).toBeInTheDocument();
    expect(screen.queryByText(/Kraj|Metraż|Sortuj/)).not.toBeInTheDocument();
  });

  it("links an inactive chip to the URL with that value added and the rest kept (AC-2)", async () => {
    await renderBar({ ...base, mounting: ["na-sciane"], purpose: ["cien"] });

    expect(screen.getByRole("link", { name: "W szafie z windą" })).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv&mounting=na-sciane&mounting=w-szafie-z-winda&purpose=cien",
    );
  });

  it("marks active chips with aria-current and links them to the URL without only that value (AC-2, AC-13)", async () => {
    await renderBar({ ...base, mounting: ["na-sciane"], purpose: ["cien", "pelne-slonce"] });

    const wall = screen.getByRole("link", { name: "Na ścianę" });
    expect(wall).toHaveAttribute("aria-current", "true");
    expect(wall).toHaveAttribute("href", "/pl/results?family=outdoor-tv&purpose=cien&purpose=pelne-slonce");
    expect(screen.getByRole("link", { name: "Cień" })).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv&mounting=na-sciane&purpose=pelne-slonce",
    );
    expect(screen.getByRole("link", { name: "Częściowe słońce" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the keyword text and the active chips in the GET form (AC-11)", async () => {
    const { container } = await renderBar({ ...base, mounting: ["na-sciane"], purpose: ["cien"], q: "gold" });

    expect(screen.getByLabelText("Słowo kluczowe")).toHaveValue("gold");
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("action", "/pl/results");
    const hidden = [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map(
      (el) => `${el.name}=${el.value}`,
    );
    expect(hidden.sort()).toEqual(["family=outdoor-tv", "mounting=na-sciane", "purpose=cien"]);
  });
});
