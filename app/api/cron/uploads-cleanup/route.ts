import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runUploadsCleanup } from "@/lib/storage/direct-upload";

// Spec 0085 AC-9: godzinne zadanie z vercel.json. Usuwa z R2 niepotwierdzone obiekty tymczasowe
// (`uploads/<uuid>`), pliki zapytań skasowane ponad 30 dni temu i stare wiersze `upload_intent`.
// Autoryzacja jak w pozostałych zadaniach: nagłówek `Authorization: Bearer ${CRON_SECRET}`,
// bez sekretu odmowa (fail closed).
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
  const result = await runUploadsCleanup();
  return NextResponse.json(result);
}
