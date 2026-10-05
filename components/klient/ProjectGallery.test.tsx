import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { GalleryLightboxProvider } from "./ProjectGalleryLightbox";
import { ProjectGalleryCover, ProjectGalleryThumbnails } from "./ProjectGallery";

// GalleryImageButton (rendered inside ProjectGalleryCover/Thumbnails) reads
// the lightbox context, so every render here needs a provider ancestor —
// images content doesn't matter for these assertions, just its presence.
function withLightbox(children: ReactNode) {
  return <GalleryLightboxProvider images={[]}>{children}</GalleryLightboxProvider>;
}

describe("ProjectGalleryCover", () => {
  it("renders the cover image without a count badge when totalCount is 1", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(
          <ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={1} altSubject="Sauna ogrodowa Loki – Wooden Dream House" />
        )
      )
    );

    expect(screen.getByRole("img", { name: "Sauna ogrodowa Loki – Wooden Dream House" })).toBeInTheDocument();
    expect(screen.queryByText(/zdjęć/)).not.toBeInTheDocument();
  });

  it("renders a photo count badge when totalCount is greater than 1", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(
          <ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={4} altSubject="Sauna ogrodowa Loki – Wooden Dream House" />
        )
      )
    );

    expect(screen.getByText("4 zdjęcia")).toBeInTheDocument();
  });
});

describe("ProjectGalleryThumbnails", () => {
  it("renders nothing when galleryImageUrls is absent (spec 0020 Feature design)", async () => {
    const { container } = render(
      await resolveAsyncTree(withLightbox(<ProjectGalleryThumbnails altSubject="Sauna ogrodowa Loki – Wooden Dream House" />))
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when galleryImageUrls is empty (spec 0020 AC-4)", async () => {
    const { container } = render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryThumbnails galleryImageUrls={[]} altSubject="Sauna ogrodowa Loki – Wooden Dream House" />)
      )
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every extra image, in order, when galleryImageUrls is populated", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(
          <ProjectGalleryThumbnails
            galleryImageUrls={["/a.webp", "/b.webp", "/c.webp"]}
            altSubject="Sauna ogrodowa Loki – Wooden Dream House"
          />
        )
      )
    );

    expect(screen.getByRole("img", { name: "Sauna ogrodowa Loki – Wooden Dream House, zdjęcie 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sauna ogrodowa Loki – Wooden Dream House, zdjęcie 3" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sauna ogrodowa Loki – Wooden Dream House, zdjęcie 4" })).toBeInTheDocument();
  });

  it("filters out empty-string urls from galleryImageUrls", async () => {
    render(
      await resolveAsyncTree(
        withLightbox(<ProjectGalleryThumbnails galleryImageUrls={["", "/a.webp", ""]} altSubject="Sauna ogrodowa Loki – Wooden Dream House" />)
      )
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
