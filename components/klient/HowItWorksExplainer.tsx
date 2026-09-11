import { FileCheck2, KeyRound, Search, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, Heading, ScrollReveal, Text } from "@/components/ui";

// Whole-journey explainer, distinct from ClosingCta's three-step summary
// (spec 0015 AC-7), which covers only the inquiry step, not this end to end
// path from search to handover.
export async function HowItWorksExplainer() {
  const t = await getTranslations("HowItWorksExplainer");
  const stages = [
    // Search (find) → SlidersHorizontal (compare specs) → FileCheck2 (echoes
    // Compliance Engine™'s own icon in ComplianceEngineShowcase, same
    // feature) → SendHorizontal (one inquiry out) → KeyRound (handover).
    { number: "1", icon: Search, title: t("stage1Title"), description: t("stage1Description") },
    {
      number: "2",
      icon: SlidersHorizontal,
      title: t("stage2Title"),
      description: t("stage2Description"),
    },
    {
      number: "3",
      icon: FileCheck2,
      title: t("stage3Title"),
      description: t("stage3Description"),
    },
    {
      number: "4",
      icon: SendHorizontal,
      title: t("stage4Title"),
      description: t("stage4Description"),
    },
    { number: "5", icon: KeyRound, title: t("stage5Title"), description: t("stage5Description") },
  ];

  return (
    <section className="py-brand-7">
      <div className="flex flex-col gap-brand-5">
        <div className="flex flex-col gap-brand-2">
          <Heading level="h2" surface="v5" className="text-h1">
            {t("heading")}
          </Heading>
          <Text tone="muted" surface="v5" className="text-body-l">
            {t("subheading")}
          </Text>
        </div>
        <ol className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-5">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <ScrollReveal
                key={stage.number}
                as="li"
                style={{ transitionDelay: `${Math.min(index * 90, 360)}ms` }}
              >
                <Card
                  surface="v5"
                  padding="lg"
                  className="group flex h-full flex-col gap-brand-3 transition-all duration-300 hover:-translate-y-1 hover:border-brand-v5-amber hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-body-l font-semibold text-brand-v5-muted">
                      0{stage.number}
                    </span>
                  </div>
                  <Text as="span" surface="v5" className="text-body-l font-semibold">
                    {stage.title}
                  </Text>
                  <Text tone="muted" surface="v5">
                    {stage.description}
                  </Text>
                </Card>
              </ScrollReveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
