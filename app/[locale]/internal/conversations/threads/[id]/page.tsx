import { and, asc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { EntryForm } from "@/components/internal/conversations/EntryForm";
import { formatDateTime, formatDueDate } from "@/components/internal/conversations/format";
import { TaskStatusPill, ThreadStatusPill } from "@/components/internal/conversations/shared";
import { TaskForm, TaskRowActions } from "@/components/internal/conversations/TaskControls";
import { EntryList } from "@/components/internal/conversations/EntryList";
import { CloseThreadControl, ThreadEditForm } from "@/components/internal/conversations/ThreadControls";
import { dateToWarsawLocal } from "@/lib/conversations/time";
import { Heading, Text } from "@/components/ui";
import { ENTRY_CHANNEL_LABELS, ENTRY_DIRECTION_LABELS, LINK_KIND_LABELS, type LinkKind } from "@/lib/conversations/constants";
import { getThreadCard, getUserLabels, listActiveAdmins } from "@/lib/conversations/queries";
import { getCaseTemplate } from "@/lib/conversations/templates";
import { db } from "@/lib/db/client";
import { crmContact } from "@/lib/db/schema";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Karta sprawy (spec 0080 AC-16): zadania, dziennik sprawy, właściciel, status wyliczony i zamknięcie.
export default async function ConversationsThreadPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/conversations/threads/${id}`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }
  if (!UUID_RE.test(id)) notFound();

  const card = await getThreadCard(id);
  if (!card) notFound();
  const { thread, tasks, entries } = card;

  const [admins, contacts] = await Promise.all([
    listActiveAdmins(),
    db
      .select({ id: crmContact.id, name: crmContact.name })
      .from(crmContact)
      .where(and(eq(crmContact.partnerId, thread.partnerId), isNull(crmContact.deletedAt)))
      .orderBy(asc(crmContact.createdAt)),
  ]);
  const labels = await getUserLabels([
    thread.ownerUserId,
    ...entries.map((entry) => entry.authorUserId),
    ...tasks.flatMap((task) => (task.assigneeUserId ? [task.assigneeUserId] : [])),
  ]).catch(() => new Map<string, { name: string; active: boolean }>());
  const labelOf = (userId: string) => {
    const label = labels.get(userId);
    return label ? (label.active ? label.name : `${label.name} (nieaktywny administrator)`) : "nieznany";
  };

  const closed = thread.status === "closed";
  const adminChoices = admins.map((admin) => ({ id: admin.id, name: admin.name }));
  const openTasks = tasks.filter((task) => task.status === "open");
  const template = thread.templateKey ? getCaseTemplate(thread.templateKey) : null;

  return (
    <div className="flex flex-col gap-brand-6">
      <header className="flex flex-col gap-brand-2">
        <Link href={`/${locale}/internal/conversations/partners/${thread.partnerId}`} className="text-data text-brand-passage-blue underline">
          {thread.partnerName}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-brand-3">
          <Heading level="h2">{thread.title}</Heading>
          <CloseThreadControl threadId={thread.id} closed={closed} openTasks={openTasks.map((task) => ({ id: task.id, title: task.title }))} />
        </div>
        <div className="flex flex-wrap items-center gap-brand-3 text-body text-brand-technical-graphite">
          <ThreadStatusPill status={thread.status} />
          <span>Właściciel: {labelOf(thread.ownerUserId)}</span>
          {template && <span>Szablon: {template.name}</span>}
          {thread.linkKind && <span>Powiązanie: {LINK_KIND_LABELS[thread.linkKind as LinkKind] ?? thread.linkKind}</span>}
        </div>
        <details className="mt-brand-2 rounded-data border border-brand-steel/60 p-brand-3">
          <summary className="focus-ring cursor-pointer text-body font-medium">Edytuj sprawę</summary>
          <div className="mt-brand-3">
            <ThreadEditForm
              threadId={thread.id}
              title={thread.title}
              ownerUserId={thread.ownerUserId}
              admins={adminChoices}
              link={thread.linkKind && thread.linkId ? { kind: thread.linkKind as LinkKind, id: thread.linkId } : null}
            />
          </div>
        </details>
      </header>

      <section aria-labelledby="tasks" className="flex flex-col gap-brand-3">
        <Heading level="h3">
          <span id="tasks">Zadania</span>
        </Heading>
        {tasks.length === 0 ? (
          <Text tone="muted">Brak zadań. Sprawa bez otwartego zadania ma status „Otwarta”.</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel/50 rounded-data border border-brand-steel/60">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-start justify-between gap-brand-3 p-brand-3">
                <div className="min-w-0">
                  <p className="text-body font-medium">{task.title}</p>
                  <p className="text-data text-brand-technical-graphite">
                    {task.assigneeKind === "user"
                      ? `Administrator: ${task.assigneeUserId ? labelOf(task.assigneeUserId) : "brak"}`
                      : `Strona zewnętrzna${task.externalContactName ? `: ${task.externalContactName}` : ""}`}
                    {task.dueDate ? ` · termin ${formatDueDate(task.dueDate)}` : ""}
                  </p>
                  <div className="mt-brand-1">
                    <TaskStatusPill status={task.status} />
                  </div>
                </div>
                <TaskRowActions
                  taskId={task.id}
                  status={task.status}
                  edit={{ partnerId: thread.partnerId, admins: adminChoices, contacts, defaultUserId: session.user.id, task }}
                />
              </li>
            ))}
          </ul>
        )}
        {closed ? (
          <Text tone="muted">Sprawa jest zamknięta. Otwórz ją ponownie, żeby dodać zadanie.</Text>
        ) : (
          <details className="rounded-data border border-brand-steel/60 p-brand-3">
            <summary className="focus-ring cursor-pointer text-body font-medium">Nowe zadanie</summary>
            <div className="mt-brand-3">
              <TaskForm
                partnerId={thread.partnerId}
                admins={adminChoices}
                contacts={contacts}
                defaultUserId={session.user.id}
                fixedThreadId={thread.id}
              />
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="journal" className="flex flex-col gap-brand-3">
        <Heading level="h3">
          <span id="journal">Dziennik sprawy</span>
        </Heading>
        <div className="rounded-data border border-brand-steel/60 p-brand-3">
          <EntryForm partnerId={thread.partnerId} contacts={contacts} fixedThreadId={thread.id} />
        </div>
        {entries.length === 0 ? (
          <Text tone="muted">Brak wpisów.</Text>
        ) : (
          <EntryList
            partnerId={thread.partnerId}
            contacts={contacts}
            fixedThreadId={thread.id}
            entries={entries.map((entry) => ({
              id: entry.id,
              meta: [
                `${formatDateTime(entry.occurredAt)} · ${ENTRY_DIRECTION_LABELS[entry.direction]} · ${ENTRY_CHANNEL_LABELS[entry.channel]}`,
                entry.contactName,
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
