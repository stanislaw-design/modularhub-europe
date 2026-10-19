import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { DataText, Heading, ScrollReveal, Text } from "@/components/ui";

interface ComplianceEngineShowcaseProps {
  locale: string;
}

const EXAMPLE_SCORE = 92;

// One hard-coded illustrative example (not real EligibilityByCountry data,
// spec 0015 AC-6) — deliberately styled as a technology surface so Compliance
// Engine™ reads as a real competitive advantage, not one of four
// interchangeable benefit tiles. Full-bleed night band (same breakout as Hero),
// pinned v5-night/v5-paper so it stays dark in both themes. Each check line
// says what is compared, never a concrete regulation value, so the example
// can't be read as a statement about real law. Status text always renders in
// the light ink; only the paired icon carries the status color, so the state
// is never color-only. The small print frames results as an orientational
// check, not legal advice.
export async function ComplianceEngineShowcase({ locale }: ComplianceEngineShowcaseProps) {
  const t = await getTranslations("ComplianceEngineShowcase");
  const checklist = [
    { label: t("checklistConstruction"), detail: t("detailConstruction"), status: "ok" as const },
    { label: t("checklistInsulation"), detail: t("detailInsulation"), status: "ok" as const },
    { label: t("checklistVentilation"), detail: t("detailVentilation"), status: "ok" as const },
    { label: t("checklistDocumentation"), detail: t("detailDocumentation"), status: "ok" as const },
    { label: t("checklistPermit"), detail: t("detailPermit"), status: "warning" as const },
  ];
  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <section className="full-bleed my-brand-5 bg-brand-v5-night py-brand-7 text-brand-v5-paper">
      <div className="mx-auto grid max-w-[2000px] grid-cols-1 gap-brand-5 px-[3%] lg:grid-cols-12 lg:gap-brand-6">
        <div className="flex flex-col gap-brand-3 lg:col-span-5">
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
          <ol className="mt-brand-1 flex flex-col">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-brand-2 border-t border-brand-v5-paper/15 py-brand-2">
                <DataText className="w-6 shrink-0 text-body font-semibold text-brand-v5-amber">{index + 1}</DataText>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body font-semibold">{step.title}</span>
                  <span className="text-data text-brand-v5-paper/70">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
          <Text surface="v5" className="text-data !text-brand-v5-paper/60">
            {t("disclaimer")}
          </Text>
        </div>
        <div className="lg:col-span-7">
          <ScrollReveal>
            <div
              role="group"
              aria-label={t("exampleBadge")}
              className="flex flex-col gap-brand-3 rounded-v5-panel border border-brand-v5-paper/15 bg-brand-v5-paper/5 p-brand-3 sm:p-brand-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-brand-1">
                <span className="w-fit rounded-v5-pill border border-brand-v5-paper/30 px-brand-2 py-0.5 text-label font-semibold uppercase tracking-[0.08em]">
                  {t("exampleBadge")}
                </span>
                <span className="text-data text-brand-v5-paper/70">
                  {t("coverageLabel")}: {t("coverage")}
                </span>
              </div>
              <div className="flex items-end justify-between gap-brand-2">
                <div className="flex flex-col gap-0.5">
                  <Text surface="v5" className="text-[clamp(1.5rem,2.2vw,2.25rem)] leading-tight font-semibold !text-brand-v5-paper">
                    Nordic 126
                  </Text>
                  <Text surface="v5" className="text-data !text-brand-v5-paper/70">
                    {t("exampleLocation")}
                  </Text>
                </div>
                <div className="flex flex-col items-end">
                  <DataText className="text-[clamp(2.25rem,3.4vw,3.5rem)] leading-none font-semibold text-brand-v5-amber">
                    {EXAMPLE_SCORE}%
                  </DataText>
                  <Text surface="v5" className="text-data !text-brand-v5-paper/70">
                    {t("complianceSuffix")}
                  </Text>
                </div>
              </div>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-v5-pill bg-brand-v5-paper/15">
                <div className="h-full rounded-v5-pill bg-brand-v5-amber" style={{ width: `${EXAMPLE_SCORE}%` }} />
              </div>
              <ul className="flex flex-col divide-y divide-brand-v5-paper/15 border-t border-brand-v5-paper/15">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center justify-between gap-brand-2 py-brand-2 ${
                      item.status === "warning" ? "bg-brand-v5-amber/10 px-brand-2" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="text-body font-semibold">{item.label}</span>
                      <span className="text-data text-brand-v5-paper/65">{item.detail}</span>
                    </div>
                    {item.status === "ok" ? (
                      <span className="flex shrink-0 items-center gap-1 text-data">
                        <CheckCircle2 className="size-5 text-status-approved" aria-hidden="true" />
                        {t("statusOk")}
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-data">
                        <AlertTriangle className="size-5 text-status-conditional" aria-hidden="true" />
                        {t("statusWarning")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/results`}
                className="focus-ring inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
              >
                {t("checkHouse")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
