import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { StarRating, Text } from "@/components/ui";
import type { CountryCode, Producer } from "@/lib/data/types";

const countryFlag: Record<CountryCode, string> = { PL: "🇵🇱", DE: "🇩🇪", NL: "🇳🇱" };
const countryLabel: Record<CountryCode, string> = { PL: "Polska", DE: "Niemcy", NL: "Holandia" };

interface ProducerCardProps {
  producer: Producer;
}

// No logo files exist for any mock producer, and inventing graphic logos for
// fictional companies risks reading as a real brand (spec 0014 AC-8's same
// concern, spec 0015 Feature design). The name renders as large, styled
// text instead of an image.
export function ProducerCard({ producer }: ProducerCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={producer.featuredPhotoUrl}
          alt={`Realizacja producenta ${producer.name}`}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover"
        />
        {producer.verified && (
          <span className="absolute right-brand-2 top-brand-2 flex items-center gap-1 rounded-v5-pill bg-brand-v5-surface/95 px-brand-2 py-1 text-data font-semibold text-brand-v5-ink shadow-sm">
            <BadgeCheck className="size-4 text-status-approved" aria-hidden="true" />
            Zweryfikowany przez ModularHub
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <div className="flex items-start justify-between gap-brand-2">
          <span className="font-display text-h3 font-bold text-brand-v5-ink">{producer.name}</span>
          <span
            className="shrink-0 text-h3"
            role="img"
            aria-label={`Kraj produkcji: ${countryLabel[producer.countryCode]}`}
          >
            {countryFlag[producer.countryCode]}
          </span>
        </div>
        <StarRating rating={producer.rating} reviewCount={producer.reviewCount} />
        <Text tone="muted" className="text-data">
          {producer.modelsCount} modeli · {producer.sizeRangeM2Min}–{producer.sizeRangeM2Max} m²
        </Text>
        <div className="mt-auto flex items-center gap-brand-1 border-t border-brand-v5-line pt-brand-2">
          <Text tone="muted" className="text-data">
            Dostawa:
          </Text>
          <ul className="flex items-center gap-1">
            {producer.deliveryCountries.map((code) => (
              <li key={code} className="text-body-l" role="img" aria-label={countryLabel[code]}>
                {countryFlag[code]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
