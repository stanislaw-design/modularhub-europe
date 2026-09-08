import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataText, Text } from "@/components/ui";
import type { Country } from "@/lib/data/types";
import type { RegistrationDetails } from "@/lib/producer-registration";
import { PRODUCER_TECHNOLOGIES } from "@/lib/producer-technologies";

interface ProducerRegistrationBarProps {
  details: RegistrationDetails;
  countries: Country[];
}

export async function ProducerRegistrationBar({ details, countries }: ProducerRegistrationBarProps) {
  const t = await getTranslations("ProducerRegistrationBar");
  const countryNames = details.countries
    .map((code) => countries.find((country) => country.code === code)?.name ?? code)
    .join(", ");
  const technologyLabel =
    PRODUCER_TECHNOLOGIES.find((technology) => technology.value === details.technology)?.label ??
    details.technology;

  return (
    <div className="flex flex-wrap items-center gap-brand-2 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-2">
      <span className="inline-flex shrink-0 items-center gap-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
        {t("registeredBadge")}
      </span>
      <Text as="span" tone="muted">
        {t("nipLabel")} <DataText as="span">{details.nip}</DataText> · {countryNames} · {technologyLabel}
      </Text>
    </div>
  );
}
