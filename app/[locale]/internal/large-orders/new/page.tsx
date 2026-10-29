import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateRequestOnBehalfForm } from "@/components/internal/CreateRequestOnBehalfForm";
import { Heading, Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getPublishedProductOptionsForAdmin } from "@/lib/db/queries";

// Spec 0070 AC-20: doradca składa zapytanie w imieniu klienta, który zadzwonił lub
// napisał. Ten sam inline wzorzec sesji co pozostałe ekrany /internal (internal/AGENTS.md).
export default async function InternalNewLargeOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/large-orders/new`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [countries, products] = await Promise.all([getCountries(), getPublishedProductOptionsForAdmin()]);

  return (
    <Stack gap={5}>
      <div>
        <Link href={`/${locale}/internal/large-orders`} className="focus-ring rounded-data text-brand-passage-blue underline">
          Wróć do listy dużych zamówień
        </Link>
      </div>
      <Heading level="h1">Złóż zapytanie w imieniu klienta</Heading>
      <Text tone="muted">
        Zamawiasz sam jako ModularHub?{" "}
        <Link href={`/${locale}/internal/large-orders/new-own`} className="focus-ring rounded-data text-brand-passage-blue underline">
          Załóż projekt własny
        </Link>
        .
      </Text>
      <Text tone="muted">
        Klient dostanie mail w wybranym języku z linkiem do logowania. Zapytanie trafi do dopasowanych producentów tak
        samo jak zapytanie złożone przez klienta, a limit trzech aktywnych zapytań na adres e mail obowiązuje także tutaj.
      </Text>
      <CreateRequestOnBehalfForm
        locale={locale}
        countries={countries.map((country) => ({ code: country.code, name: country.name }))}
        products={products}
      />
    </Stack>
  );
}
