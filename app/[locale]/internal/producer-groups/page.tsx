import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProducerGroupCreateForm } from "@/components/internal/ProducerGroupCreateForm";
import { Heading, Stack, Text } from "@/components/ui";
import { getCustomProducerGroups, getReadyProducerGroups } from "@/lib/producer-groups";

// Spec 0077 część B AC-23, AC-25: gotowe grupy po rodzinie produktu (tylko do odczytu, liczone na żywo)
// i własne grupy admina. Ten sam inline wzorzec sesji co pozostałe ekrany /internal (internal/AGENTS.md).
export default async function InternalProducerGroupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/producer-groups`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [ready, custom] = await Promise.all([getReadyProducerGroups(), getCustomProducerGroups()]);

  return (
    <Stack gap={5}>
      <Heading level="h1">Grupy producentów</Heading>
      <Text tone="muted">
        Grupy służą do wyboru odbiorców projektu własnego ModularHub. Wybór rozwija się do listy producentów w chwili założenia
        projektu i potem się nie zmienia. Producenci nie widzą grup.
      </Text>

      <section aria-label="Gotowe grupy" className="flex flex-col gap-brand-2">
        <Heading level="h2">
          Gotowe grupy (po rodzinie produktu)
        </Heading>
        <Text tone="muted">Producenci z co najmniej jednym opublikowanym produktem w rodzinie. Liczone na bieżąco, bez zapisu.</Text>
        <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
          {ready.map((group) => (
            <li key={group.id} className="px-brand-3 py-brand-2">
              <details>
                <summary className="focus-ring cursor-pointer text-body font-medium">
                  {group.name} <span className="font-normal text-brand-technical-graphite">({group.members.length})</span>
                </summary>
                {group.members.length === 0 ? (
                  <p className="mt-brand-2 text-body text-brand-technical-graphite">Brak producentów.</p>
                ) : (
                  <ul className="mt-brand-2 grid gap-brand-1 text-body sm:grid-cols-2">
                    {group.members.map((member) => (
                      <li key={member.id}>
                        {member.name} <span className="text-label text-brand-technical-graphite">({member.countryCode})</span>
                        {!member.eligible && <span className="ml-brand-1 text-label text-status-blocked">zablokowany</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Własne grupy" className="flex flex-col gap-brand-2">
        <Heading level="h2">
          Własne grupy
        </Heading>
        {custom.length === 0 ? (
          <Text tone="muted">Nie ma jeszcze własnych grup.</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel rounded-data border border-brand-steel">
            {custom.map((group) => (
              <li key={group.id} className="flex items-center justify-between gap-brand-3 px-brand-3 py-brand-2 text-body">
                <span>
                  <Link href={`/${locale}/internal/producer-groups/${group.id}`} className="focus-ring rounded-data font-medium text-brand-passage-blue underline">
                    {group.name}
                  </Link>
                  {group.description && <span className="block text-data text-brand-technical-graphite">{group.description}</span>}
                </span>
                <span className="text-brand-technical-graphite">
                  {group.memberCount} {group.memberCount === 1 ? "producent" : "producentów"}
                  {group.eligibleCount !== group.memberCount && ` (aktywnych: ${group.eligibleCount})`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Nowa grupa" className="flex flex-col gap-brand-2">
        <Heading level="h2">
          Nowa grupa
        </Heading>
        <ProducerGroupCreateForm locale={locale} />
      </section>
    </Stack>
  );
}
