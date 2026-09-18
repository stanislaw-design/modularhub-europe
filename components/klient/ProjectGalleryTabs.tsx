import { Map } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Text } from "@/components/ui";
import { ProjectGalleryCarousel, ProjectGalleryCover, ProjectGalleryThumbnails } from "./ProjectGallery";
import type { ProjectDocument, ProjectDocumentPurpose } from "@/lib/data/types";

export type GalleryTabKey = "wizualizacje" | "rzut";

interface ProjectGalleryTabsProps {
  projectName: string;
  coverImageUrl: string;
  galleryImageUrls?: string[];
  documents: ProjectDocument[];
  selectedVariantId?: string;
  activeTab: GalleryTabKey;
  hrefFor: (tab: GalleryTabKey) => string;
}

// Dokument z pustym productVariantId dotyczy każdego wariantu (spec 0041
// Feature design); dokument przypisany do konkretnego wariantu pokazuje się
// tylko przy tym wariancie (spec 0042 AC-7).
function documentsForTab(
  documents: ProjectDocument[],
  purpose: ProjectDocumentPurpose,
  selectedVariantId: string | undefined,
): ProjectDocument[] {
  return documents.filter(
    (doc) => doc.purpose === purpose && (doc.productVariantId === undefined || doc.productVariantId === selectedVariantId),
  );
}

// Zakładka Wizualizacje reużywa dzisiejszy coverImageUrl/galleryImageUrls
// (już rozwiązane przez resolveProductDocumentPhotos z bezpiecznym fallbackiem
// do mocka/starych pól, spec 0031 strangler), zamiast czytać documents wprost
// — produkt bez jeszcze zmigrowanych wierszy document nie traci jedynego
// realnego zdjęcia. Rzut nie ma takiego dawnego odpowiednika, więc czyta
// documents bezpośrednio (spec 0042 AC-7). Zdjęcia z realizacji tego projektu
// (purpose product_realization_photo) żyją teraz w sekcji "Realizacje i
// producent" (ProducerRealizationsSection), nie jako trzecia zakładka tutaj.
export async function ProjectGalleryTabs({
  projectName,
  coverImageUrl,
  galleryImageUrls,
  documents,
  selectedVariantId,
  activeTab,
  hrefFor,
}: ProjectGalleryTabsProps) {
  const t = await getTranslations("ProjectGalleryTabs");

  const floorPlanDocs = documentsForTab(documents, "product_floor_plan", selectedVariantId);

  // Obie zakładki renderują się zawsze (placeholder albo treść), żeby klient
  // widział cały układ galerii od razu — świadome odejście od pierwotnego
  // AC-7 (zakładka bez dokumentu się nie pojawia).
  const tabs: { key: GalleryTabKey; label: string }[] = [
    { key: "wizualizacje", label: t("tabWizualizacje") },
    { key: "rzut", label: t("tabRzut") },
  ];
  const effectiveTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : "wizualizacje";

  return (
    <div className="flex flex-col gap-brand-3">
      {/* Zakładki (Wizualizacje/Rzut) chowają się na mobile — karuzela poniżej
          pokazuje już wszystkie zdjęcia po kolei, a rzut na tym rozmiarze na
          razie zostaje osiągalny tylko z poziomu lg (spec 0042 follow-up). */}
      <div role="tablist" aria-label={t("tablistLabel")} className="hidden flex-wrap gap-brand-2 lg:flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            role="tab"
            aria-selected={effectiveTab === tab.key}
            className={`focus-ring rounded-full border px-brand-3 py-1.5 text-body font-medium transition-colors ${
              effectiveTab === tab.key
                ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
                : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="-mx-[6%] lg:mx-0">
        {effectiveTab === "wizualizacje" && (
          <>
            <div className="lg:hidden">
              <ProjectGalleryCarousel coverImageUrl={coverImageUrl} galleryImageUrls={galleryImageUrls} projectName={projectName} />
            </div>
            <div className="hidden lg:block">
              <ProjectGalleryCover
                coverImageUrl={coverImageUrl}
                totalCount={(galleryImageUrls?.length ?? 0) + 1}
                projectName={projectName}
              />
              <div className="mt-brand-2">
                <ProjectGalleryThumbnails galleryImageUrls={galleryImageUrls} projectName={projectName} />
              </div>
            </div>
          </>
        )}

        {effectiveTab === "rzut" &&
          (floorPlanDocs.length > 0 ? (
            <div className="grid grid-cols-1 gap-brand-2 px-[6%] sm:grid-cols-2 lg:px-0">
              {floorPlanDocs.map((doc, index) => (
                <div
                  key={doc.url}
                  className="relative aspect-[4/3] overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface"
                >
                  <Image
                    src={doc.url}
                    alt={t("floorPlanAlt", { name: projectName, index: index + 1 })}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-[6%] flex flex-col items-center gap-brand-2 rounded-v5-card border border-dashed border-brand-v5-line p-brand-6 text-center lg:mx-0">
              <Map className="size-8 text-brand-v5-muted" aria-hidden="true" />
              <Text tone="muted" surface="v5">
                {t("rzutPlaceholder")}
              </Text>
            </div>
          ))}
      </div>
    </div>
  );
}
