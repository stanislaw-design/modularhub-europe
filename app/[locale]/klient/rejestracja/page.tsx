import { Container, Stack } from "@/components/ui";
import { ClientRegistrationForm } from "@/components/auth/ClientRegistrationForm";

export default async function KlientRejestracjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ locale }, { callbackUrl }] = await Promise.all([params, searchParams]);
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : `/${locale}/klient`;

  return (
    <Container className="py-brand-6">
      <Stack gap={5} className="mx-auto max-w-md">
        <ClientRegistrationForm locale={locale} callbackUrl={safeCallbackUrl} />
      </Stack>
    </Container>
  );
}
