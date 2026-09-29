import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Heading } from "@/components/ui";
import type { ProjectDocument } from "@/lib/data/types";

interface OutdoorTvRealUseGalleryProps {
  productName: string;
  documents: ProjectDocument[];
}

// Reużywa document.purpose 'product_realization_photo' (spec 0056 AC-10), ten
// sam wzorzec co ProducerRealizationsSection na stronie domu, ale bez jej
// placeholdera na brak zdjęć: tu sekcja znika całkowicie, nagłówek włącznie,
// zamiast pokazywać wykropkowaną ramkę (spec 0056 AC-4, ostrzejsza reguła niż
// na stronie domu). Wideo i usageNote przeniesione do OutdoorTvVideoSection
// (pierwszy element po hero, celowo złamany, większy wzorzec nagłówka) — ta
// sekcja zostaje tylko dla zdjęć, stąd własny nagłówek inny niż tamtej sekcji
// (żeby dwie sekcje z tym samym tytułem nie stały obok siebie na stronie).
export async function OutdoorTvRealUseGallery({ productName, documents }: OutdoorTvRealUseGalleryProps) {
  const photos = documents.filter((doc) => doc.purpose === "product_realization_photo");
  if (photos.length === 0) return null;

  const t = await getTranslations("OutdoorTvPage");

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("realUsePhotosHeading")}
      </Heading>
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
    </div>
  );
}
