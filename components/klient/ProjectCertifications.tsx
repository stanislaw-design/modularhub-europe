import { BadgeCheck, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import type { ProducerCertification } from "@/lib/data/types";

interface ProjectCertificationsProps {
  certifications?: ProducerCertification[];
  locale: string;
}

// Puste lub brak certifications → sekcja nie renderuje się w ogóle, żaden pusty
// placeholder (spec 0020 AC-4). Każdy wpis niesie stan tekstem i ikoną, nigdy
// samym kolorem (spec 0065 AC-5, AC-14): deklaracja producenta nie wygląda jak
// potwierdzenie platformy.
export async function ProjectCertifications({ certifications, locale }: ProjectCertificationsProps) {
  if (!certifications || certifications.length === 0) return null;
  const t = await getTranslations("ProjectCertifications");
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3">
      <Heading level="h3" surface="v5" className="text-body-l">
        {t("heading")}
      </Heading>
      <ul className="flex flex-col gap-brand-2">
        {certifications.map((certification) => (
          <li key={certification.name} className="flex flex-col gap-0.5">
            <Text as="span" surface="v5" className="text-data font-medium">
              {certification.name}
              {certification.issuer ? ` · ${certification.issuer}` : null}
            </Text>
            {certification.confirmed && certification.confirmedAt ? (
              <span className="flex items-center gap-brand-1">
                <BadgeCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                <Text as="span" tone="muted" surface="v5" className="text-data">
                  {t("confirmed", { date: dateFormatter.format(certification.confirmedAt) })}
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
    </div>
  );
}
