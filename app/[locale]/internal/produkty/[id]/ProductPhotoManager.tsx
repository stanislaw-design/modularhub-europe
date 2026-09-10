"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { Button, Text } from "@/components/ui";
import { deleteProductPhoto, reorderProductPhotos, setCoverPhoto, uploadProductPhoto } from "@/lib/product-photo-actions";
import type { ProductPhotoForAdmin } from "@/lib/db/queries";

interface ProductPhotoManagerProps {
  productId: string;
  initialPhotos: ProductPhotoForAdmin[];
}

// Interaktywna część /internal/produkty/[id] (spec 0031 AC-2, AC-4, AC-5, AC-6):
// router.refresh() po każdej udanej akcji, zamiast lokalnego stanu galerii —
// admin tool o niskim ruchu, prostota i zawsze zgodność z bazą (zwłaszcza dla
// niezmiennika "co najwyżej jedna okładka") ważniejsze niż optymistyczne UI.
export function ProductPhotoManager({ productId, initialPhotos }: ProductPhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    event.target.value = "";
    setError(null);
    startTransition(async () => {
      for (const file of selected) {
        const result = await uploadProductPhoto(productId, file);
        if (!result.ok) {
          setError(result.error ?? "Nie udało się wgrać pliku.");
          return;
        }
      }
      router.refresh();
    });
  }

  function handleSetCover(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setCoverPhoto(documentId);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się ustawić okładki.");
        return;
      }
      router.refresh();
    });
  }

  function handleReorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= initialPhotos.length) return;
    const reordered = [...initialPhotos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setError(null);
    startTransition(async () => {
      const result = await reorderProductPhotos(
        productId,
        reordered.map((photo) => photo.id),
      );
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać kolejności.");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(documentId: string) {
    if (!window.confirm("Usunąć to zdjęcie? Tej operacji nie można cofnąć.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductPhoto(documentId);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się usunąć zdjęcia.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-brand-3">
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          Wgraj zdjęcia
        </Button>
        <Text as="span" variant="label" tone="muted">
          JPEG, PNG lub WebP, maks. 10 MB.
        </Text>
      </div>

      {error && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {error}
        </p>
      )}

      {initialPhotos.length === 0 ? (
        <Text tone="muted">
          Ten produkt nie ma jeszcze żadnego wgranego zdjęcia; strona klienta pokazuje dzisiejszą okładkę z mocka.
        </Text>
      ) : (
        <ul className="flex flex-col gap-brand-2">
          {initialPhotos.map((photo, index) => (
            <li
              key={photo.id}
              className="flex items-center gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-brand-1"
            >
              <Image
                src={photo.url}
                alt={photo.filename}
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-data object-cover"
                unoptimized
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <Text as="span" className="truncate">
                  {photo.filename}
                </Text>
                {photo.isCover && (
                  <Text as="span" variant="label" tone="muted" className="flex items-center gap-1">
                    <Star className="size-3 fill-current" aria-hidden="true" /> Okładka
                  </Text>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleReorder(index, -1)}
                  disabled={isPending || index === 0}
                  aria-label={`Przenieś ${photo.filename} wyżej`}
                  className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(index, 1)}
                  disabled={isPending || index === initialPhotos.length - 1}
                  aria-label={`Przenieś ${photo.filename} niżej`}
                  className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                {!photo.isCover && (
                  <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => handleSetCover(photo.id)}>
                    Ustaw jako okładkę
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  disabled={isPending}
                  aria-label={`Usuń ${photo.filename}`}
                  className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked disabled:opacity-30"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
