import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";

// Whole-journey explainer, distinct from ClosingCta's three-step summary
// (spec 0015 AC-7), which covers only the inquiry step, not this end to end
// path from search to handover.
export async function HowItWorksExplainer() {
  const t = await getTranslations("HowItWorksExplainer");
  const stages = [
    { number: "1", title: t("stage1Title"), description: t("stage1Description") },
    { number: "2", title: t("stage2Title"), description: t("stage2Description") },
    { number: "3", title: t("stage3Title"), description: t("stage3Description") },
    { number: "4", title: t("stage4Title"), description: t("stage4Description") },
    { number: "5", title: t("stage5Title"), description: t("stage5Description") },
  ];

  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("heading")}</Heading>
          <Text tone="muted">{t("subheading")}</Text>
        </div>
        <ol className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-5">
          {stages.map((stage) => (
            <li key={stage.number} className="flex flex-col gap-brand-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-v5-amber font-mono text-body font-semibold text-brand-v5-amber-foreground">
                {stage.number}
              </span>
              <Text className="text-body-l font-semibold text-brand-v5-ink">{stage.title}</Text>
              <Text tone="muted">{stage.description}</Text>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
