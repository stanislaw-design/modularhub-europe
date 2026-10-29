import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProducerGroupManager } from "@/components/internal/ProducerGroupManager";
import { Heading, Stack } from "@/components/ui";
import { getCustomProducerGroup } from "@/lib/producer-groups";

// Spec 0077 część B AC-23, AC-24: szczegół własnej grupy. Ten sam inline wzorzec sesji co pozostałe ekrany /internal.
export default async function InternalProducerGroupPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/producer-groups/${id}`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  // Identyfikator spoza formatu uuid to zwykły "nie znaleziono", nie błąd zapytania.
  const group = /^[0-9a-f-]{36}$/i.test(id) ? await getCustomProducerGroup(id) : null;
  if (!group) notFound();

  return (
    <Stack gap={5}>
      <div>
        <Link href={`/${locale}/internal/producer-groups`} className="focus-ring rounded-data text-brand-passage-blue underline">
          Wróć do grup producentów
        </Link>
      </div>
      <Heading level="h1">{group.name}</Heading>
      <ProducerGroupManager
        locale={locale}
        group={{ id: group.id, name: group.name, description: group.description }}
        members={group.members}
      />
    </Stack>
  );
}
