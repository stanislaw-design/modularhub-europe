import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { FamilyTabs } from "./FamilyTabs";

describe("FamilyTabs", () => {
  it("renders exactly two top-level group tabs, Domy and Więcej niż dom (spec 0035 AC-1)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    const topNav = screen.getByRole("navigation", { name: "Rodzina produktu" });
    const links = within(topNav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Domy", "Więcej niż dom"]);
  });

  it("marks Domy as current and renders no second-level row for family dom (AC-6)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("navigation", { name: "Doprecyzuj w grupie Więcej niż dom" })).not.toBeInTheDocument();
  });

  it("marks Więcej niż dom as current for the combined group value and shows the refine row (AC-3)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="wiecej-niz-dom" />));

    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute("aria-current", "page");
    const refineNav = screen.getByRole("navigation", { name: "Doprecyzuj w grupie Więcej niż dom" });
    const refineLinks = within(refineNav).getAllByRole("link");
    expect(refineLinks.map((link) => link.textContent)).toEqual(["Wszystko", "Spa modułowe", "Pergole"]);
    expect(screen.getByRole("link", { name: "Wszystko" })).toHaveAttribute("aria-current", "true");
  });

  it("marks Więcej niż dom as current and highlights the specific refine tab when family is spa-modulowe (AC-3)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="spa-modulowe" />));

    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Spa modułowe" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Wszystko" })).not.toHaveAttribute("aria-current");
  });

  it("links the wiecej-niz-dom tab to family=wiecej-niz-dom and dom to a bare href (AC-2)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute("href", "/pl/results");
    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute(
      "href",
      "/pl/results?family=wiecej-niz-dom"
    );
  });

  it("preserves country and size filters on every tab link, both levels (AC-3)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="pergola" countryCode="DE" sizeMin={50} sizeMax={100} />));

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute(
      "href",
      "/pl/results?country=DE&sizeMin=50&sizeMax=100"
    );
    expect(screen.getByRole("link", { name: "Spa modułowe" })).toHaveAttribute(
      "href",
      "/pl/results?family=spa-modulowe&country=DE&sizeMin=50&sizeMax=100"
    );
  });
});
