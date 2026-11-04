import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { FilterGroup, FilterLink } from "@/components/internal/FilterChips";
import { ContactsSection } from "@/components/internal/conversations/ContactsSection";
import { EntryForm } from "@/components/internal/conversations/EntryForm";
import { EntryList } from "@/components/internal/conversations/EntryList";
import { PartnerArchiveControl } from "@/components/internal/conversations/PartnerArchiveControl";
import { dateToWarsawLocal } from "@/lib/conversations/time";
import { formatDateTime, formatDueDate } from "@/components/internal/conversations/format";
import { PartnerForm } from "@/components/internal/conversations/PartnerForm";
import { TaskStatusPill, ThreadStatusPill } from "@/components/internal/conversations/shared";
import { TaskForm, TaskRowActions } from "@/components/internal/conversations/TaskControls";
import { ThreadCreateForm } from "@/components/internal/conversations/ThreadControls";
import { Heading, Text } from "@/components/ui";
import { ENTRY_CHANNEL_LABELS, ENTRY_DIRECTION_LABELS, PARTNER_KIND_LABELS } from "@/lib/conversations/constants";
import { getPartnerCard, getUserLabels, listActiveAdmins, listCountries } from "@/lib/conversations/queries";
import { CASE_TEMPLATES } from "@/lib/conversations/templates";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Karta firmy (spec 0080 AC-16): osoby, sprawy (otwarte lub wszystkie), dziennik (filtr po sprawie) i zadania.
export default async function ConversationsPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ threads?: string; thread?: string }>;
}) {
  const { locale, id } = await params;
  const { threads: threadsParam, thread: threadParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/conversations/partners/${id}`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }
  if (!UUID_RE.test(id)) notFound();

  const threadFilter = threadParam && UUID_RE.test(threadParam) ? threadParam : undefined;
  const card = await getPartnerCard(id, threadFilter);
  if (!card) notFound();

  const [admins, countries] = await Promise.all([listActiveAdmins(), listCountries().catch(() => [])]);
  const labels = await getUserLabels([
    ...card.entries.map((entry) => entry.authorUserId),
    ...card.threads.map((thread) => thread.ownerUserId),
    ...card.tasks.flatMap((task) => (task.assigneeUserId ? [task.assigneeUserId] : [])),
  ]).catch(() => new Map<string, { name: string; active: boolean }>());
  const labelOf = (userId: string) => {
    const label = labels.get(userId);
    return label ? (label.active ? label.name : `${label.name} (nieaktywny administrator)`) : "nieznany";
  };

  const showAllThreads = threadsParam === "all";
  const threads = showAllThreads ? card.threads : card.threads.filter((thread) => thread.status !== "closed");
  const openThreads = card.threads.filter((thread) => thread.status !== "closed");
  const adminChoices = admins.map((admin) => ({ id: admin.id, name: admin.name }));
  const contactChoices = card.contacts.map((contact) => ({ id: contact.id, name: contact.name }));
  const { partner } = card;

  return (
    <div className="flex flex-col gap-brand-6">
      <header className="flex flex-col gap-brand-1">
        <Link href={`/${locale}/internal/conversations/partners`} className="text-data text-brand-passage-blue underline">
          Wszystkie firmy
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-brand-3">
          <Heading level="h2">{partner.name}</Heading>
          <PartnerArchiveControl partnerId={partner.id} archived={partner.archivedAt !== null} />
        </div>
        <p className="text-body text-brand-technical-graphite">
          {PARTNER_KIND_LABELS[partner.kind]}
          {partner.countryName ? ` · ${partner.countryName}` : ""}
          {partner.archivedAt ? " · archiwalna" : ""}
          {partner.website ? (
            <>
              {" · "}
              <a href={partner.website} target="_blank" rel="noreferrer" className="underline">
                {partner.website}
              </a>
            </>
          ) : null}
        </p>
        {card.producer && (
          <p className="text-data text-brand-technical-graphite">
            {card.producer.available
              ? `Konto producenta: NIP ${card.producer.nip}, weryfikacja: ${card.producer.verificationStatus}`
              : "Konto producenta niedostępne"}
          </p>
        )}
      </header>

      <details className="rounded-data border border-brand-steel/60 p-brand-3">
        <summary className="focus-ring cursor-pointer text-body font-medium">Edytuj dane firmy</summary>
        <div className="mt-brand-3">
          <PartnerForm
            locale={locale}
            countries={countries}
            partnerId={partner.id}
            initial={{
              name: partner.name,
              kind: partner.kind,
              website: partner.website,
              countryCode: partner.countryCode,
              tags: partner.tags,
              notes: partner.notes,
            }}
          />
        </div>
      </details>
      {partner.notes && <p className="whitespace-pre-wrap text-body">{partner.notes}</p>}

      <section aria-labelledby="contacts" className="flex flex-col gap-brand-3">
        <Heading level="h3">
          <span id="contacts">Osoby kontaktowe</span>
        </Heading>
        <ContactsSection partnerId={partner.id} contacts={card.contacts} />
      </section>

      <section aria-labelledby="threads" className="flex flex-col gap-brand-3">
        <div className="flex flex-wrap items-center justify-between gap-brand-3">
          <Heading level="h3">
            <span id="threads">Sprawy</span>
          </Heading>
          <FilterGroup label="Pokaż">
            <FilterLink href={selfHref} active={!showAllThreads} label="Otwarte" />
            <FilterLink href={`${selfHref}?threads=all`} active={showAllThreads} label="Wszystkie" />
          </FilterGroup>
        </div>
        {threads.length === 0 ? (
          <Text tone="muted">Brak spraw.</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel/50 rounded-data border border-brand-steel/60">
            {threads.map((thread) => (
              <li key={thread.id} className="flex flex-wrap items-center justify-between gap-brand-3 p-brand-3">
                <div>
                  <Link href={`/${locale}/internal/conversations/threads/${thread.id}`} className="text-body font-medium underline">
                    {thread.title}
                  </Link>
                  <p className="text-data text-brand-technical-graphite">Właściciel: {labelOf(thread.ownerUserId)}</p>
                </div>
                <ThreadStatusPill status={thread.status} />
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-data border border-brand-steel/60 p-brand-3">
          <summary className="focus-ring cursor-pointer text-body font-medium">Nowa sprawa</summary>
          <div className="mt-brand-3">
            <ThreadCreateForm
              locale={locale}
              partnerId={partner.id}
              admins={adminChoices}
              defaultOwnerId={session.user.id}
              templates={CASE_TEMPLATES.map((template) => ({ key: template.key, name: template.name, taskCount: template.tasks.length }))}
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="tasks" className="flex flex-col gap-brand-3">
        <Heading level="h3">
          <span id="tasks">Zadania</span>
        </Heading>
        {card.tasks.length === 0 ? (
          <Text tone="muted">Brak zadań.</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel/50 rounded-data border border-brand-steel/60">
            {card.tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-start justify-between gap-brand-3 p-brand-3">
                <div className="min-w-0">
                  <p className="text-body font-medium">{task.title}</p>
                  <p className="text-data text-brand-technical-graphite">
                    {task.assigneeKind === "user"
                      ? `Administrator: ${task.assigneeUserId ? labelOf(task.assigneeUserId) : "brak"}`
                      : `Strona zewnętrzna${task.externalContactName ? `: ${task.externalContactName}` : ""}`}
                    {task.dueDate ? ` · termin ${formatDueDate(task.dueDate)}` : ""}
                    {task.threadTitle ? ` · ${task.threadTitle}` : ""}
                  </p>
                  <div className="mt-brand-1">
                    <TaskStatusPill status={task.status} />
                  </div>
                </div>
                <TaskRowActions
                  taskId={task.id}
                  status={task.status}
                  edit={{ partnerId: partner.id, admins: adminChoices, contacts: contactChoices, defaultUserId: session.user.id, task }}
                />
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-data border border-brand-steel/60 p-brand-3">
          <summary className="focus-ring cursor-pointer text-body font-medium">Nowe zadanie</summary>
          <div className="mt-brand-3">
            <TaskForm
              partnerId={partner.id}
              admins={adminChoices}
              contacts={contactChoices}
              defaultUserId={session.user.id}
              threads={openThreads.map((thread) => ({ id: thread.id, title: thread.title }))}
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="journal" className="flex flex-col gap-brand-3">
        <div className="flex flex-wrap items-center justify-between gap-brand-3">
          <Heading level="h3">
            <span id="journal">Dziennik rozmów</span>
          </Heading>
          {card.threads.length > 0 && (
            <FilterGroup label="Sprawa">
              <FilterLink href={selfHref} active={!threadFilter} label="Wszystkie" />
              {card.threads.map((thread) => (
                <FilterLink key={thread.id} href={`${selfHref}?thread=${thread.id}`} active={threadFilter === thread.id} label={thread.title} />
              ))}
            </FilterGroup>
          )}
        </div>
        <div className="rounded-data border border-brand-steel/60 p-brand-3">
          <EntryForm
            partnerId={partner.id}
            contacts={contactChoices}
            threads={openThreads.map((thread) => ({ id: thread.id, title: thread.title }))}
          />
        </div>
        {card.entries.length === 0 ? (
          <Text tone="muted">Brak wpisów.</Text>
        ) : (
          <EntryList
            partnerId={partner.id}
            contacts={contactChoices}
            threads={card.threads.map((thread) => ({ id: thread.id, title: thread.title }))}
            entries={card.entries.map((entry) => ({
              id: entry.id,
              meta: [
                `${formatDateTime(entry.occurredAt)} · ${ENTRY_DIRECTION_LABELS[entry.direction]} · ${ENTRY_CHANNEL_LABELS[entry.channel]}`,
                entry.contactName,
                entry.threadTitle,
                `${labelOf(entry.authorUserId)}${entry.source === "bot" ? " (bot)" : ""}`,
                entry.editedAt ? "edytowano" : null,
              ]
                .filter(Boolean)
                .join(" · "),
              body: entry.body,
              threadId: entry.threadId,
              contactId: entry.contactId,
              occurredAtLocal: dateToWarsawLocal(entry.occurredAt),
              direction: entry.direction,
              channel: entry.channel,
            }))}
          />
        )}
      </section>
    </div>
  );
}
