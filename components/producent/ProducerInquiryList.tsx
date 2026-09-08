import { getTranslations } from "next-intl/server";
import { Card, Heading, Stack, Text } from "@/components/ui";
import type { Country, Project, ProducerInquiry } from "@/lib/data/types";
import { ProducerInquiryRow } from "./ProducerInquiryRow";

interface ProducerInquiryListProps {
  locale: string;
  inquiries: ProducerInquiry[];
  projects: Project[];
  countries: Country[];
}

export async function ProducerInquiryList({ locale, inquiries, projects, countries }: ProducerInquiryListProps) {
  const t = await getTranslations("ProducerInquiryList");
  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text variant="bodyL" tone="muted" measure>
          {t("intro")}
        </Text>
      </Stack>

      {inquiries.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{t("emptyMessage")}</Text>
        </Card>
      ) : (
        <Stack gap={3}>
          {inquiries.map((inquiry) => {
            const project = projects.find((candidate) => candidate.id === inquiry.projectId);
            if (!project) return null;
            const countryName =
              countries.find((country) => country.code === inquiry.deliveryCountry)?.name ??
              inquiry.deliveryCountry;

            return (
              <ProducerInquiryRow
                key={inquiry.id}
                locale={locale}
                inquiry={inquiry}
                project={project}
                countryName={countryName}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
