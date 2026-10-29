import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runLargeOrderReminders } from "@/lib/large-order-reminders";

// Spec 0070 AC-17, AC-25: cykliczne zadanie z vercel.json (co 6 godzin). Vercel dołącza
// `Authorization: Bearer ${CRON_SECRET}` do wywołań crona, gdy zmienna CRON_SECRET jest
// ustawiona. Bez sekretu endpoint odmawia (fail closed), więc nie da się go wywołać z zewnątrz.
// Zadanie nie działa na stagingu; testuje się je ręcznie tym samym nagłówkiem.
export const dynamic = "force-dynamic";
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
  const run = await runLargeOrderReminders();
  return NextResponse.json(run);
}
