import Image from "next/image";

interface ProjectGalleryCoverProps {
  coverImageUrl: string;
  /** Łączna liczba zdjęć (okładka + galeria), do odznaki w rogu; 1 → odznaka się nie pokazuje. */
  totalCount: number;
  projectName: string;
  className?: string;
}

// Rozdzielone na dwa komponenty (cover / thumbnails), żeby strona mogła ułożyć
// prawą kolumnę (nazwa, cena, CTA) w tym samym wierszu siatki co samo zdjęcie
// główne — wyrównaną do jego wysokości, a nie do wysokości całej galerii razem
// z paskiem miniatur pod spodem.
export function ProjectGalleryCover({ coverImageUrl, totalCount, projectName, className }: ProjectGalleryCoverProps) {
  return (
    <div
      className={`group relative aspect-[4/3] overflow-hidden rounded-v5-card sm:aspect-[3/2] ${className ?? ""}`}
    >
      <Image
        src={coverImageUrl}
        alt={`${projectName}, dom modułowy`}
        fill
        priority
        sizes="(min-width: 1024px) 66vw, 100vw"
        className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
      />
      {totalCount > 1 && (
        <span className="absolute bottom-brand-2 left-brand-2 rounded-v5-pill bg-brand-v5-night/70 px-brand-2 py-1 text-label font-medium text-brand-v5-paper backdrop-blur-sm">
          {totalCount} zdjęć
        </span>
      )}
    </div>
  );
}

interface ProjectGalleryThumbnailsProps {
  galleryImageUrls?: string[];
  projectName: string;
}

// coverImageUrl (renderowany przez ProjectGalleryCover) zostaje pierwszym/głównym
// zdjęciem niezależnie od galleryImageUrls (spec 0020 Feature design); brak
// dodatkowych zdjęć nie renderuje pustego paska miniatur.
export function ProjectGalleryThumbnails({ galleryImageUrls, projectName }: ProjectGalleryThumbnailsProps) {
  const extraImages = galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  if (extraImages.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-brand-2 sm:grid-cols-4">
      {extraImages.map((url, index) => (
        <div key={url} className="group relative aspect-square overflow-hidden rounded-v5-card sm:aspect-[4/3]">
          <Image
            src={url}
            alt={`${projectName}, zdjęcie ${index + 2}`}
            fill
            sizes="(min-width: 1024px) 16vw, 25vw"
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-110"
          />
        </div>
      ))}
    </div>
  );
}
