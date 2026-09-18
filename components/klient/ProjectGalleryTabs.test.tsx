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
  coverImageUrl: "/cover.webp",
  galleryImageUrls: ["/a.webp"],
  selectedVariantId: "variant-1",
  hrefFor: (tab: string) => `?zakladka=${tab}`,
};

describe("ProjectGalleryTabs", () => {
  it("shows both tabs even when there is no floor plan document (placeholder instead of hiding)", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} documents={[]} activeTab="wizualizacje" />),
      ),
    );

    expect(screen.getByRole("tab", { name: "Wizualizacje" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rzut" })).toBeInTheDocument();
  });

  it("shows the Rzut placeholder when there is no floor plan document for the selected variant", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} documents={[]} activeTab="rzut" />),
      ),
    );

    expect(screen.getByText("Rzut do uzupełnienia przez producenta")).toBeInTheDocument();
  });

  it("shows the Rzut tab once a floor plan document exists for the selected variant", async () => {
    const documents: ProjectDocument[] = [{ url: "/plan.webp", purpose: "product_floor_plan" }];
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryTabs {...baseProps} documents={documents} activeTab="rzut" />),
      ),
    );

    expect(screen.getByRole("tab", { name: "Rzut" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Rzut Modulor Family 90/ })).toBeInTheDocument();
  });
});
