import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Container, Heading, Stack, Text } from "@/components/ui";

// Strona 404 dla grupy tras klienta (np. wyłączony /plot, spec 0082 AC-6).
export default async function CustomerNotFound() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("NotFoundPage")]);

  return (
    <Container className="py-brand-7">
      <Stack gap={3} className="mx-auto max-w-xl items-start">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text surface="v5" tone="muted">
          {t("body")}
        </Text>
        <Link
          href={`/${locale}`}
          className="focus-ring inline-flex items-center rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
        >
          {t("homeLink")}
        </Link>
      </Stack>
    </Container>
  );
}
