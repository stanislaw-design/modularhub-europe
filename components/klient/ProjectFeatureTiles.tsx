import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";

interface ProjectFeatureTilesProps {
  features?: string[];
}

// Krótka lista cech (np. karta produktu MirageVision) jako osobne kafelki nad
// "Specyfikacja techniczna" (spec 0056 Follow-up) — pierwsze, szybko czytelne
// wrażenie, zanim klient dojdzie do gęstszej tabeli specyfikacji. Puste lub
// brak → sekcja nie renderuje się (ten sam wzorzec co reszta strony, AC-4).
//
// Promowany z OutdoorTvFeatures (spec 0061 Build plan zadanie 6): drugi
// katalogowy route (/sauna/[slug]) potrzebuje tej samej sekcji, więc żyje
// teraz pod własną, dzieloną nazwą/namespace'em zamiast kopii pod outdoor-tv.
// Zachowanie na /outdoor-tv/[slug] bez zmian (ten sam string, przeniesiony z
// namespace'u OutdoorTvPage do własnego ProjectFeatureTiles).
export async function ProjectFeatureTiles({ features }: ProjectFeatureTilesProps) {
  const entries = features?.filter((feature) => feature.trim().length > 0) ?? [];
  if (entries.length === 0) return null;

  const t = await getTranslations("ProjectFeatureTiles");

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("featuresHeading")}
      </Heading>
      <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((feature) => (
          <div
            key={feature}
            className="flex items-start gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-approved" aria-hidden="true" />
            <Text as="p" surface="v5" className="font-semibold leading-snug">
              {feature}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
