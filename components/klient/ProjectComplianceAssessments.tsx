import { BadgeCheck, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Heading, StatusPill, Text } from "@/components/ui";
import type { ProductComplianceAssessment } from "@/lib/data/types";

interface ProjectComplianceAssessmentsProps {
  assessments: ProductComplianceAssessment[];
  locale: string;
}

// Spec 0065 AC-6: ocena projektu z przepisami kraju jest osobna od certyfikatów
// firmy. Zastrzeżenie to ten sam tekst co na ekranie Compliance Engine, bo wynik
// jest tym samym rodzajem orientacyjnej weryfikacji. Puste → sekcja nie renderuje się.
export async function ProjectComplianceAssessments({ assessments, locale }: ProjectComplianceAssessmentsProps) {
  if (assessments.length === 0) return null;
  const [t, tEngine] = await Promise.all([
    getTranslations("ProjectComplianceAssessments"),
    getTranslations("ComplianceEngineShowcase"),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <section className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <ul className="flex flex-col gap-brand-3">
        {assessments.map((assessment) => (
          <li
            key={`${assessment.countryCode}-${assessment.rule}`}
            className="flex flex-col gap-brand-1 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3"
          >
            <div className="flex flex-wrap items-center gap-brand-2">
              <Text as="span" surface="v5" className="text-body font-semibold">
                {t(`country.${assessment.countryCode}`)} · {assessment.rule.toUpperCase()}
              </Text>
              <StatusPill status={assessment.status}>{t(`status.${assessment.status}`)}</StatusPill>
            </div>
            <Text tone="muted" surface="v5" className="text-data">
              {assessment.reason}
            </Text>
            {assessment.confirmed && assessment.confirmedAt ? (
              <span className="flex items-center gap-brand-1">
                <BadgeCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                <Text as="span" tone="muted" surface="v5" className="text-data">
                  {t("confirmed", { date: dateFormatter.format(assessment.confirmedAt) })}
                </Text>
              </span>
            ) : (
              <span className="flex items-center gap-brand-1">
                <FileText className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
                <Text as="span" tone="muted" surface="v5" className="text-data">
                  {t("declared")}
                </Text>
              </span>
            )}
          </li>
        ))}
      </ul>
      <Text tone="muted" surface="v5" className="text-data">
        {tEngine("disclaimer")}
      </Text>
    </section>
  );
}
