import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteExpiredEmailEvents } from "@/lib/analytics/email-events";

// Spec 0079 AC-23: cotygodniowe zadanie z vercel.json. Usuwa surowe wiersze email_event starsze niż
// 13 miesięcy, sumy w email_message zostają. Autoryzacja jak w large-orders-reminders: nagłówek
// `Authorization: Bearer ${CRON_SECRET}`, bez sekretu odmowa (fail closed). Zwraca liczbę usuniętych wierszy.
export const maxDuration = 60;

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deleteExpiredEmailEvents();
  return NextResponse.json({ deleted });
}
