import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Heading, Text } from "@/components/ui";

interface OutdoorTvPartnerSectionProps {
  producerName: string;
  description?: string;
  photoUrl?: string | null;
}

// Reużywa producer.description i document.purpose 'producer_photo', oba
// generyczne (spec 0056 AC-9, AC-10), dostępne dla każdego producenta, nie
// tylko MirageVision. Bez opisu i bez zdjęcia sekcja nie renderuje się w
// ogóle (spec 0056 AC-4); samo zdjęcie albo sam opis wystarczą do pokazania
// sekcji.
export async function OutdoorTvPartnerSection({ producerName, description, photoUrl }: OutdoorTvPartnerSectionProps) {
  if (!description && !photoUrl) return null;

  const t = await getTranslations("OutdoorTvPage");

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("partnerHeading")}
      </Heading>
      <div className="flex flex-col gap-brand-4 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4 sm:flex-row sm:items-start">
        {photoUrl && (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-v5-card">
            <Image src={photoUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-brand-2">
          <span className="font-display text-h3 font-bold text-brand-v5-ink">{producerName}</span>
          {description && (
            <Text tone="muted" surface="v5">
              {description}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
