import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Heading, ScrollReveal, Text } from "@/components/ui";

interface BulkOrdersShowcaseProps {
  locale: string;
}

interface TileContent {
  image: string;
  heading: string;
  subheading: string;
  points: [string, string, string];
  ctaLabel: string;
  ctaHref: string;
  signatureLine1: string;
  signatureLine2: string;
}

// Entry point into the B2B data model built in spec 0037 (project_request,
// submitProjectRequest): a hero-adjacent showcase with two photo tiles, not a
// third interchangeable benefit card, because it targets a different visitor
// (an investor or high-volume producer, not a retail buyer) with its own
// dedicated CTA. The producer tile intentionally points at the plain
// registration screen, not a capacity-profile form — that screen does not
// exist yet (spec 0038 Follow-up).
export async function BulkOrdersShowcase({ locale }: BulkOrdersShowcaseProps) {
  const t = await getTranslations("BulkOrdersShowcase");

  const tiles: TileContent[] = [
    {
      image: "/images/b2b/investor-background.png",
      heading: t("investorHeading"),
      subheading: t("investorSubheading"),
      points: [t("investorPoint1"), t("investorPoint2"), t("investorPoint3")],
      ctaLabel: t("investorCta"),
      // Aktualizacja spec 0038: kafel inwestora prowadzi teraz na ekran
      // przeglądania realnych projektów przed formularzem (AC-2), nie wprost
      // do pustego /project-request.
      ctaHref: `/${locale}/verified-manufacturers`,
      signatureLine1: t("investorSignatureLine1"),
      signatureLine2: t("investorSignatureLine2"),
    },
    {
      image: "/images/b2b/manufacturer-background-2x1.png",
      heading: t("producerHeading"),
      subheading: t("producerSubheading"),
      points: [t("producerPoint1"), t("producerPoint2"), t("producerPoint3")],
      ctaLabel: t("producerCta"),
      ctaHref: `/${locale}/producer/registration`,
      signatureLine1: t("producerSignatureLine1"),
      signatureLine2: t("producerSignatureLine2"),
    },
  ];

  return (
    <section className="py-brand-7">
      <div className="flex flex-col gap-brand-5">
        <div className="flex flex-col gap-brand-2">
          <Heading level="h2" surface="v5" className="text-h1">
            {t("heading")}
          </Heading>
          <Text tone="muted" surface="v5" className="text-body-l" measure>
            {t("subheading")}
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-2">
          {tiles.map((tile, index) => (
            <ScrollReveal key={tile.ctaHref} style={{ transitionDelay: `${index * 100}ms` }}>
              <Link
                href={tile.ctaHref}
                className="focus-ring group relative flex aspect-[2/1] w-full flex-col overflow-hidden rounded-v5-card transition-shadow hover:shadow-xl"
              >
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-brand-v5-ink/95 via-brand-v5-ink/55 to-brand-v5-ink/15"
                />
                <div className="relative flex h-full flex-col justify-between py-brand-4 pl-brand-3 pr-brand-4 sm:py-brand-5 sm:pl-brand-4 sm:pr-brand-5">
                  <div className="flex flex-col gap-0.5">
                    {/* Raw tags, not the Heading/Text primitives: tailwind-variants'
                        merge collapses a custom font-size token (text-h2) and a
                        custom color token (text-brand-v5-*) into one conflict
                        group and silently drops all but the last, so combining
                        both through tv() here loses either the size or the color.
                        Plain classes compile independently, same escape hatch
                        Hero.tsx already uses for its own headline. */}
                    <h3 className="font-display text-h2 font-semibold leading-tight text-brand-v5-surface [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
                      {tile.heading}
                    </h3>
                    <p className="font-display text-h2 font-bold leading-tight text-brand-v5-amber [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
                      {tile.subheading}
                    </p>
                  </div>
                  <div className="flex flex-col gap-brand-3">
                    <ul className="flex flex-col gap-1">
                      {tile.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-body text-brand-v5-surface/90">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-v5-amber" aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-end justify-between gap-brand-3">
                      <span className="inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-1.5 text-data font-semibold text-brand-v5-amber-foreground transition-colors group-hover:bg-brand-v5-amber-strong">
                        {tile.ctaLabel}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                      <div className="hidden flex-col items-end gap-0.5 text-right sm:flex">
                        <span className="text-label uppercase tracking-[0.08em] text-brand-v5-surface/60">
                          {tile.signatureLine1}
                        </span>
                        <span className="flex items-center gap-2 text-label uppercase tracking-[0.08em] text-brand-v5-surface/60">
                          <span className="h-px w-6 bg-brand-v5-surface/40" aria-hidden="true" />
                          {tile.signatureLine2}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
