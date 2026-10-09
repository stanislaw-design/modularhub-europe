import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "@/lib/data/types";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { GalleryLightboxProvider } from "./ProjectGalleryLightbox";
import { ProjectGalleryTabs } from "./ProjectGalleryTabs";

function withLightbox(children: ReactNode) {
  return <GalleryLightboxProvider images={[]}>{children}</GalleryLightboxProvider>;
}

const baseProps = {
  projectName: "Modulor Family 90",
  altSubject: "Dom modułowy Test – Producent",
  coverImageUrl: "/cover.webp",
  galleryImageUrls: ["/a.webp"],
  hrefFor: (tab: string) => `?zakladka=${tab}`,
};

describe("ProjectGalleryTabs", () => {
  it("shows both tabs even when there is no floor plan document (placeholder instead of hiding)", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} floorPlans={[]} activeTab="wizualizacje" />),
      ),
    );

    expect(screen.getByRole("tab", { name: "Wizualizacje" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rzut" })).toBeInTheDocument();
  });

  it("shows the Rzut placeholder when there is no floor plan document for the selected variant", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} floorPlans={[]} activeTab="rzut" />),
      ),
    );

    expect(screen.getByText("Rzut do uzupełnienia przez producenta")).toBeInTheDocument();
  });

  it("shows the Rzut tab once a floor plan document exists for the selected variant", async () => {
    const floorPlans: ProjectDocument[] = [{ url: "/plan.webp", purpose: "product_floor_plan" }];
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} floorPlans={floorPlans} activeTab="rzut" />),
      ),
    );

    expect(screen.getByRole("tab", { name: "Rzut" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Rzut Modulor Family 90/ })).toBeInTheDocument();
  });

  it("captions a plan without a floor neutrally as Rzut N (AC-9)", async () => {
    const floorPlans: ProjectDocument[] = [
      { url: "/a.webp", purpose: "product_floor_plan" },
      { url: "/b.webp", purpose: "product_floor_plan" },
    ];
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} floorPlans={floorPlans} activeTab="rzut" />),
      ),
    );

    expect(screen.getByText("Rzut 1")).toBeInTheDocument();
    expect(screen.getByText("Rzut 2")).toBeInTheDocument();
  });

  it("captions a version's plans with the version name and the floor (AC-2)", async () => {
    const floorPlans: ProjectDocument[] = [
      { url: "/p.webp", purpose: "product_floor_plan", productOptionId: "o-v2", floorLevel: "parter" },
      { url: "/q.webp", purpose: "product_floor_plan", productOptionId: "o-v2", floorLevel: "poddasze" },
    ];
    render(
      await resolveAsyncTree(
        withLightbox(
          <ProjectGalleryTabs {...baseProps} floorPlans={floorPlans} floorPlanVersionLabel="Wersja 2" activeTab="rzut" />,
        ),
      ),
    );

    expect(screen.getByText("Wersja 2 · Parter")).toBeInTheDocument();
    expect(screen.getByText("Wersja 2 · Poddasze")).toBeInTheDocument();
  });

  it("captions a base plan that has a floor with the floor only", async () => {
    const floorPlans: ProjectDocument[] = [{ url: "/p.webp", purpose: "product_floor_plan", floorLevel: "pietro" }];
    render(
      await resolveAsyncTree(
        withLightbox(
          <ProjectGalleryTabs {...baseProps} floorPlans={floorPlans} floorPlanVersionLabel="Wersja 2" activeTab="rzut" />,
        ),
      ),
    );

    expect(screen.getByText("Piętro")).toBeInTheDocument();
  });
});
