import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders one full-bleed background image reaching the top of the page, marked decorative (spec 0025 AC-1)", async () => {
    const { container } = render(await resolveAsyncTree(<Hero />));

    const images = screen.getAllByAltText("");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", expect.stringContaining("klient-hero-bg.png"));

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.className).toContain("full-bleed");
    expect(section?.className).toContain("-mt-brand-5");
  });

  it("anchors the heading, paragraph and trust badges bottom-left, not centered (spec 0025 AC-2)", async () => {
    const { container } = render(await resolveAsyncTree(<Hero />));

    expect(screen.getByRole("heading", { level: 1, name: "Twój dom. Mądrze wybrany." })).toBeInTheDocument();
    expect(screen.getByText("Porównaj sprawdzone domy modułowe z całej Europy.")).toBeInTheDocument();

    const contentBlock = container.querySelector("section > div");
    expect(contentBlock?.className).toContain("items-start");
    expect(contentBlock?.className).toContain("text-left");
  });

  it("renders exactly the three trust badges, in order (spec 0025 Summary)", async () => {
    render(await resolveAsyncTree(<Hero />));

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Zweryfikowani producenci",
      "Przejrzyste ceny",
      "Compliance Engine™",
    ]);
  });

  it("renders no dark gradient or scrim over the photo (spec 0025 AC-3, Critical test scenarios)", async () => {
    const { container } = render(await resolveAsyncTree(<Hero />));

    const gradientEls = container.querySelectorAll('[class*="bg-gradient"]');
    expect(gradientEls).toHaveLength(0);
  });

  it("renders children (e.g. the search card) inside the anchored content block when provided", async () => {
    render(
      await resolveAsyncTree(
        <Hero>
          <div data-testid="search-card">search card</div>
        </Hero>
      )
    );

    expect(screen.getByTestId("search-card")).toBeInTheDocument();
  });

  it("renders no children wrapper when none are provided", async () => {
    render(await resolveAsyncTree(<Hero />));
    expect(screen.queryByTestId("search-card")).not.toBeInTheDocument();
  });
});
