import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { applyResendDeliveryEvent } from "@/lib/analytics/email-message";
import { parseResendEvent } from "@/lib/analytics/resend-webhook";
import { captureError } from "@/lib/observability";

// Spec 0079 AC-14: webhook Resend (email.delivered, email.bounced, email.complained). Podpis Svix
// jest liczony na SUROWYM ciele, dlatego `await request.text()`, nigdy request.json(). `/api` jest
// poza matcherem proxy.ts. Konfiguracja w panelu Resend: patrz index.md specu, "Configuration required".
export const maxDuration = 30;

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Bez sekretu nie da się niczego zweryfikować: 503, żeby Resend ponowił po ustawieniu zmiennej.
    captureError(new Error("RESEND_WEBHOOK_SECRET is not configured"), { path: "webhooks:resend" });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  let payload: unknown;
  try {
    // svix 2.x: verify() nic nie zwraca (rzuca przy złym podpisie), więc treść parsujemy sami.
    new Webhook(secret).verify(body, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    });
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Brak tagu message_id (wszystkie inne maile z domeny) albo inne zdarzenie: nic nie robimy.
  const parsed = parseResendEvent(payload);
  if (!parsed) return NextResponse.json({ ok: true, ignored: true });

  try {
    const found = await applyResendDeliveryEvent(parsed.messageId, parsed.event, parsed.occurredAt);
    // Tag jest, a wiersza nie ma: zdarzenie mogło wyprzedzić zapis albo zapis padł. 503 każe
    // Resendowi ponowić, zamiast zgubić zdarzenie.
    if (!found) return NextResponse.json({ error: "Message not found" }, { status: 503 });
  } catch (error) {
    captureError(error, { path: "webhooks:resend" });
    return NextResponse.json({ error: "Storage failure" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
