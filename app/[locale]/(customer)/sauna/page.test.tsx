import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Same boundary mocks as /sauna/[slug]'s test.
vi.mock("@/lib/favorite-actions", () => ({ toggleFavorite: vi.fn() }));

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/pl/sauna",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  };
});

const getProjectsMock = vi.fn();
const getSaunaProducerOptionsMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({
  getProjects: (...args: unknown[]) => getProjectsMock(...args),
  getSaunaProducerOptions: (...args: unknown[]) => getSaunaProducerOptionsMock(...args),
}));

vi.mock("@/lib/data/countries", () => ({
  getCountries: async () => [{ code: "PL", name: "Polska" }],
}));

vi.mock("@/lib/db/queries", () => ({
  getClientIdForUser: vi.fn(),
  getFavoritedProductIds: vi.fn(async () => new Set<string>()),
}));

import SaunaCategoryPage, { generateMetadata } from "./page";

const PRODUCER_ID = "2b6b6c2e-9e2a-4e3a-9a1a-2b7a6c5e4d3c";

function sauna(id: string, name: string) {
  return createMockProject({
    id,
    name,
    slug: `slug-${id}`,
    family: "spa-modulowe",
    spaSubcategory: "sauna",
    producerName: "Kora",
    priceMin: 12000,
  });
}

beforeEach(() => {
  getProjectsMock.mockReset().mockResolvedValue([sauna("a", "Relax 550"), sauna("b", "Qube")]);
  getSaunaProducerOptionsMock.mockReset().mockResolvedValue([{ id: PRODUCER_ID, name: "Kora", count: 2 }]);
  authMock.mockReset().mockResolvedValue(null);
});

async function renderPage(searchParams: Record<string, string> = {}, locale = "pl") {
  const element = await SaunaCategoryPage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  });
  const { container } = render(await resolveAsyncTree(element));
  return container;
}

describe("SaunaCategoryPage (spec 0068)", () => {
  // AC-1, AC-3, AC-5
  it("renders exactly one h1 and a card per sauna linking to /sauna/[slug]", async () => {
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sauny");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Modeli: 2");
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/pl/sauna/slug-a");
    expect(hrefs).toContain("/pl/sauna/slug-b");
  });

  it("queries only published spa-modulowe saunas, with no filter by default (AC-1)", async () => {
    await renderPage();

    expect(getProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ family: "spa-modulowe", spaSubcategory: "sauna", locale: "pl" }),
    );
  });

  // AC-2
  it("returns an empty state with a clear link to /sauna and still one h1, never a 404", async () => {
    getProjectsMock.mockResolvedValue([]);
    await renderPage({ seatingMin: "8" });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const clear = screen.getAllByRole("link", { name: /wyczyść filtry/i });
    expect(clear.some((link) => link.getAttribute("href") === "/pl/sauna")).toBe(true);
  });

  // AC-7, AC-8, AC-9
  it("passes the parsed filter to getProjects", async () => {
    await renderPage({ seatingMin: "4", priceMin: "5000", priceMax: "10000", producer: PRODUCER_ID });

    expect(getProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ seatingMin: 4, priceMin: 5000, priceMax: 10000, producerId: PRODUCER_ID }),
    );
  });

  // AC-10
  it("silently ignores invalid params instead of throwing", async () => {
    await renderPage({ seatingMin: "abc", priceMin: "99", producer: "abc" });

    expect(getProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ seatingMin: undefined, priceMin: undefined, producerId: undefined }),
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  // AC-9: chips grow with the DB, not with code.
  it("renders one producer chip per option from getSaunaProducerOptions", async () => {
    getSaunaProducerOptionsMock.mockResolvedValue([
      { id: PRODUCER_ID, name: "Kora", count: 2 },
      { id: "3c7c7d3f-0f3b-4f4b-8b2b-3c8b7d6f5e4d", name: "Wooden Dream House", count: 1 },
    ]);
    await renderPage();

    const nav = screen.getByRole("navigation", { name: "Filtry saun" });
    expect(nav).toHaveTextContent("Kora");
    expect(nav).toHaveTextContent("Wooden Dream House");
  });

  // AC-4
  it("emits ItemList JSON-LD for the unfiltered view, none for a filtered view", async () => {
    const container = await renderPage();
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script?.textContent ?? "{}");
    expect(data["@type"]).toBe("ItemList");
    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0]).toMatchObject({ position: 1, url: "/pl/sauna/slug-a" });
  });

  it("omits the JSON-LD on a filtered view", async () => {
    const container = await renderPage({ seatingMin: "4" });
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});

describe("SaunaCategoryPage generateMetadata (spec 0068 AC-4)", () => {
  async function metadata(searchParams: Record<string, string> = {}, locale = "pl") {
    return generateMetadata({ params: Promise.resolve({ locale }), searchParams: Promise.resolve(searchParams) });
  }

  it("has a self canonical and hreflang for all four locales", async () => {
    const meta = await metadata();

    expect(meta.title).toBe("Sauny | ModularHub Europe");
    expect(meta.alternates?.canonical).toBe("/pl/sauna");
    expect(meta.alternates?.languages).toMatchObject({
      pl: "/pl/sauna",
      en: "/en/sauna",
      de: "/de/sauna",
      nl: "/nl/sauna",
    });
    expect(meta.robots).toBeUndefined();
  });

  it("is noindex, follow with canonical on /sauna when any filter param is valid", async () => {
    const meta = await metadata({ seatingMin: "4" }, "en");

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("/en/sauna");
  });

  it("stays indexable when the only params are invalid", async () => {
    const meta = await metadata({ seatingMin: "abc" });
    expect(meta.robots).toBeUndefined();
  });

});

// Zamiast mocka (który zawsze zwraca polski), sprawdza prawdziwe pliki
// tłumaczeń: namespace ma dokładnie te same klucze we wszystkich czterech
// językach (AC-3, wymóg tłumaczeń).
describe("SaunaCategoryPage translations (spec 0068)", () => {
  function keysOf(value: unknown, prefix = ""): string[] {
    if (typeof value !== "object" || value === null) return [prefix];
    return Object.entries(value).flatMap(([key, nested]) => keysOf(nested, prefix ? `${prefix}.${key}` : key));
  }

  it("has the same keys and no empty strings in pl, en, de and nl", () => {
    const load = (locale: string) =>
      JSON.parse(readFileSync(path.resolve(__dirname, `../../../../messages/${locale}.json`), "utf-8")) as Record<
        string,
        Record<string, unknown>
      >;
    const pl = load("pl");
    const expected = keysOf(pl.SaunaCategoryPage).sort();
    for (const locale of ["en", "de", "nl"]) {
      const messages = load(locale);
      expect(keysOf(messages.SaunaCategoryPage).sort(), locale).toEqual(expected);
      expect(keysOf(messages.SearchCard)).toContain("categoryLinkSauna");
      expect(keysOf(messages.CompareSelectionBar)).toEqual(expect.arrayContaining(["compareCtaSauna", "needTwoHintSauna"]));
    }
  });
});
