import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getProducerRecipientsForLargeOrder, type LargeOrderKind } from "@/lib/db/large-order-recipients";
import { connectSelection, getPendingSelections } from "@/lib/large-order-connection";
import { sendDeadlineReminderToProducer, type DeadlineReminderThreshold } from "@/lib/notifications/large-order-producer";
import { hasTeamRecipient, notifyTeamOfDeadlinePassed } from "@/lib/notifications/large-order-team";
import { captureError } from "@/lib/observability";

// Bez "use server": logika godzinnego zadania (spec 0070 AC-17, AC-25), wołana tylko z
// app/api/cron/large-orders-reminders/route.ts po sprawdzeniu sekretu.

const DAY_MS = 24 * 60 * 60 * 1000;
// Alert o minionym terminie dotyczy zapytań z ostatnich dwóch dni, żeby po awarii zadania
// albo pierwszym wdrożeniu nie wysłać lawiny alertów o dawno zapomnianych zapytaniach.
const DEADLINE_ALERT_WINDOW_MS = 2 * DAY_MS;

interface DueRequest {
  kind: LargeOrderKind;
  id: string;
  deadlineAt: Date;
  countryCode: string;
  unitCount: number;
}

export interface LargeOrderReminderRun {
  remindersClaimed: number;
  remindersSent: number;
  deadlineAlertsClaimed: number;
  deadlineAlertsSent: number;
  selectionsChecked: number;
  selectionsConnected: number;
  errors: number;
}

interface DueRow extends Record<string, unknown> {
  kind: LargeOrderKind;
  id: string;
  deadline_at: string | Date;
  country_code: string;
  unit_count: number;
}

// Zapytania w statusie open, quoted lub published, bez wyboru klienta (po wyborze
// przypomnienia i alert o terminie nie mają sensu), z terminem w podanym przedziale.
// `onlyIds` zawęża zadanie do podanych zapytań (testy na wspólnej bazie dev, żeby nie ruszać
// cudzych wierszy i nie blokować ich sprzątania kluczem obcym). Bez niego zadanie obejmuje wszystko.
function idFilter(column: string, onlyIds?: string[]) {
  if (!onlyIds) return sql`TRUE`;
  if (onlyIds.length === 0) return sql`FALSE`;
  return sql`${sql.raw(column)} IN (${sql.join(onlyIds.map((id) => sql`${id}::uuid`), sql`, `)})`;
}

async function findRequests(from: Date, to: Date, onlyIds?: string[]): Promise<DueRequest[]> {
  const result = await db.execute<DueRow>(sql`
    SELECT 'request' AS kind, r."id", r."deadline_at", r."country_code", r."unit_count"
      FROM "project_request" r
      WHERE r."status" IN ('open', 'quoted', 'published') AND r."selected_quote_id" IS NULL AND ${idFilter('r."id"', onlyIds)}
        AND r."deadline_at" > ${from.toISOString()}::timestamptz AND r."deadline_at" <= ${to.toISOString()}::timestamptz
    UNION ALL
    SELECT 'product' AS kind, b."id", b."deadline_at", b."delivery_country_code", b."unit_count"
      FROM "bulk_product_inquiry" b
      WHERE b."status" IN ('open', 'quoted', 'published') AND b."selected_quote_id" IS NULL AND ${idFilter('b."id"', onlyIds)}
        AND b."deadline_at" > ${from.toISOString()}::timestamptz AND b."deadline_at" <= ${to.toISOString()}::timestamptz
  `);
  return result.rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    deadlineAt: new Date(row.deadline_at),
    countryCode: row.country_code,
    unitCount: Number(row.unit_count),
  }));
}

// Wstawia wiersz dziennika PRZED wysyłką. Unikalny indeks (cel, producent, rodzaj) sprawia,
// że przy dwóch równoległych uruchomieniach wstawienie uda się tylko jednemu, a mail wysyła
// wyłącznie ten, któremu się udało. Zwraca, czy wiersz właśnie powstał.
export async function claimNotification(
  kind: LargeOrderKind,
  id: string,
  producerId: string | null,
  notificationKind: string,
): Promise<boolean> {
  const column = sql.identifier(kind === "request" ? "project_request_id" : "bulk_product_inquiry_id");
  const result = await db.execute(sql`
    INSERT INTO "project_notification_log" (${column}, "producer_id", "kind")
    VALUES (${id}, ${producerId}, ${notificationKind})
    ON CONFLICT DO NOTHING
    RETURNING "id"
  `);
  return (result.rowCount ?? 0) > 0;
}

// Rodzaj wpisu niesie datę terminu, więc po zmianie terminu progi liczą się od nowa.
function deadlineDay(deadlineAt: Date): string {
  return deadlineAt.toISOString().slice(0, 10);
}

function thresholdFor(deadlineAt: Date, now: Date): DeadlineReminderThreshold {
  return deadlineAt.getTime() - now.getTime() > DAY_MS ? "3d" : "1d";
}

export async function runLargeOrderReminders(
  now: Date = new Date(),
  options: { onlyIds?: string[]; onlyProducerIds?: string[] } = {},
): Promise<LargeOrderReminderRun> {
  const { onlyIds, onlyProducerIds } = options;
  const run: LargeOrderReminderRun = {
    remindersClaimed: 0,
    remindersSent: 0,
    deadlineAlertsClaimed: 0,
    deadlineAlertsSent: 0,
    selectionsChecked: 0,
    selectionsConnected: 0,
    errors: 0,
  };

  // 1. Przypomnienia dla producentów bez aktywnej oferty: 3 dni i 1 dzień przed terminem.
  try {
    for (const due of await findRequests(now, new Date(now.getTime() + 3 * DAY_MS), onlyIds)) {
      try {
        const threshold = thresholdFor(due.deadlineAt, now);
        const notificationKind = `reminder_${threshold}:${deadlineDay(due.deadlineAt)}`;
        const recipients = (await getProducerRecipientsForLargeOrder(due.kind, due.id, { withoutQuote: true })).filter(
          (recipient) => !onlyProducerIds || onlyProducerIds.includes(recipient.producerId),
        );
        for (const recipient of recipients) {
          if (!(await claimNotification(due.kind, due.id, recipient.producerId, notificationKind))) continue;
          run.remindersClaimed += 1;
          const sent = await sendDeadlineReminderToProducer({
            kind: due.kind,
            id: due.id,
            producerId: recipient.producerId,
            email: recipient.email,
            threshold,
            locale: recipient.locale,
          });
          if (sent) run.remindersSent += 1;
        }
      } catch (error) {
        run.errors += 1;
        captureError(error, { path: "largeOrderReminders:reminder" });
      }
    }
  } catch (error) {
    run.errors += 1;
    captureError(error, { path: "largeOrderReminders:findReminders" });
  }

  // 2. Alert zespołu po terminie, raz na zapytanie i termin, także gdy nie ma ofert.
  try {
    if (hasTeamRecipient()) {
      for (const due of await findRequests(new Date(now.getTime() - DEADLINE_ALERT_WINDOW_MS), now, onlyIds)) {
        try {
          const notificationKind = `deadline_team:${deadlineDay(due.deadlineAt)}`;
          if (!(await claimNotification(due.kind, due.id, null, notificationKind))) continue;
          run.deadlineAlertsClaimed += 1;
          const sent = await notifyTeamOfDeadlinePassed({
            kind: due.kind,
            id: due.id,
            countryCode: due.countryCode,
            unitCount: due.unitCount,
            activeQuoteCount: await countActiveQuotes(due.kind, due.id),
          });
          if (sent) run.deadlineAlertsSent += 1;
        } catch (error) {
          run.errors += 1;
          captureError(error, { path: "largeOrderReminders:deadlineAlert" });
        }
      }
    }
  } catch (error) {
    run.errors += 1;
    captureError(error, { path: "largeOrderReminders:findDeadlineAlerts" });
  }

  // 3. Sprzątanie: wybór klienta bez połączenia, którego klient ma już zatwierdzone B2B
  // (ślad po wyścigu albo błędzie). connectSelection jest idempotentna i sama sprawdza B2B w SQL.
  try {
    for (const pending of (await getPendingSelections()).filter((item) => !onlyIds || onlyIds.includes(item.id))) {
      run.selectionsChecked += 1;
      try {
        if ((await connectSelection(pending.kind, pending.id)) === "connected") run.selectionsConnected += 1;
      } catch (error) {
        run.errors += 1;
        captureError(error, { path: "largeOrderReminders:connectSelection" });
      }
    }
  } catch (error) {
    run.errors += 1;
    captureError(error, { path: "largeOrderReminders:findPendingSelections" });
  }

  return run;
}

async function countActiveQuotes(kind: LargeOrderKind, id: string): Promise<number> {
  const column = sql.identifier(kind === "request" ? "project_request_id" : "bulk_product_inquiry_id");
  const result = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count FROM "project_quote" WHERE ${column} = ${id} AND "status" = 'active'
  `);
  return Number(result.rows[0]?.count ?? 0);
}
