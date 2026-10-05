import { getTranslations } from "next-intl/server";
import { GuestClaimButton } from "@/components/klient/GuestClaimButton";
import { Container, Heading, Stack, Text } from "@/components/ui";

// Spec 0066 AC-7: strona z jednym przyciskiem. Samo wejście w link niczego nie
// wysyła (skaner poczty nie uruchomi akcji) i nie pokazuje żadnych danych
// sprawy, także dla nieznanego identyfikatora.
export default async function InquiryClaimPage({ params }: { params: Promise<{ locale: string; inquiryId: string }> }) {
  const { locale, inquiryId } = await params;
  const t = await getTranslations({ locale, namespace: "InquiryClaim" });

  return (
    <Container className="py-brand-6">
      <Stack gap={4} className="mx-auto max-w-lg">
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text surface="v5">{t("body")}</Text>
        <GuestClaimButton inquiryId={inquiryId} />
      </Stack>
    </Container>
  );
}
