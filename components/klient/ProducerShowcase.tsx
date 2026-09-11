import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import type { Producer } from "@/lib/data/types";
import { ProducerCard } from "./ProducerCard";

interface ProducerShowcaseProps {
  producers: Producer[];
}

// Replaces the scrolling name marquee (TrustedProducers, spec 0014 AC-8)
// with real cards — one per producer entity (spec 0015 AC-9). "Zobacz
// wszystkich producentów" stays disabled: no producer catalog page exists
// yet, same as today.
export async function ProducerShowcase({ producers }: ProducerShowcaseProps) {
  const t = await getTranslations("ProducerShowcase");
  return (
    <section className="py-brand-7">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-wrap items-baseline justify-between gap-brand-2">
          <div className="flex flex-col gap-1">
            <Heading level="h2">{t("heading")}</Heading>
            <Text tone="muted">{t("subheading")}</Text>
          </div>
          <button
            type="button"
            disabled
            className="shrink-0 rounded-v5-pill border border-brand-v5-line px-brand-3 py-brand-1 text-body font-medium text-brand-v5-ink disabled:cursor-default disabled:opacity-60"
          >
            {t("viewAllButton")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-3">
          {producers.map((producer) => (
            <ProducerCard key={producer.id} producer={producer} />
          ))}
        </div>
      </div>
    </section>
  );
}
