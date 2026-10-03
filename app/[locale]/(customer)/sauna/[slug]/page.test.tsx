import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

// Same boundary mocks as /outdoor-tv/[slug]'s test.
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
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/pl/sauna/relax-550",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  };
});

// Same documented resolve-async-tree limitation as /project/[slug] and
// /outdoor-tv/[slug]'s tests: the gallery/lightbox client wrapper nests an
// async Server Component several levels deep, unrelated to routing/metadata.
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
const getProductOptionGroupsMock = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getClientIdForUser: (...args: unknown[]) => getClientIdForUserMock(...args),
  getFavoritedProductIds: (...args: unknown[]) => getFavoritedProductIdsMock(...args),
  getProductOptionGroups: (...args: unknown[]) => getProductOptionGroupsMock(...args),
}));

import SaunaPage, { generateMetadata } from "./page";

const PUBLISHED_ID = "2b6b6c2e-9e2a-4e3a-9a1a-2b7a6c5e4d3c";

beforeEach(() => {
  redirectMock.mockClear();
  permanentRedirectMock.mockClear();
  notFoundMock.mockClear();
  getProjectBySlugOrIdMock.mockReset();
  getProducerByIdMock.mockReset().mockResolvedValue(null);
  getProducerPhotoUrlMock.mockReset().mockResolvedValue(null);
  getClientIdForUserMock.mockReset();
  getFavoritedProductIdsMock.mockReset();
  getProductOptionGroupsMock.mockReset().mockResolvedValue([]);
  authMock.mockReset().mockResolvedValue(null);
});

function saunaProject(overrides: Parameters<typeof createMockProject>[0] = {}) {
  return createMockProject({
    family: "spa-modulowe",
    spaSubcategory: "sauna",
    features: [],
    documents: [],
    faq: undefined,
    saunaTechnicalSpecs: undefined,
    ...overrides,
  });
}

async function renderPage(slug: string, searchParams: Record<string, string> = {}, locale = "pl") {
  const element = await SaunaPage({
    params: Promise.resolve({ locale, slug }),
    searchParams: Promise.resolve(searchParams),
  });
  render(await resolveAsyncTree(element));
}

describe("SaunaPage (spec 0061)", () => {
  it("returns notFound when no product matches the slug or id", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(null);

    await expect(renderPage("nieistniejacy-slug")).rejects.toThrow();
    expect(notFoundMock).toHaveBeenCalled();
  });

  // AC-11: a non-sauna product (dom) never renders under /sauna, it's
  // redirected to its own correct address.
  it("redirects to /project when the resolved product is dom (AC-11)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ id: PUBLISHED_ID, family: "dom", spaSubcategory: null, slug: "pomerania-40" }),
    );

    await expect(renderPage(PUBLISHED_ID)).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/project/pomerania-40");
  });

  // AC-11: spa-modulowe but jacuzzi (not sauna) also doesn't belong here.
  it("redirects to /project when the resolved product is spa-modulowe/jacuzzi, not sauna (AC-11)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ id: PUBLISHED_ID, spaSubcategory: "jacuzzi", slug: "bubble-9" }),
    );

    await expect(renderPage(PUBLISHED_ID)).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/project/bubble-9");
  });

  // AC-4: entering by id once the product already has a slug issues a
  // permanent (308) redirect to the canonical slug address, preserving query.
  it("permanently redirects id -> slug, preserving the query string", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(saunaProject({ id: PUBLISHED_ID, slug: "relax-550" }));

    await expect(renderPage(PUBLISHED_ID, { wariant: "6-osob" })).rejects.toThrow();
    expect(permanentRedirectMock).toHaveBeenCalledWith("/pl/sauna/relax-550?wariant=6-osob");
  });

  it("does not redirect when the url segment already is the canonical slug", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ id: PUBLISHED_ID, slug: "relax-550", name: "Kora Relax 550" }),
    );

    await renderPage("relax-550");

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Kora Relax 550" })).toBeInTheDocument();
  });

  // AC-9: a product still mid-entry (no name/slug yet) has no slug yet
  // either; its id-based address renders normally, no redirect attempted.
  it("renders normally by id, without redirecting, when the product has no slug yet (AC-9)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ id: PUBLISHED_ID, slug: null, name: "Sauna W Przygotowaniu" }),
    );

    await renderPage(PUBLISHED_ID);

    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Sauna W Przygotowaniu" })).toBeInTheDocument();
  });

  // AC-5: layout omits the house-shaped sections entirely (never a disabled
  // placeholder) — none of these ids exist in the rendered DOM at all.
  it("never renders the house-only sections (uklad, cena, harmonogram, B2B) (AC-5)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(saunaProject({ id: PUBLISHED_ID, slug: "relax-550" }));

    const { container } = render(
      await resolveAsyncTree(
        await SaunaPage({
          params: Promise.resolve({ locale: "pl", slug: "relax-550" }),
          searchParams: Promise.resolve({}),
        }),
      ),
    );

    for (const id of ["uklad", "cena", "harmonogram"]) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });

  // AC-6: ProjectLogistics only renders when at least one of its fields is filled.
  it("hides the plot/logistics section when none of its fields are filled (AC-6)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({
        id: PUBLISHED_ID,
        slug: "relax-550",
        externalDimensions: "",
        foundationOptions: "",
        clientRequirements: undefined,
      }),
    );

    const { container } = render(
      await resolveAsyncTree(
        await SaunaPage({
          params: Promise.resolve({ locale: "pl", slug: "relax-550" }),
          searchParams: Promise.resolve({}),
        }),
      ),
    );

    expect(container.querySelector("#dzialka")).toBeNull();
  });

  // AC-7: the dedicated sauna technical specs section disappears entirely
  // when saunaTechnicalSpecs is undefined (draft, nothing filled yet).
  it("hides the technical specs section when saunaTechnicalSpecs is undefined (AC-7)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(saunaProject({ id: PUBLISHED_ID, slug: "relax-550" }));

    const { container } = render(
      await resolveAsyncTree(
        await SaunaPage({
          params: Promise.resolve({ locale: "pl", slug: "relax-550" }),
          searchParams: Promise.resolve({}),
        }),
      ),
    );

    expect(container.querySelector("#specyfikacja")).toBeNull();
  });

  it("renders the technical specs section with translated labels when saunaTechnicalSpecs is filled (AC-7)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({
        id: PUBLISHED_ID,
        slug: "relax-550",
        saunaTechnicalSpecs: {
          claddingMaterial: "Drewno thermo",
          interiorWoodType: "Świerk skandynawski",
          benchMaterial: "Abachi",
          insulationType: "Wełna i folia aluminiowa",
          glazingType: "Szkło hartowane przyciemniane",
          seatingCapacity: 6,
          hasChangingArea: true,
          changingAreaDescription: "Strefa relaksu 310 x 250 cm",
          electricalRequirement: "400V",
        },
      }),
    );

    await renderPage("relax-550");

    expect(screen.getByText("Drewno thermo")).toBeInTheDocument();
    expect(screen.getByText("Strefa relaksu 310 x 250 cm")).toBeInTheDocument();
  });
});

describe("generateMetadata (spec 0061 AC-9)", () => {
  it("returns {} for a non-sauna product (this route never metas it)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(saunaProject({ spaSubcategory: "jacuzzi" }));

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "any" }) });
    expect(metadata).toEqual({});
  });

  it("builds canonical/openGraph off the slug and carries no robots override for a published product", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ slug: "relax-550", status: "published", name: "Kora Relax 550" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "relax-550" }) });
    expect(metadata.alternates?.canonical).toBe("/pl/sauna/relax-550");
    expect(metadata.openGraph?.url).toBe("/pl/sauna/relax-550");
    expect(metadata.robots).toBeUndefined();
  });

  it("adds robots noindex/nofollow for a non-published product (AC-9)", async () => {
    getProjectBySlugOrIdMock.mockResolvedValue(
      saunaProject({ slug: "relax-550", status: "draft", name: "Kora Relax 550" }),
    );

    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "pl", slug: "relax-550" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
