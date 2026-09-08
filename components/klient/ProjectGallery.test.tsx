import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProjectGalleryCover, ProjectGalleryThumbnails } from "./ProjectGallery";

describe("ProjectGalleryCover", () => {
  it("renders the cover image without a count badge when totalCount is 1", async () => {
    render(
      await resolveAsyncTree(
        <ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={1} projectName="Modulor Family 90" />
      )
    );

    expect(screen.getByRole("img", { name: "Modulor Family 90, dom modułowy" })).toBeInTheDocument();
    expect(screen.queryByText(/zdjęć/)).not.toBeInTheDocument();
  });

  it("renders a photo count badge when totalCount is greater than 1", async () => {
    render(
      await resolveAsyncTree(
        <ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={4} projectName="Modulor Family 90" />
      )
    );

    expect(screen.getByText("4 zdjęcia")).toBeInTheDocument();
  });
});

describe("ProjectGalleryThumbnails", () => {
  it("renders nothing when galleryImageUrls is absent (spec 0020 Feature design)", async () => {
    const { container } = render(await resolveAsyncTree(<ProjectGalleryThumbnails projectName="Modulor Family 90" />));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when galleryImageUrls is empty (spec 0020 AC-4)", async () => {
    const { container } = render(
      await resolveAsyncTree(<ProjectGalleryThumbnails galleryImageUrls={[]} projectName="Modulor Family 90" />)
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every extra image, in order, when galleryImageUrls is populated", async () => {
    render(
      await resolveAsyncTree(
        <ProjectGalleryThumbnails
          galleryImageUrls={["/a.webp", "/b.webp", "/c.webp"]}
          projectName="Modulor Family 90"
        />
      )
    );

    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 3" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 4" })).toBeInTheDocument();
  });

  it("filters out empty-string urls from galleryImageUrls", async () => {
    render(
      await resolveAsyncTree(
        <ProjectGalleryThumbnails galleryImageUrls={["", "/a.webp", ""]} projectName="Modulor Family 90" />
      )
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
