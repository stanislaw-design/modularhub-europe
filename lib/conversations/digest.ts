import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  countDigestTasks,
  sendConversationsDigest,
  type ConversationsDigestInput,
  type DigestOwnerGroup,
} from "@/lib/notifications/conversations-digest";
import { captureError } from "@/lib/observability";
import { getWarsawToday, listActiveAdmins, listOpenTasksWithOwners, type TodayTask } from "./queries";

// Dzienny mail z zadaniami (spec 0080 AC-19). Bez "use server": wołany tylko z
// app/api/cron/conversations-digest/route.ts po sprawdzeniu sekretu.

export type DigestRun =
  | { status: "skipped"; reason: "no_resend_key" | "no_recipients" | "no_tasks" | "already_claimed" }
  | { status: "failed"; digestDate: string }
  | { status: "sent"; digestDate: string; recipients: number; tasks: number; noDueDate: number };

/**
 * Grupuje zadania zaległe i na dziś według osoby odpowiedzialnej (reguła "moje", AC-15) i liczy
 * zadania bez terminu. Zadania z przyszłym terminem nie wchodzą do maila.
 */
export function groupDigestTasks(tasks: TodayTask[], today: string): { groups: DigestOwnerGroup[]; noDueDateCount: number } {
  const byOwner = new Map<string, DigestOwnerGroup>();
  let noDueDateCount = 0;
  for (const task of tasks) {
    if (task.dueDate === null) {
      noDueDateCount += 1;
      continue;
    }
    if (task.dueDate > today) continue;
    let group = byOwner.get(task.ownerUserId);
    if (!group) {
      group = { ownerLabel: task.responsibleLabel, overdue: [], dueToday: [] };
      byOwner.set(task.ownerUserId, group);
    }
    const line = { title: task.title, partnerName: task.partnerName, dueDate: task.dueDate, external: task.assigneeKind === "external" };
    (task.dueDate < today ? group.overdue : group.dueToday).push(line);
  }
  const groups = [...byOwner.values()].sort((a, b) => a.ownerLabel.localeCompare(b.ownerLabel, "pl"));
  return { groups, noDueDateCount };
}

// Zajmuje dzień PRZED wysyłką. Klucz główny to data w Europe/Warsaw liczona w SQL (domyślna
// wartość kolumny), więc dwa równoległe uruchomienia zajmą dzień tylko raz.
async function claimDigestDay(): Promise<string | null> {
  const result = await db.execute<{ digest_date: string }>(sql`
    INSERT INTO "crm_digest_log" DEFAULT VALUES
    ON CONFLICT ("digest_date") DO NOTHING
    RETURNING "digest_date"::text AS "digest_date"
  `);
  return result.rows[0]?.digest_date ?? null;
}

async function releaseDigestDay(digestDate: string): Promise<void> {
  await db.execute(sql`DELETE FROM "crm_digest_log" WHERE "digest_date" = ${digestDate}::date`);
}

export async function runConversationsDigest(
  deps: { send?: (input: ConversationsDigestInput) => Promise<boolean> } = {},
): Promise<DigestRun> {
  const send = deps.send ?? sendConversationsDigest;

  // 1. Najpierw to, co nie zużywa dnia: klucz Resend i adresaci.
  if (!process.env.RESEND_API_KEY) return { status: "skipped", reason: "no_resend_key" };
  const admins = await listActiveAdmins();
  if (!admins.length) return { status: "skipped", reason: "no_recipients" };

  const [today, tasks] = await Promise.all([getWarsawToday(), listOpenTasksWithOwners()]);
  const { groups, noDueDateCount } = groupDigestTasks(tasks, today);
  if (!groups.length) return { status: "skipped", reason: "no_tasks" };

  // 2. Zajęcie dnia, potem wysyłka tylko przez ten przebieg, któremu się udało.
  const digestDate = await claimDigestDay();
  if (!digestDate) return { status: "skipped", reason: "already_claimed" };

  let sent = false;
  try {
    sent = await send({ to: admins.map((admin) => admin.email), groups, noDueDateCount, digestDate });
    if (!sent) captureError(new Error("Wysyłka maila dziennego z rozmów nie powiodła się"), { path: "conversationsDigest:send" });
  } catch (error) {
    captureError(error, { path: "conversationsDigest:send" });
  }

  // 3. Po błędzie wysyłki dzień wraca do puli, żeby kolejne uruchomienie spróbowało ponownie.
  if (!sent) {
    try {
      await releaseDigestDay(digestDate);
    } catch (error) {
      captureError(error, { path: "conversationsDigest:release" });
    }
    return { status: "failed", digestDate };
  }

  try {
    await db.execute(sql`
      UPDATE "crm_digest_log" SET "sent_at" = now(), "recipient_count" = ${admins.length}
      WHERE "digest_date" = ${digestDate}::date
    `);
  } catch (error) {
    // Mail już wyszedł; wiersz zostaje zajęty, więc nie będzie drugiego maila tego dnia.
    captureError(error, { path: "conversationsDigest:markSent" });
  }
  return { status: "sent", digestDate, recipients: admins.length, tasks: countDigestTasks(groups), noDueDate: noDueDateCount };
}
