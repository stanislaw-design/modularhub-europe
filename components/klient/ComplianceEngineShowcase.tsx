import { ArrowRight, FileCheck2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";

interface ComplianceEngineShowcaseProps {
  locale: string;
}

// Spec 0082 AC-12: pas nie obiecuje automatycznego werdyktu ani nie pokazuje
// przykładowego wyniku. Mówi tylko, że wstępną ocenę zgodności klient dostaje
// w ofercie podsumowującej. Pełna szerokość, nocny pas (jak Hero), przypięty do
// v5-night/v5-paper, więc jest ciemny w obu motywach.
export async function ComplianceEngineShowcase({ locale }: ComplianceEngineShowcaseProps) {
  const t = await getTranslations("ComplianceEngineShowcase");
  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <section className="full-bleed my-brand-5 bg-brand-v5-night py-brand-7 text-brand-v5-paper">
      <div className="mx-auto grid max-w-[2000px] grid-cols-1 gap-brand-5 px-[3%] lg:grid-cols-12 lg:gap-brand-6">
        <div className="flex flex-col gap-brand-3 lg:col-span-6">
          <span className="flex items-center gap-brand-1 text-label font-semibold tracking-[0.1em]">
            <FileCheck2 className="size-4" aria-hidden="true" />
            Compliance Engine™
          </span>
          <Heading level="h2" surface="v5" className="text-[clamp(2rem,3.4vw,3.5rem)] leading-[1.05] !text-brand-v5-paper">
            {t("headingBefore")}{" "}
            <span className="hero-underline">{t("headingUnderline")}</span>{" "}
            {t("headingAfter")}
          </Heading>
          <Text surface="v5" className="text-body-l !text-brand-v5-paper/80">
            {t("intro")}
          </Text>
          <Text surface="v5" className="text-data !text-brand-v5-paper/60">
            {t("disclaimer")}
          </Text>
        </div>
        <div className="flex flex-col gap-brand-3 lg:col-span-6">
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-brand-2 border-t border-brand-v5-paper/15 py-brand-3">
                <DataText className="w-6 shrink-0 text-body font-semibold text-brand-v5-amber">{index + 1}</DataText>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold">{step.title}</span>
                  <span className="text-data text-brand-v5-paper/70">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href={`/${locale}/results`}
            className="focus-ring inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
          >
            {t("checkHouse")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
