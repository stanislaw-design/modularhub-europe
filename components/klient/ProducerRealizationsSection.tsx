import { BadgeCheck, Camera, CircleHelp, Home, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Heading, StarRating, Text } from "@/components/ui";
import type { CountryCode, Producer, ProjectDocument } from "@/lib/data/types";

const countryFlag: Record<CountryCode, string> = { PL: "🇵🇱", DE: "🇩🇪", NL: "🇳🇱" };

interface ProducerRealizationsSectionProps {
  producer: Producer;
  projectName: string;
  documents: ProjectDocument[];
  selectedVariantId?: string;
}

// Dokument z pustym productVariantId dotyczy każdego wariantu, ten sam
// filtr co dawniej w ProjectGalleryTabs (spec 0042 AC-7), przeniesiony tu
// razem z samą sekcją "Realizacje" (patrz komentarz w ProjectGalleryTabs).
function realizationDocsFor(documents: ProjectDocument[], selectedVariantId: string | undefined): ProjectDocument[] {
  return documents.filter(
    (doc) =>
      doc.purpose === "product_realization_photo" &&
      (doc.productVariantId === undefined || doc.productVariantId === selectedVariantId),
  );
}

// Nagłówek producenta (tożsamość + ocena + zrealizowane projekty) i zdjęcia
// z realizacji TEGO projektu żyją teraz w jednej sekcji, zgodnie z etykietą
// nawigacji "Realizacje i producent" — wcześniej ta etykieta obiecywała
// więcej niż plain ProducerCard pokazywał, a same zdjęcia realizacji
// mieszkały osobno, jako trzecia zakładka w hero galerii.
export async function ProducerRealizationsSection({
  producer,
  projectName,
  documents,
  selectedVariantId,
}: ProducerRealizationsSectionProps) {
  const t = await getTranslations("ProducerRealizationsSection");
  const countryLabel: Record<CountryCode, string> = {
    PL: t("country.PL"),
    DE: t("country.DE"),
    NL: t("country.NL"),
  };
  const realizationDocs = realizationDocsFor(documents, selectedVariantId);

  return (
    <div className="flex flex-col gap-brand-4">
      <div className="flex flex-col gap-brand-3 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4 sm:flex-row sm:items-center sm:gap-brand-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-v5-card">
          <Image
            src={producer.featuredPhotoUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col gap-brand-1">
          <div className="flex flex-wrap items-center gap-brand-2">
            <span className="font-display text-h3 font-bold text-brand-v5-ink">{producer.name}</span>
            {producer.verified && (
              <span className="flex items-center gap-1 text-data font-semibold text-status-approved">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {t("verified")}
              </span>
            )}
            <span
              className="text-body-l"
              role="img"
              aria-label={t("countryOfProduction", { country: countryLabel[producer.countryCode] })}
            >
              {countryFlag[producer.countryCode]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-brand-2">
            <StarRating rating={producer.rating} reviewCount={producer.reviewCount} />
            <span aria-hidden="true" className="text-brand-v5-line">
              ·
            </span>
            <Text tone="muted" className="text-data">
              {t("completedProjects", { count: producer.completedProjectsCount })}
            </Text>
            <span aria-hidden="true" className="text-brand-v5-line">
              ·
            </span>
            <Text tone="muted" className="text-data">
              {t("modelsInOffer", { count: producer.modelsCount })}
            </Text>
          </div>
          {/* Trzy rozróżnialne stany, nigdy sprowadzone do prawda/fałsz z cichym
              domyślnym "nie" dla braku danych (spec 0042 AC-9), przeniesione tu
              z dawnego ProducerCard showTrustDetails. */}
          <span className="flex items-center gap-brand-1">
            {producer.showroomVisitAvailable === true && (
              <Home className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
            )}
            {producer.showroomVisitAvailable === false && (
              <XCircle className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
            )}
            {producer.showroomVisitAvailable === null && (
              <CircleHelp className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
            )}
            <Text tone="muted" className="text-data">
              {producer.showroomVisitAvailable === true
                ? t("showroomVisitAvailable")
                : producer.showroomVisitAvailable === false
                  ? t("showroomVisitUnavailable")
                  : t("showroomVisitUnknown")}
            </Text>
          </span>
          {producer.showroomVisitAvailable === true && producer.showroomVisitNote && (
            <Text tone="muted" className="text-data">
              {producer.showroomVisitNote}
            </Text>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-brand-3">
        <Heading level="h3" surface="v5" className="text-body-l">
          {t("realizationsHeading")}
        </Heading>
        {realizationDocs.length > 0 ? (
          <div className="grid grid-cols-2 gap-brand-2 sm:grid-cols-3 lg:grid-cols-4">
            {realizationDocs.map((doc, index) => (
              <div key={doc.url} className="relative aspect-square overflow-hidden rounded-v5-card">
                <Image
                  src={doc.url}
                  alt={t("realizationAlt", { name: projectName, index: index + 1 })}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-brand-2 rounded-v5-card border border-dashed border-brand-v5-line p-brand-6 text-center">
            <Camera className="size-8 text-brand-v5-muted" aria-hidden="true" />
            <Text tone="muted" surface="v5">
              {t("realizationsPlaceholder")}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
