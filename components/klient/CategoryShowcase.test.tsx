import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getFeaturedProjectByFamily } from "@/lib/data/projects";
import { getProductFamilyCounts } from "@/lib/db/queries";
import { createMockProject } from "@/test/fixtures/project";
import { CategoryShowcase } from "./CategoryShowcase";

// The DB is one system boundary here (spec 0022 AC-8 product counts); the
// mock project catalog (lib/data/projects) is the other, since each card now
// links to a real featured example project instead of unfiltered /wyniki.
// "Outdoor & Wellness" covers spa-modulowe and pergola only — dom already has
// its own showcase (PopularHomes) higher on the home page.
vi.mock("@/lib/db/queries", () => ({
  getProductFamilyCounts: vi.fn(),
}));
vi.mock("@/lib/data/projects", () => ({
  getFeaturedProjectByFamily: vi.fn(),
}));

const mockedGetProductFamilyCounts = vi.mocked(getProductFamilyCounts);
const mockedGetFeaturedProjectByFamily = vi.mocked(getFeaturedProjectByFamily);

const zeroCounts = [
  { family: "dom" as const, subcategory: null, count: 0 },
  { family: "spa-modulowe" as const, subcategory: null, count: 0 },
  { family: "pergola" as const, subcategory: null, count: 0 },
];

describe("CategoryShowcase", () => {
  it("renders only the outdoor/wellness families and falls back to /wyniki when no example project exists yet (spec 0022 AC-8)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue(zeroCounts);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByText("Outdoor & Wellness")).toBeInTheDocument();
    expect(screen.queryByText("Domy modułowe")).not.toBeInTheDocument();
    expect(screen.getByText("Spa modułowe")).toBeInTheDocument();
    expect(screen.getByText("Pergole")).toBeInTheDocument();
    expect(screen.getAllByText("0 produktów")).toHaveLength(2);

    const links = screen.getAllByRole("link", { name: /Spa modułowe|Pergole/ });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/pl/klient/wyniki");
    }
  });

  it("sums counts across subcategories into one real total per family, in the fallback state", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue([
      { family: "dom", subcategory: "caloroczny", count: 3 },
      { family: "spa-modulowe", subcategory: "sauna", count: 1 },
      { family: "pergola", subcategory: null, count: 0 },
    ]);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByText("1 produkt")).toBeInTheDocument();
    expect(screen.getByText("0 produktów")).toBeInTheDocument();
  });

  it("uses correct Polish pluralization for 1, 2 to 4, and 5+/12 to 14 counts, in the fallback state", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue([
      { family: "dom", subcategory: null, count: 1 },
      { family: "spa-modulowe", subcategory: null, count: 3 },
      { family: "pergola", subcategory: null, count: 12 },
    ]);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByText("3 produkty")).toBeInTheDocument();
    expect(screen.getByText("12 produktów")).toBeInTheDocument();
  });

  it("links each card to its real featured project and shows its starting price, not the unfiltered results list", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue(zeroCounts);
    mockedGetFeaturedProjectByFamily.mockImplementation(async (family) =>
      createMockProject({
        id: `prj-${family}-example`,
        family,
        priceMin: 42000,
        priceMax: 55000,
        priceOnRequest: false,
      })
    );

    render(await CategoryShowcase({ locale: "pl" }));

    const links = screen.getAllByRole("link", { name: /Spa modułowe|Pergole/ });
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href")).sort()).toEqual(
      ["/pl/klient/projekt/prj-pergola-example", "/pl/klient/projekt/prj-spa-modulowe-example"].sort()
    );
    expect(screen.getAllByText("od 42 000 €")).toHaveLength(2);
  });

  it("falls back to the product count badge when the featured project has no fixed price (priceOnRequest)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue([
      { family: "dom", subcategory: null, count: 0 },
      { family: "spa-modulowe", subcategory: null, count: 4 },
      { family: "pergola", subcategory: null, count: 0 },
    ]);
    mockedGetFeaturedProjectByFamily.mockImplementation(async (family) =>
      createMockProject({ id: `prj-${family}-example`, family, priceOnRequest: true })
    );

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByText("4 produkty")).toBeInTheDocument();
  });
});
