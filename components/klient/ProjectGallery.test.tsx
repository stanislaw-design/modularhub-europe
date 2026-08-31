import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectGalleryCover, ProjectGalleryThumbnails } from "./ProjectGallery";

describe("ProjectGalleryCover", () => {
  it("renders the cover image without a count badge when totalCount is 1", () => {
    render(<ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={1} projectName="Modulor Family 90" />);

    expect(screen.getByRole("img", { name: "Modulor Family 90, dom modułowy" })).toBeInTheDocument();
    expect(screen.queryByText(/zdjęć/)).not.toBeInTheDocument();
  });

  it("renders a photo count badge when totalCount is greater than 1", () => {
    render(<ProjectGalleryCover coverImageUrl="/cover.webp" totalCount={4} projectName="Modulor Family 90" />);

    expect(screen.getByText("4 zdjęć")).toBeInTheDocument();
  });
});

describe("ProjectGalleryThumbnails", () => {
  it("renders nothing when galleryImageUrls is absent (spec 0020 Feature design)", () => {
    const { container } = render(<ProjectGalleryThumbnails projectName="Modulor Family 90" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when galleryImageUrls is empty (spec 0020 AC-4)", () => {
    const { container } = render(<ProjectGalleryThumbnails galleryImageUrls={[]} projectName="Modulor Family 90" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every extra image, in order, when galleryImageUrls is populated", () => {
    render(
      <ProjectGalleryThumbnails
        galleryImageUrls={["/a.webp", "/b.webp", "/c.webp"]}
        projectName="Modulor Family 90"
      />
    );

    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 3" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Modulor Family 90, zdjęcie 4" })).toBeInTheDocument();
  });

  it("filters out empty-string urls from galleryImageUrls", () => {
    render(<ProjectGalleryThumbnails galleryImageUrls={["", "/a.webp", ""]} projectName="Modulor Family 90" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
