import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LargeOrderTonePill } from "@/components/internal/LargeOrderPills";
import { formatDueDate } from "@/components/internal/conversations/format";
import { TaskRowActions } from "@/components/internal/conversations/TaskControls";
import { Heading, Text } from "@/components/ui";
import type { TodaySection } from "@/lib/conversations/status";
import { getTodayView, type TodayTask } from "@/lib/conversations/queries";
import { CircleAlert, Hourglass, User } from "lucide-react";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const SECTIONS: { key: TodaySection; title: string; empty: string }[] = [
  { key: "toDo", title: "Do wykonania", empty: "Nie masz zadań z terminem." },
  { key: "waitingThem", title: "Czekamy na nich", empty: "Nie czekamy na nikogo z terminem." },
  { key: "noDueDate", title: "Bez terminu", empty: "Wszystkie otwarte zadania mają termin." },
];

// Ekran "Najbliższe" (spec 0080 AC-15): otwarte zadania w rozłącznych sekcjach, zawsze wszystkie zadania.
export default async function ConversationsTodayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/conversations`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const data = await getTodayView(session.user.id, "all").catch(() => null);

  return (
    <div className="flex flex-col gap-brand-5">
      <Heading level="h2" className="sr-only">
        Najbliższe
      </Heading>
      {!data ? (
        <Text tone="muted">Zadania chwilowo niedostępne. Spróbuj odświeżyć stronę.</Text>
      ) : (
        SECTIONS.map((section) => {
          const tasks = data.view[section.key];
          return (
            <section key={section.key} aria-labelledby={`today-${section.key}`} className="flex flex-col gap-brand-2">
              <Heading level="h3">
                <span id={`today-${section.key}`}>
                  {section.title} ({tasks.length})
                </span>
              </Heading>
              {tasks.length === 0 ? (
                <Text tone="muted">{section.empty}</Text>
              ) : (
                <ul className="flex flex-col divide-y divide-brand-steel/50 rounded-data border border-brand-steel/60">
                  {tasks.map((task) => (
                    <TodayRow key={task.id} task={task} today={data.today} locale={locale} />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function TodayRow({ task, today, locale }: { task: TodayTask; today: string; locale: string }) {
  const base = `/${locale}/internal/conversations`;
  const overdue = task.dueDate !== null && task.dueDate < today;
  return (
    <li className="flex flex-wrap items-center justify-between gap-brand-3 p-brand-3">
      <div className="min-w-0">
        <p className="text-body font-medium">{task.title}</p>
        <p className="text-data text-brand-technical-graphite">
          <Link href={`${base}/partners/${task.partnerId}`} className="underline">
            {task.partnerName}
          </Link>
          {task.threadId && (
            <>
              {" · "}
              <Link href={`${base}/threads/${task.threadId}`} className="underline">
                {task.threadTitle}
              </Link>
            </>
          )}
        </p>
        <div className="mt-brand-1 flex flex-wrap items-center gap-brand-2 text-label">
          {task.assigneeKind === "external" ? (
            <LargeOrderTonePill tone="sky" icon={Hourglass}>
              Strona zewnętrzna
            </LargeOrderTonePill>
          ) : (
            <LargeOrderTonePill tone="indigo" icon={User}>
              Administrator
            </LargeOrderTonePill>
          )}
          {task.dueDate && (
            <span className={overdue ? "inline-flex items-center gap-1 font-medium text-status-blocked" : "text-brand-technical-graphite"}>
              {overdue && <CircleAlert className="size-3.5" aria-hidden="true" />}
              {overdue ? "Zaległe od " : "Termin: "}
              {formatDueDate(task.dueDate)}
            </span>
          )}
          <span className={task.responsibleActive ? "text-brand-technical-graphite" : "font-medium text-status-conditional"}>
            Odpowiada: {task.responsibleLabel}
          </span>
        </div>
      </div>
      <TaskRowActions taskId={task.id} status="open" />
    </li>
  );
}
