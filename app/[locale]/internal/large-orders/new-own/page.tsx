import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreatePlatformProjectForm } from "@/components/internal/CreatePlatformProjectForm";
import { Heading, Stack, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import { getProducersForPlatformProject } from "@/lib/db/queries";
import { getPlatformContact } from "@/lib/platform-contact";
import { getCustomProducerGroup, getCustomProducerGroups, getReadyProducerGroups } from "@/lib/producer-groups";

// Spec 0077 AC-1: projekt własny ModularHub (zamawiającym jest platforma). Ten sam inline wzorzec
// sesji co pozostałe ekrany /internal (internal/AGENTS.md).
export default async function InternalNewPlatformProjectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/large-orders/new-own`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [countries, producers, readyGroups, customGroups] = await Promise.all([
    getCountries(),
    getProducersForPlatformProject(),
    getReadyProducerGroups(),
    getCustomProducerGroups(),
  ]);
  const customDetails = await Promise.all(customGroups.map((group) => getCustomProducerGroup(group.id)));
  const contact = getPlatformContact();

  return (
    <Stack gap={5}>
      <div>
        <Link href={`/${locale}/internal/large-orders`} className="focus-ring rounded-data text-brand-passage-blue underline">
          Wróć do listy dużych zamówień
        </Link>
      </div>
      <Heading level="h1">Załóż projekt własny ModularHub</Heading>
      <Text tone="muted">
        Zamawiającym jest ModularHub. Wskazani producenci widzą nasz wspólny kontakt od razu i mogą złożyć kilka wariantów
        oferty. Projekt nie ma klienta, zgody ani publikacji podsumowania, a limit trzech zapytań go nie dotyczy.
      </Text>
      <CreatePlatformProjectForm
        locale={locale}
        countries={countries.map((country) => ({ code: country.code, name: country.name }))}
        producers={producers}
        groups={[
          ...readyGroups.map((group) => ({ id: group.id, name: group.name, kind: "ready" as const, memberIds: group.members.filter((member) => member.eligible).map((member) => member.id) })),
          ...customGroups.map((group, index) => ({
            id: group.id,
            name: group.name,
            kind: "custom" as const,
            memberIds: (customDetails[index]?.members ?? []).filter((member) => member.eligible).map((member) => member.id),
          })),
        ]}
        contactConfigError={contact.ok ? null : contact.error}
      />
    </Stack>
  );
}
