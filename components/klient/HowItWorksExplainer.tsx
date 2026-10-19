import { ArrowRight, FileCheck2, KeyRound, Search, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Heading, ScrollReveal, Text } from "@/components/ui";

// Whole-journey explainer, distinct from ClosingCta's three-step summary
// (spec 0015 AC-7), which covers only the inquiry step, not this end to end
// path from search to handover. One rail with five nodes instead of five
// identical boxes: it reads as a path, and each step says who acts (the buyer,
// ModularHub or the producer), the thing a first-time cross-border buyer
// wants to know. Full-bleed like Hero.
export async function HowItWorksExplainer({ locale = "pl" }: { locale?: string }) {
  const t = await getTranslations("HowItWorksExplainer");
  const stages = [
    // Search (find) → SlidersHorizontal (compare specs) → FileCheck2 (echoes
    // Compliance Engine™'s own icon in ComplianceEngineShowcase, same
    // feature) → SendHorizontal (one inquiry out) → KeyRound (handover).
    { icon: Search, actor: t("actorYou") },
    { icon: SlidersHorizontal, actor: t("actorYou") },
    { icon: FileCheck2, actor: t("actorUs") },
    { icon: SendHorizontal, actor: t("actorYou") },
    { icon: KeyRound, actor: t("actorProducer") },
  ].map((stage, index) => ({
    ...stage,
    number: `0${index + 1}`,
    title: t(`stage${index + 1}Title`),
    description: t(`stage${index + 1}Description`),
  }));

  return (
    <section className="full-bleed py-brand-7">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-5 px-[3%]">
        <div className="flex flex-col gap-brand-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-brand-2">
            <Heading level="h2" surface="v5" className="text-[clamp(2rem,3.4vw,3.5rem)] leading-[1.05]">
              {t("heading")}
            </Heading>
            <Text tone="muted" surface="v5" className="text-body-l">
              {t("subheading")}
            </Text>
          </div>
          <Link
            href={`/${locale}/results`}
            className="focus-ring group inline-flex w-fit shrink-0 items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
          >
            {t("cta")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        <ol className="relative grid grid-cols-1 gap-brand-4 before:absolute before:top-7 before:bottom-7 before:left-7 before:w-px before:bg-brand-v5-line lg:grid-cols-5 lg:gap-brand-3 lg:before:inset-x-0 lg:before:top-7 lg:before:bottom-auto lg:before:h-px lg:before:w-auto">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <ScrollReveal
                key={stage.number}
                as="li"
                className="relative flex gap-brand-3 lg:flex-col lg:gap-brand-4"
                style={{ transitionDelay: `${Math.min(index * 90, 360)}ms` }}
              >
                <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground ring-8 ring-background">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1 lg:pr-brand-2">
                  <span className="font-mono text-data font-semibold text-brand-v5-muted">
                    {stage.number} · {stage.actor}
                  </span>
                  <Text as="span" surface="v5" className="text-[clamp(1.25rem,1.6vw,1.75rem)] leading-tight font-semibold">
                    {stage.title}
                  </Text>
                  <Text tone="muted" surface="v5">
                    {stage.description}
                  </Text>
                </div>
              </ScrollReveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
