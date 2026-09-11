import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GalleryImageButton, GalleryLightboxProvider } from "./ProjectGalleryLightbox";

const images = [
  { src: "/cover.webp", alt: "Modulor Family 90, dom modułowy" },
  { src: "/a.webp", alt: "Modulor Family 90, zdjęcie 2" },
  { src: "/b.webp", alt: "Modulor Family 90, zdjęcie 3" },
];

function Gallery() {
  return (
    <GalleryLightboxProvider images={images}>
      {images.map((image, index) => (
        <GalleryImageButton key={image.src} index={index} label={image.alt}>
          <img src={image.src} alt={image.alt} />
        </GalleryImageButton>
      ))}
    </GalleryLightboxProvider>
  );
}

describe("GalleryLightboxProvider", () => {
  it("is closed until a GalleryImageButton is clicked, then shows that image", async () => {
    const user = userEvent.setup();
    render(<Gallery />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: images[1].alt }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("img", { name: images[1].alt })).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("cycles forward and wraps around with the next arrow", async () => {
    const user = userEvent.setup();
    render(<Gallery />);

    await user.click(screen.getByRole("button", { name: images[2].alt }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Następne zdjęcie" }));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: images[0].alt })).toBeInTheDocument();
  });

  it("cycles backward and wraps around with the previous arrow", async () => {
    const user = userEvent.setup();
    render(<Gallery />);

    await user.click(screen.getByRole("button", { name: images[0].alt }));
    await user.click(screen.getByRole("button", { name: "Poprzednie zdjęcie" }));

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: images[2].alt })).toBeInTheDocument();
  });

  it("navigates with the left/right arrow keys", async () => {
    const user = userEvent.setup();
    render(<Gallery />);

    await user.click(screen.getByRole("button", { name: images[0].alt }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("closes on the close button", async () => {
    const user = userEvent.setup();
    render(<Gallery />);

    await user.click(screen.getByRole("button", { name: images[0].alt }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zamknij podgląd zdjęcia" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
