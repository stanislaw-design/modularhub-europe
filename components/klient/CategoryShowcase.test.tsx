import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getFeaturedProjectByFamily } from "@/lib/data/projects";
import { getProductFamilyCounts } from "@/lib/db/queries";
import { createMockProject } from "@/test/fixtures/project";
import { CategoryShowcase } from "./CategoryShowcase";

// The DB is one system boundary here (spec 0022 AC-8 product counts); the
// mock project catalog (lib/data/projects) is the other, since each card
// links to a real featured example project instead of unfiltered /wyniki.
// "Więcej niż dom" covers spa-modulowe and kontenery-modulowe only — dom already has
// its own showcase (PopularHomes) higher on the home page.
//
// jsdom has no IntersectionObserver (or matchMedia), so CategoryShowcaseCarousel's
// own capability check (spec 0029 AC-7) always resolves to the non-pinned
// carousel fallback here — every test below exercises that same code path a
// real reduced-motion/unsupported browser would get, which is also the AC-2/
// AC-7 fallback scenario the build plan calls for, not something contrived.
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
  { family: "kontenery-modulowe" as const, subcategory: null, count: 0 },
];

// The category name/description no longer sit inside the offer <Link> itself
// (spec 0029 AC-5: they're a separate overlay block, the link only wraps the
// thumbnail + price/count + "view offers"), so href assertions now go through
// the thumbnail's alt text instead of the link's accessible name.
function offerLinkForCategory(imageAlt: string): HTMLElement {
  const thumbnail = screen.getByAltText(imageAlt);
  const link = thumbnail.closest("a");
  if (!link) throw new Error(`Expected an <a> ancestor for image alt "${imageAlt}"`);
  return link;
}

describe("CategoryShowcase", () => {
  it("renders only the outdoor/wellness families and falls back to /wyniki when no example project exists yet (spec 0022 AC-8)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue(zeroCounts);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByRole("heading", { level: 2, name: "Więcej niż dom" })).toBeInTheDocument();
    expect(screen.queryByText("Domy modułowe")).not.toBeInTheDocument();
    // The category name renders twice per category (the big overlay caption
    // and again inside the offer card next to its price), by design.
    expect(screen.getAllByText("Spa modułowe")).toHaveLength(2);
    expect(screen.getAllByText("Kontenery modułowe")).toHaveLength(2);
    expect(screen.getAllByText("0 produktów")).toHaveLength(2);

    expect(offerLinkForCategory("Przykładowa realizacja z kategorii Spa modułowe")).toHaveAttribute(
      "href",
      "/pl/results"
    );
    expect(offerLinkForCategory("Przykładowa realizacja z kategorii Kontenery modułowe")).toHaveAttribute(
      "href",
      "/pl/results"
    );
  });

  it("sums counts across subcategories into one real total per family, in the fallback state", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue([
      { family: "dom", subcategory: "caloroczny", count: 3 },
      { family: "spa-modulowe", subcategory: "sauna", count: 1 },
      { family: "kontenery-modulowe", subcategory: null, count: 0 },
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
      { family: "kontenery-modulowe", subcategory: null, count: 12 },
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
        priceOnRequest: false,
        commercial: {
          housePriceMinEur: 42000,
          housePriceMaxEur: 55000,
          completionStandard: "deweloperski",
          productionLeadTimeWeeksMin: 12,
          productionLeadTimeWeeksMax: 16,
          onSiteAssemblyDaysMin: 3,
          onSiteAssemblyDaysMax: 5,
          priceIncludes: [],
          priceExcludes: [],
        },
      })
    );

    render(await CategoryShowcase({ locale: "pl" }));

    expect(offerLinkForCategory("Przykładowa realizacja z kategorii Spa modułowe")).toHaveAttribute(
      "href",
      "/pl/project/prj-spa-modulowe-example"
    );
    expect(offerLinkForCategory("Przykładowa realizacja z kategorii Kontenery modułowe")).toHaveAttribute(
      "href",
      "/pl/project/prj-kontenery-modulowe-example"
    );
    expect(screen.getAllByText("od 42 000 €")).toHaveLength(2);
  });

  it("falls back to the product count badge when the featured project has no fixed price (priceOnRequest)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue([
      { family: "dom", subcategory: null, count: 0 },
      { family: "spa-modulowe", subcategory: null, count: 4 },
      { family: "kontenery-modulowe", subcategory: null, count: 0 },
    ]);
    mockedGetFeaturedProjectByFamily.mockImplementation(async (family) =>
      createMockProject({ id: `prj-${family}-example`, family, priceOnRequest: true })
    );

    render(await CategoryShowcase({ locale: "pl" }));

    expect(screen.getByText("4 produkty")).toBeInTheDocument();
  });

  it("shows one dot per category plus a next-category arrow, both usable to change which category is current (spec 0029 AC-3, AC-4)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue(zeroCounts);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);
    const user = userEvent.setup();

    render(await CategoryShowcase({ locale: "pl" }));

    const spaDot = screen.getByRole("button", { name: "Przejdź do kategorii Spa modułowe" });
    const containerDot = screen.getByRole("button", { name: "Przejdź do kategorii Kontenery modułowe" });
    const nextButton = screen.getByRole("button", { name: "Następna kategoria" });

    expect(spaDot).toHaveAttribute("aria-current", "true");
    expect(containerDot).toHaveAttribute("aria-current", "false");

    await user.click(containerDot);
    expect(containerDot).toHaveAttribute("aria-current", "true");
    expect(spaDot).toHaveAttribute("aria-current", "false");

    // Wraps from the last category back to the first (AC-4).
    await user.click(nextButton);
    expect(spaDot).toHaveAttribute("aria-current", "true");
    expect(containerDot).toHaveAttribute("aria-current", "false");
  });

  it("keeps every offer link keyboard reachable and correctly labeled in the non-pinned fallback (spec 0029 AC-6, AC-7)", async () => {
    mockedGetProductFamilyCounts.mockResolvedValue(zeroCounts);
    mockedGetFeaturedProjectByFamily.mockResolvedValue(null);

    render(await CategoryShowcase({ locale: "pl" }));

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/pl/results");
      expect(link).not.toHaveAttribute("tabindex", "-1");
      expect(link).not.toHaveAttribute("inert");
    }
  });
});
