import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Same boundary mocks as ResultCard.test.tsx / internal/products/[id]/page.test.tsx.
vi.mock("@/lib/favorite-actions", () => ({ toggleFavorite: vi.fn() }));
// BulkProductInquiryModal (rendered only when volumeProfile is set, but
// statically imported regardless) imports lib/project-request-actions, which
// imports lib/observability -> @sentry/nextjs, unresolvable under Vitest.
vi.mock("@/lib/project-request-actions", () => ({ submitBulkProductInquiry: vi.fn() }));
// ProjectGalleryTabs nests an async Server Component (ProjectGalleryThumbnails)
// inside a "use client" gallery/lightbox wrapper several levels down —
// resolve-async-tree.ts's documented limitation (it only resolves a not-yet-run
// async Server Component when it is NOT nested inside a hook using component's
// own returned JSX). Unrelated to spec 0058 (this page never touched the
// gallery), stubbed out so the routing/metadata behavior under test isn't
// blocked by a pre-existing test-infra gap in a different area.
vi.mock("@/components/klient/ProjectGalleryTabs", () => ({
  ProjectGalleryTabs: () => null,
}));

const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

class RedirectSignal extends Error {}
class PermanentRedirectSignal extends Error {}
class NotFoundSignal extends Error {}
const redirectMock = vi.fn((url: string) => {
  throw new RedirectSignal(url);
});
const permanentRedirectMock = vi.fn((url: string) => {
  throw new PermanentRedirectSignal(url);
});
const notFoundMock = vi.fn(() => {
  throw new NotFoundSignal("not-found");
});
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    redirect: (url: string) => redirectMock(url),
    permanentRedirect: (url: string) => permanentRedirectMock(url),
    notFound: () => notFoundMock(),
    // FavoriteButton/ProjectVariantSelect ("use client") read these outside a real app router.
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/pl/project/pomerania-40",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  };
});

const getProjectBySlugOrIdMock = vi.fn();
const getEligibilityByCountryMock = vi.fn();
const getProducerVolumeProfileMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({
  getProjectBySlugOrId: (...args: unknown[]) => getProjectBySlugOrIdMock(...args),
  getEligibilityByCountry: (...args: unknown[]) => getEligibilityByCountryMock(...args),
  getProducerVolumeProfile: (...args: unknown[]) => getProducerVolumeProfileMock(...args),
}));

const getCountriesMock = vi.fn();
vi.mock("@/lib/data/countries", () => ({ getCountries: () => getCountriesMock() }));

const getProducerByIdMock = vi.fn();
vi.mock("@/lib/data/producers", () => ({ getProducerById: (...args: unknown[]) => getProducerByIdMock(...args) }));

const getClientIdForUserMock = vi.fn();
const getFavoritedProductIdsMock = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getClientIdForUser: (...args: unknown[]) => getClientIdForUserMock(...args),
  getFavoritedProductIds: (...args: unknown[]) => getFavoritedProductIdsMock(...args),
}));

import ProjektPage, { generateMetadata } from "./page";

const PUBLISHED_ID = "792bff0a-0848-4581-94cf-034b6dbf2a85";

beforeEach(() => {
  redirectMock.mockClear();
  permanentRedirectMock.mockClear();
  notFoundMock.mockClear();
  getProjectBySlugOrIdMock.mockReset();
  getEligibilityByCountryMock.mockReset().mockResolvedValue([]);
  getProducerVolumeProfileMock.mockReset().mockResolvedValue(null);
  getCountriesMock.mockReset().mockResolvedValue([]);
  getProducerByIdMock.mockReset().mockResolvedValue(null);
  getClientIdForUserMock.mockReset();
  getFavoritedProductIdsMock.mockReset();
  authMock.mockReset().mockResolvedValue(null);
});

async function renderPage(slug: string, searchParams: Record<string, string> = {}, locale = "pl") {
  const element = await ProjektPage({
    params: Promise.resolve({ locale, slug }),
    searchParams: Promise.resolve(searchParams),
  });
  render(await resolveAsyncTree(element));
}

describe("ProjektPage (spec 0058)", () => {
  it("returns notFound when no project matches the slug or id", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(null);

    await expect(renderPage("nieistniejacy-slug")).rejects.toThrow();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("redirects to /outdoor-tv when the resolved product is that family (spec 0056 AC-6, carries slug per AC-6)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ id: PUBLISHED_ID, family: "outdoor-tv", slug: "econo-lift" }),
    );

    await expect(renderPage(PUBLISHED_ID)).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/outdoor-tv/econo-lift");
  });

  // AC-4: entering by id once the product already has a slug issues a
  // permanent (308) redirect to the canonical slug address, preserving the
  // rest of the query string untouched.
  it("permanently redirects id -> slug, preserving the query string (AC-4)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ id: PUBLISHED_ID, family: "dom", slug: "pomerania-40" }),
    );

    await expect(renderPage(PUBLISHED_ID, { wariant: "pod-klucz" })).rejects.toThrow();
    expect(permanentRedirectMock).toHaveBeenCalledWith("/pl/project/pomerania-40?wariant=pod-klucz");
  });

  it("does not redirect when the url segment already is the canonical slug", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ id: PUBLISHED_ID, family: "dom", slug: "pomerania-40", name: "Pomerania 40" }),
    );

    await renderPage("pomerania-40");

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Pomerania 40" })).toBeInTheDocument();
  });

  // AC-5: a product still mid-wizard (no name yet) has no slug yet either;
  // its id-based address renders normally, no redirect attempted.
  it("renders normally by id, without redirecting, when the product has no slug yet (AC-5)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ id: PUBLISHED_ID, family: "dom", slug: null, name: "Kreator W Toku" }),
    );

    await renderPage(PUBLISHED_ID);

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Kreator W Toku" })).toBeInTheDocument();
  });
});

describe("generateMetadata (spec 0058 AC-7)", () => {
  it("returns {} for an outdoor-tv product (this route never metas it)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(createMockProject({ family: "outdoor-tv" }));

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "any" }) });
    expect(metadata).toEqual({});
  });

  it("builds canonical/openGraph off the slug and carries no robots override for a published product", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ family: "dom", slug: "pomerania-40", status: "published", name: "Pomerania 40" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "pomerania-40" }) });
    expect(metadata.alternates?.canonical).toBe("/pl/project/pomerania-40");
    expect(metadata.openGraph?.url).toBe("/pl/project/pomerania-40");
    expect(metadata.robots).toBeUndefined();
  });

  it("adds robots noindex/nofollow for a non-published product (AC-7)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ family: "dom", slug: "modulor-28", status: "draft", name: "Modulor 28" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "modulor-28" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("falls back to the id in canonical/openGraph when the product has no slug yet", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      createMockProject({ id: PUBLISHED_ID, family: "dom", slug: null, status: "draft", name: "" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: PUBLISHED_ID }) });
    expect(metadata.alternates?.canonical).toBe(`/pl/project/${PUBLISHED_ID}`);
  });
});
