import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Heading } from "@/components/ui";
import type { ProjectDocument } from "@/lib/data/types";

interface OutdoorTvRealUseGalleryProps {
  productName: string;
  documents: ProjectDocument[];
  /** Produktowe wideo (product.videoUrl), przeniesione tu z hero galerii: "w
   * praktyce" pasuje mu treściowo lepiej niż sekcja obok ceny. Puste → sekcja
   * pokazuje same zdjęcia, jeśli są. */
  videoUrl?: string | null;
}

// Reużywa document.purpose 'product_realization_photo' (spec 0056 AC-10), ten
// sam wzorzec co ProducerRealizationsSection na stronie domu, ale bez jej
// placeholdera na brak zdjęć: tu sekcja znika całkowicie, nagłówek włącznie,
// zamiast pokazywać wykropkowaną ramkę (spec 0056 AC-4, ostrzejsza reguła niż
// na stronie domu). Video liczy się tu na równi ze zdjęciami: sekcja znika
// tylko gdy nie ma ani jednego, ani drugiego.
export async function OutdoorTvRealUseGallery({ productName, documents, videoUrl }: OutdoorTvRealUseGalleryProps) {
  const photos = documents.filter((doc) => doc.purpose === "product_realization_photo");
  if (photos.length === 0 && !videoUrl) return null;

  const t = await getTranslations("OutdoorTvPage");

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("realUseHeading")}
      </Heading>
      {videoUrl && (
        <div className="overflow-hidden rounded-v5-card border border-brand-v5-line">
          <video
            src={videoUrl}
            controls
            className="aspect-video w-full bg-brand-v5-night"
            aria-label={t("videoLabel", { name: productName })}
          />
        </div>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-brand-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((doc, index) => (
            <div key={doc.url} className="relative aspect-square overflow-hidden rounded-v5-card">
              <Image
                src={doc.url}
                alt={t("realUsePhotoAlt", { name: productName, index: index + 1 })}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
