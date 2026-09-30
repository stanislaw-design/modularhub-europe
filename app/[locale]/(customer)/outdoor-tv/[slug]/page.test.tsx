import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Same boundary mocks as ResultCard.test.tsx / internal/products/[id]/page.test.tsx.
vi.mock("@/lib/favorite-actions", () => ({ toggleFavorite: vi.fn() }));

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
    // FavoriteButton/ProjectVariantPicker ("use client") read these outside a real app router.
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/pl/outdoor-tv/econo-lift",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  };
});

// ProjectGalleryCover/Carousel/Thumbnails nest an async Server Component
// several levels inside a "use client" gallery/lightbox wrapper —
// resolve-async-tree.ts's documented limitation (same as /project/[slug]'s
// test); stubbed out, unrelated to the routing/metadata behavior under test.
vi.mock("@/components/klient/ProjectGallery", () => ({
  ProjectGalleryCover: () => null,
  ProjectGalleryCarousel: () => null,
  ProjectGalleryThumbnails: () => null,
}));

const getProjectBySlugOrIdMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({
  getProjectBySlugOrId: (...args: unknown[]) => getProjectBySlugOrIdMock(...args),
}));

const getProducerByIdMock = vi.fn();
const getProducerPhotoUrlMock = vi.fn();
vi.mock("@/lib/data/producers", () => ({
  getProducerById: (...args: unknown[]) => getProducerByIdMock(...args),
  getProducerPhotoUrl: (...args: unknown[]) => getProducerPhotoUrlMock(...args),
}));

const getClientIdForUserMock = vi.fn();
const getFavoritedProductIdsMock = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getClientIdForUser: (...args: unknown[]) => getClientIdForUserMock(...args),
  getFavoritedProductIds: (...args: unknown[]) => getFavoritedProductIdsMock(...args),
}));

import OutdoorTvPage, { generateMetadata } from "./page";

const PUBLISHED_ID = "19f6add0-0991-4737-852e-f3206b650775";

beforeEach(() => {
  redirectMock.mockClear();
  permanentRedirectMock.mockClear();
  notFoundMock.mockClear();
  getProjectBySlugOrIdMock.mockReset();
  getProducerByIdMock.mockReset().mockResolvedValue(null);
  getProducerPhotoUrlMock.mockReset().mockResolvedValue(null);
  getClientIdForUserMock.mockReset();
  getFavoritedProductIdsMock.mockReset();
  authMock.mockReset().mockResolvedValue(null);
});

function outdoorTvProject(overrides: Parameters<typeof createMockProject>[0] = {}) {
  return createMockProject({
    family: "outdoor-tv",
    features: [],
    technicalSpecs: undefined,
    documents: [],
    faq: undefined,
    ...overrides,
  });
}

async function renderPage(slug: string, searchParams: Record<string, string> = {}, locale = "pl") {
  const element = await OutdoorTvPage({
    params: Promise.resolve({ locale, slug }),
    searchParams: Promise.resolve(searchParams),
  });
  render(await resolveAsyncTree(element));
}

describe("OutdoorTvPage (spec 0058)", () => {
  it("returns notFound when no product matches the slug or id", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(null);

    await expect(renderPage("nieistniejacy-slug")).rejects.toThrow();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("redirects to /project when the resolved product is a different family (spec 0056 AC-6, carries slug per AC-6)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      outdoorTvProject({ id: PUBLISHED_ID, family: "dom", slug: "pomerania-40" }),
    );

    await expect(renderPage(PUBLISHED_ID)).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/project/pomerania-40");
  });

  // AC-4: entering by id once the product already has a slug issues a
  // permanent (308) redirect to the canonical slug address, preserving the
  // rest of the query string untouched.
  it("permanently redirects id -> slug, preserving the query string (AC-4)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(outdoorTvProject({ id: PUBLISHED_ID, slug: "econo-lift" }));

    await expect(renderPage(PUBLISHED_ID, { wariant: "43-cali" })).rejects.toThrow();
    expect(permanentRedirectMock).toHaveBeenCalledWith("/pl/outdoor-tv/econo-lift?wariant=43-cali");
  });

  it("does not redirect when the url segment already is the canonical slug", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      outdoorTvProject({ id: PUBLISHED_ID, slug: "econo-lift", name: "Econo Lift" }),
    );

    await renderPage("econo-lift");

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Econo Lift" })).toBeInTheDocument();
  });

  // AC-5: a product still mid-wizard (no name yet) has no slug yet either;
  // its id-based address renders normally, no redirect attempted.
  it("renders normally by id, without redirecting, when the product has no slug yet (AC-5)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      outdoorTvProject({ id: PUBLISHED_ID, slug: null, name: "Kreator W Toku" }),
    );

    await renderPage(PUBLISHED_ID);

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Kreator W Toku" })).toBeInTheDocument();
  });
});

describe("generateMetadata (spec 0058 AC-7)", () => {
  it("returns {} for a non-outdoor-tv product (this route never metas it)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(outdoorTvProject({ family: "dom" }));

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "any" }) });
    expect(metadata).toEqual({});
  });

  it("builds canonical/openGraph off the slug and carries no robots override for a published product", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      outdoorTvProject({ slug: "econo-lift", status: "published", name: "Econo Lift" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "econo-lift" }) });
    expect(metadata.alternates?.canonical).toBe("/pl/outdoor-tv/econo-lift");
    expect(metadata.openGraph?.url).toBe("/pl/outdoor-tv/econo-lift");
    expect(metadata.robots).toBeUndefined();
  });

  it("adds robots noindex/nofollow for a non-published product (AC-7)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      outdoorTvProject({ slug: "econo-lift", status: "draft", name: "Econo Lift" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "econo-lift" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
