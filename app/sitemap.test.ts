import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

const getSitemapProductsMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({ getSitemapProducts: () => getSitemapProductsMock() }));
const captureErrorMock = vi.fn();
vi.mock("@/lib/observability/errors", () => ({ captureError: (...args: unknown[]) => captureErrorMock(...args) }));

const UPDATED = new Date("2026-10-01T00:00:00Z");

beforeEach(() => vi.clearAllMocks());

describe("sitemap (spec 0073 AC-13)", () => {
  it("lists published products in four languages with hreflang alternates", async () => {
    getSitemapProductsMock.mockResolvedValue([
      { id: "1", slug: "dom-a", family: "dom", spaSubcategory: null, updatedAt: UPDATED },
      { id: "2", slug: "sauna-b", family: "spa-modulowe", spaSubcategory: "sauna", updatedAt: UPDATED },
      { id: "3", slug: "tv-c", family: "outdoor-tv", spaSubcategory: null, updatedAt: UPDATED },
    ]);
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    for (const locale of ["pl", "en", "nl", "de"]) {
      expect(urls).toContain(`http://localhost:3000/${locale}/project/dom-a`);
      expect(urls).toContain(`http://localhost:3000/${locale}/sauna/sauna-b`);
      expect(urls).toContain(`http://localhost:3000/${locale}/outdoor-tv/tv-c`);
    }
    const entry = entries.find((e) => e.url.endsWith("/de/project/dom-a"));
    expect(entry?.alternates?.languages?.pl).toBe("http://localhost:3000/pl/project/dom-a");
    expect(entry?.lastModified).toEqual(UPDATED);
  });

  it("falls back to the static pages and reports when the database fails", async () => {
    getSitemapProductsMock.mockRejectedValue(new Error("db down"));
    const entries = await sitemap();

    expect(entries.length).toBe(7 * 4);
    expect(entries.some((e) => e.url.includes("/project/"))).toBe(false);
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { area: "sitemap", section: "products" });
  });
});
