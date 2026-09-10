"use client";

import Image from "next/image";
import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { Star, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Label, Text } from "@/components/ui";
import { deleteProductPhoto, setCoverPhoto, uploadProductPhoto } from "@/lib/product-photo-actions";

export interface ProducerProductPhoto {
  id: string;
  url: string;
  filename: string;
  isCover: boolean;
}

interface ProducerProductPhotosStepProps {
  productId: string;
  photos: ProducerProductPhoto[];
  showValidation: boolean;
  onPhotosChange: (photos: ProducerProductPhoto[]) => void;
}

// Krok zdjęć przebudowany na realne przechowywanie (spec 0032 AC-7, Key
// invariants): wgrywa od razu przy wyborze pliku, nie dopiero przy końcowym
// zapisie, ten sam wzorzec co ProductPhotoManager (admin, spec 0031), ale bez
// zmiany kolejności — nie wymaga jej żadne kryterium akceptacji tej funkcji.
export function ProducerProductPhotosStep({
  productId,
  photos,
  showValidation,
  onPhotosChange,
}: ProducerProductPhotosStepProps) {
  const t = useTranslations("ProducerProductPhotosStep");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const invalid = showValidation && photos.length === 0;

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    event.target.value = "";
    setError(null);
    startTransition(async () => {
      let next = photos;
      for (const file of selected) {
        const result = await uploadProductPhoto(productId, file);
        if (!result.ok || !result.documentId || !result.url) {
          setError(result.error ?? t("uploadError"));
          onPhotosChange(next);
          return;
        }
        next = [...next, { id: result.documentId, url: result.url, filename: file.name, isCover: next.length === 0 }];
      }
      onPhotosChange(next);
    });
  }

  function handleSetCover(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setCoverPhoto(documentId);
      if (!result.ok) {
        setError(result.error ?? t("coverError"));
        return;
      }
      onPhotosChange(photos.map((photo) => ({ ...photo, isCover: photo.id === documentId })));
    });
  }

  function handleDelete(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductPhoto(documentId);
      if (!result.ok) {
        setError(result.error ?? t("deleteError"));
        return;
      }
      onPhotosChange(photos.filter((photo) => photo.id !== documentId));
    });
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <Label htmlFor="wizard-photos" required>
        {t("label")}
      </Label>
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          id="wizard-photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {t("chooseFiles")}
        </Button>
        <Text as="span" variant="label" tone="muted">
          {t("hint")}
        </Text>
      </div>

      {error && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {error}
        </p>
      )}
      {invalid && <p className="font-sans text-body text-status-blocked">{t("requiredError")}</p>}

      {photos.length === 0 ? (
        <Text tone="muted">{t("noPhotos")}</Text>
      ) : (
        <ul className="flex flex-col gap-brand-2">
          {photos.map((photo) => (
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
                    <Star className="size-3 fill-current" aria-hidden="true" /> {t("coverLabel")}
                  </Text>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!photo.isCover && (
                  <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => handleSetCover(photo.id)}>
                    {t("setCoverButton")}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  disabled={isPending}
                  aria-label={t("removePhoto", { name: photo.filename })}
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
