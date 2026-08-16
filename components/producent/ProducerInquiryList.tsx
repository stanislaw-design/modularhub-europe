import { Card, Heading, Stack, Text } from "@/components/ui";
import type { Country, Project, ProducerInquiry } from "@/lib/data/types";
import { ProducerInquiryRow } from "./ProducerInquiryRow";

interface ProducerInquiryListProps {
  locale: string;
  inquiries: ProducerInquiry[];
  projects: Project[];
  countries: Country[];
}

export function ProducerInquiryList({ locale, inquiries, projects, countries }: ProducerInquiryListProps) {
  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Heading level="h1">Zapytania i oferty</Heading>
        <Text variant="bodyL" tone="muted" measure>
          Przychodzące zapytania od klientów. Każde zapytanie otwiera formularz oferty w tym samym
          szablonie co u wszystkich producentów — pole transportu jest wypełnione automatycznie i tylko
          do odczytu.
        </Text>
      </Stack>

      {inquiries.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">Brak zapytań — pojawią się tu wiadomości od klientów zainteresowanych projektem.</Text>
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
