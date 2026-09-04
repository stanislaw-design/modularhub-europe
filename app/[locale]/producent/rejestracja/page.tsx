import { Container, Stack } from "@/components/ui";
import { ProducerRegistrationForm } from "@/components/auth/ProducerRegistrationForm";
import { getCountries } from "@/lib/data/countries";

export default async function ProducentRejestracjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ locale }, { callbackUrl }, countries] = await Promise.all([
    params,
    searchParams,
    getCountries(),
  ]);
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : `/${locale}/producent`;

  return (
    <Container className="py-brand-6">
      <Stack gap={5} className="mx-auto max-w-md">
        <ProducerRegistrationForm locale={locale} callbackUrl={safeCallbackUrl} countries={countries} />
      </Stack>
    </Container>
  );
}
