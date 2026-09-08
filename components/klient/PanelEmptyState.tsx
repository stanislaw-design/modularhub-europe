import { getTranslations } from "next-intl/server";
import { Button, Card, Heading, Text } from "@/components/ui";

interface PanelEmptyStateProps {
  locale: string;
  title: string;
  description: string;
}

// Pusta lista, wspólna dla /klient/panel/ulubione i /klient/panel/zapytania
// (spec 0024 AC-11): przyjazny komunikat z linkiem powrotnym do /wyniki,
// nigdy błąd ani pusta strona. title/description are already resolved strings
// from the owning page (their copy differs per screen), so only the shared
// CTA lives in this component's own namespace.
export async function PanelEmptyState({ locale, title, description }: PanelEmptyStateProps) {
  const t = await getTranslations("PanelEmptyState");
  return (
    <Card padding="lg" surface="v5" className="flex flex-col items-center gap-brand-2 py-brand-5 text-center">
      <Heading level="h2" surface="v5">
        {title}
      </Heading>
      <Text tone="muted" surface="v5" measure className="mx-auto">
        {description}
      </Text>
      <Button as="a" href={`/${locale}/klient/wyniki`} variant="secondary" surface="v5">
        {t("browseHomes")}
      </Button>
    </Card>
  );
}
