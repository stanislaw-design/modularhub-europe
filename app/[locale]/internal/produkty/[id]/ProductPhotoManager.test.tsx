import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductPhotoForAdmin } from "@/lib/db/queries";
import { ProductPhotoManager } from "./ProductPhotoManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ refresh: refreshMock }) };
});

const uploadProductPhotoMock = vi.fn();
const setCoverPhotoMock = vi.fn();
const reorderProductPhotosMock = vi.fn();
const deleteProductPhotoMock = vi.fn();
// Mockowane na granicy, ten sam wzorzec co ResultCard.test.tsx dla
// lib/favorite-actions: lib/product-photo-actions.ts importuje @/auth, które
// nie ładuje się pod Vitest/jsdom.
vi.mock("@/lib/product-photo-actions", () => ({
  uploadProductPhoto: (...args: unknown[]) => uploadProductPhotoMock(...args),
  setCoverPhoto: (...args: unknown[]) => setCoverPhotoMock(...args),
  reorderProductPhotos: (...args: unknown[]) => reorderProductPhotosMock(...args),
  deleteProductPhoto: (...args: unknown[]) => deleteProductPhotoMock(...args),
}));

const twoPhotos: ProductPhotoForAdmin[] = [
  { id: "doc-1", url: "https://pub-test.r2.dev/cover.jpg", filename: "cover.jpg", isCover: true, sortOrder: 0 },
  { id: "doc-2", url: "https://pub-test.r2.dev/second.jpg", filename: "second.jpg", isCover: false, sortOrder: 1 },
];

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("file input not found");
  return input as HTMLInputElement;
}

beforeEach(() => {
  refreshMock.mockClear();
  uploadProductPhotoMock.mockReset();
  setCoverPhotoMock.mockReset();
  reorderProductPhotosMock.mockReset();
  deleteProductPhotoMock.mockReset();
});

describe("ProductPhotoManager", () => {
  it("renders every photo with its cover badge and the correct set-cover button visibility (AC-4)", () => {
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    expect(screen.getByText("cover.jpg")).toBeInTheDocument();
    expect(screen.getByText("second.jpg")).toBeInTheDocument();
    expect(screen.getByText("Okładka")).toBeInTheDocument();
    // Only the non-cover photo gets an "Ustaw jako okładkę" button.
    expect(screen.getAllByRole("button", { name: "Ustaw jako okładkę" })).toHaveLength(1);
  });

  it("shows an empty state and no photo list when there are no photos yet", () => {
    render(<ProductPhotoManager productId="prod-1" initialPhotos={[]} />);
    expect(screen.getByText(/nie ma jeszcze żadnego wgranego zdjęcia/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // AC-2: wgrywanie.
  it("uploads a selected file and refreshes the page on success", async () => {
    uploadProductPhotoMock.mockResolvedValue({ ok: true, documentId: "doc-3", url: "https://pub-test.r2.dev/new.jpg" });
    const { container } = render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);
    const file = new File(["fake-bytes"], "new.jpg", { type: "image/jpeg" });

    await userEvent.upload(getFileInput(container), file);

    await waitFor(() => expect(uploadProductPhotoMock).toHaveBeenCalledWith("prod-1", file));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  // AC-3: plik odrzucony przez serwer pokazuje czytelny komunikat, nie odświeża strony.
  it("shows the server's rejection message and does not refresh when the upload is rejected", async () => {
    uploadProductPhotoMock.mockResolvedValue({ ok: false, error: "Dozwolone są tylko pliki JPEG, PNG lub WebP." });
    const { container } = render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);
    const file = new File(["not really an image"], "fake.jpg", { type: "image/jpeg" });

    await userEvent.upload(getFileInput(container), file);

    expect(await screen.findByRole("alert")).toHaveTextContent("Dozwolone są tylko pliki JPEG, PNG lub WebP.");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  // AC-4.
  it("calls setCoverPhoto with the clicked photo's id and refreshes on success", async () => {
    setCoverPhotoMock.mockResolvedValue({ ok: true });
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    await userEvent.click(screen.getByRole("button", { name: "Ustaw jako okładkę" }));

    await waitFor(() => expect(setCoverPhotoMock).toHaveBeenCalledWith("doc-2"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  // AC-5: strzałka w dół na pierwszym zdjęciu zamienia je miejscami z drugim.
  it("moving the first photo down sends the swapped id order to reorderProductPhotos", async () => {
    reorderProductPhotosMock.mockResolvedValue({ ok: true });
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    await userEvent.click(screen.getByRole("button", { name: "Przenieś cover.jpg niżej" }));

    await waitFor(() => expect(reorderProductPhotosMock).toHaveBeenCalledWith("prod-1", ["doc-2", "doc-1"]));
  });

  it("disables the up arrow on the first photo and the down arrow on the last photo", () => {
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    expect(screen.getByRole("button", { name: "Przenieś cover.jpg wyżej" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Przenieś second.jpg niżej" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Przenieś cover.jpg niżej" })).toBeEnabled();
  });

  // AC-6.
  it("asks for confirmation, then calls deleteProductPhoto and refreshes", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteProductPhotoMock.mockResolvedValue({ ok: true });
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    await userEvent.click(screen.getByRole("button", { name: "Usuń second.jpg" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(deleteProductPhotoMock).toHaveBeenCalledWith("doc-2"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it("does not call deleteProductPhoto when the confirmation is declined", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProductPhotoManager productId="prod-1" initialPhotos={twoPhotos} />);

    await userEvent.click(screen.getByRole("button", { name: "Usuń second.jpg" }));

    expect(deleteProductPhotoMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
