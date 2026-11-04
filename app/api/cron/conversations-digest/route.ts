import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runConversationsDigest } from "@/lib/conversations/digest";

// Spec 0080 AC-19: dzienny mail z zadaniami z notatnika rozmów (vercel.json, 05:00 UTC).
// Vercel dołącza `Authorization: Bearer ${CRON_SECRET}` do wywołań crona, gdy zmienna
// CRON_SECRET jest ustawiona. Bez sekretu endpoint odmawia (fail closed). Zadanie nie działa
// na stagingu; testuje się je ręcznie tym samym nagłówkiem.
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
  const run = await runConversationsDigest();
  return NextResponse.json(run);
}
