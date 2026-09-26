import { BadgeCheck, CircleHelp, Home, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { StarRating, Text } from "@/components/ui";
import type { CountryCode, Producer } from "@/lib/data/types";

const countryFlag: Record<CountryCode, string> = { PL: "🇵🇱", DE: "🇩🇪", NL: "🇳🇱" };

interface ProducerCardProps {
  producer: Producer;
  /** Pola zaufania (odwiedziny, notatka, czas odpowiedzi) mają sens tylko w
   * kontekście karty projektu, nie w ProducerShowcase na stronie głównej,
   * gdzie showroom nie jest istotny (spec 0042 AC-9, AC-10, Follow-up). */
  showTrustDetails?: boolean;
}

// No logo files exist for any mock producer, and inventing graphic logos for
// fictional companies risks reading as a real brand (spec 0014 AC-8's same
// concern, spec 0015 Feature design). The name renders as large, styled
// text instead of an image.
export async function ProducerCard({ producer, showTrustDetails = false }: ProducerCardProps) {
  const t = await getTranslations("ProducerCard");
  const countryLabel: Record<CountryCode, string> = {
    PL: t("country.PL"),
    DE: t("country.DE"),
    NL: t("country.NL"),
  };
  return (
    <article className="flex flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={producer.featuredPhotoUrl}
          alt={t("photoAlt", { name: producer.name })}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover"
        />
        {producer.verified && (
          <span className="absolute right-brand-2 top-brand-2 flex items-center gap-1 rounded-v5-pill bg-brand-v5-surface/95 px-brand-2 py-1 text-data font-semibold text-brand-v5-ink shadow-sm">
            <BadgeCheck className="size-4 text-status-approved" aria-hidden="true" />
            {t("verified")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <div className="flex items-start justify-between gap-brand-2">
          <span className="font-display text-h3 font-bold text-brand-v5-ink">{producer.name}</span>
          <span
            className="shrink-0 text-h3"
            role="img"
            aria-label={t("countryOfProduction", { country: countryLabel[producer.countryCode] })}
          >
            {countryFlag[producer.countryCode]}
          </span>
        </div>
        <StarRating rating={producer.rating} reviewCount={producer.reviewCount} />
        <Text tone="muted" className="text-data">
          {t("modelsAndSize", {
            models: producer.modelsCount,
            min: producer.sizeRangeM2Min,
            max: producer.sizeRangeM2Max,
          })}
        </Text>
        <div className="mt-auto flex items-center gap-brand-1 border-t border-brand-v5-line pt-brand-2">
          <Text tone="muted" className="text-data">
            {t("delivery")}
          </Text>
          <ul className="flex items-center gap-1">
            {producer.deliveryCountries.map((code) => (
              <li key={code} className="text-body-l" role="img" aria-label={countryLabel[code]}>
                {countryFlag[code]}
              </li>
            ))}
          </ul>
        </div>
        {showTrustDetails && (
          <div className="flex flex-col gap-brand-1 border-t border-brand-v5-line pt-brand-2">
            {/* Trzy rozróżnialne stany, nigdy sprowadzone do prawda/fałsz z
                cichym domyślnym "nie" dla braku danych (spec 0042 AC-9). */}
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
            {producer.inquiryResponseTimeLabel && (
              <Text tone="muted" className="text-data">
                {t("inquiryResponseTime", { label: producer.inquiryResponseTimeLabel })}
              </Text>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
