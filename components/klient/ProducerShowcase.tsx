import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Heading, Text } from "@/components/ui";
import type { Producer } from "@/lib/data/types";
import { sortVerifiedProducers } from "@/lib/verified-producers";
import { ProducerShowcaseCard } from "./ProducerShowcaseCard";

interface ProducerShowcaseProps {
  producers: Producer[];
  locale: string;
}

const MAX_PRODUCERS = 8;

// Sekcja obiecuje weryfikację, więc pokazuje wyłącznie zweryfikowanych
// producentów (verified), najpierw tych z największą liczbą oddanych domów,
// potem z największą liczbą modeli. Poziomy pas z przyciąganiem do kart
// (scroll-snap), bez JS. Pusta lista renderuje nic, nie sam nagłówek
// (spec 0073 AC-9).
export async function ProducerShowcase({ producers, locale }: ProducerShowcaseProps) {
  const shown = sortVerifiedProducers(producers).slice(0, MAX_PRODUCERS);
  if (shown.length === 0) return null;
  const t = await getTranslations("ProducerShowcase");
  return (
    <section className="full-bleed py-brand-7">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-4 px-[3%]">
        <div className="flex flex-wrap items-end justify-between gap-brand-3">
          <div className="flex flex-col gap-1">
            <Heading level="h2">{t("heading")}</Heading>
            <Text tone="muted">{t("subheading")}</Text>
          </div>
          <Link
            href={`/${locale}/producers`}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-v5-pill border border-brand-v5-ink/25 px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-ink transition-colors hover:bg-brand-v5-ink/5"
          >
            {t("viewAll")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="scrollbar-brand -mx-[3%] flex snap-x snap-mandatory gap-brand-4 overflow-x-auto scroll-px-[3%] px-[3%] pb-brand-2">
          {shown.map((producer) => (
            <li
              key={producer.id}
              className="min-w-0 shrink-0 basis-[80%] snap-start sm:basis-[45%] lg:basis-[calc((100%-3*2rem)/4)] xl:basis-[calc((100%-4*2rem)/5)]"
            >
              <ProducerShowcaseCard producer={producer} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
