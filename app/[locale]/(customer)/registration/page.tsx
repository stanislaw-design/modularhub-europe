import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container, Stack } from "@/components/ui";
import { ClientRegistrationForm } from "@/components/auth/ClientRegistrationForm";
import { ProducerRegistrationForm } from "@/components/auth/ProducerRegistrationForm";
import { RegistrationRoleStep } from "@/components/auth/RegistrationRoleStep";
import { getCountries } from "@/lib/data/countries";

// Wspólny wizard rejestracji (spec 0040 Decision): jedna trasa, krok w
// parametrze URL `role`. Brak `role` -> krok 1 (wybór), `client`/`producer`
// -> właściwy formularz kroku 2. Domyślny callbackUrl różni się per rola
// (AC-4): `/${locale}` dla klienta (jak dziś), `/${locale}/producer/panel/project`
// dla producenta (spec 0032 AC-9) — nie mogą się zgubić przy scalaniu stron.
export default async function RegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string; callbackUrl?: string }>;
}) {
  const [{ locale }, { role, callbackUrl }] = await Promise.all([params, searchParams]);
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : undefined;

  if (role !== "client" && role !== "producer") {
    return (
      <Container className="py-brand-7">
        <Stack gap={5} className="mx-auto max-w-2xl">
          <RegistrationRoleStep locale={locale} callbackUrl={safeCallbackUrl} />
        </Stack>
      </Container>
    );
  }

  const t = await getTranslations("RegistrationRoleStep");
  const changeRoleHref = `/${locale}/registration${safeCallbackUrl ? `?callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : ""}`;

  if (role === "producer") {
    const [countries, resolvedCallbackUrl] = await Promise.all([
      getCountries(),
      Promise.resolve(safeCallbackUrl ?? `/${locale}/producer/panel/project`),
    ]);
    return (
      <Stack gap={3} className="mx-auto w-full max-w-lg lg:max-w-4xl">
        <ChangeRoleLink href={changeRoleHref} label={t("changeRole")} />
        <ProducerRegistrationForm locale={locale} callbackUrl={resolvedCallbackUrl} countries={countries} />
      </Stack>
    );
  }

  const resolvedCallbackUrl = safeCallbackUrl ?? `/${locale}`;
  return (
    <Stack gap={3} className="mx-auto w-full max-w-lg lg:max-w-4xl">
      <ChangeRoleLink href={changeRoleHref} label={t("changeRole")} />
      <ClientRegistrationForm locale={locale} callbackUrl={resolvedCallbackUrl} />
    </Stack>
  );
}

function ChangeRoleLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring flex w-fit items-center gap-1 rounded-data text-data font-medium text-brand-v5-muted transition-colors hover:text-brand-v5-ink"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
