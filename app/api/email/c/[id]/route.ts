import { recordEmailEvent } from "@/lib/analytics/email-events";
import { clientIpFrom, isUuid } from "@/lib/analytics/email-request";
import { captureError } from "@/lib/observability";
import { verifyClickTarget } from "@/lib/notifications/email-tracking-links";

// Spec 0079 AC-21, AC-22: trasa kliknięcia w mailu. Przekierowuje (302) wyłącznie na adres z
// poprawnym podpisem HMAC (liczonym na id maila i adresie) i z hosta naszego serwisu, inaczej
// 400, więc nie da się jej użyć jako otwartego przekierowania. Zapis zdarzenia jest dodatkiem:
// pomijany przy wycofanej zgodzie (AC-20), a link i tak przekierowuje. Skaner też dostaje
// przekierowanie, zdarzenie dostaje wtedy `likely_automatic`. `/api` jest poza matcherem proxy.ts.
export const maxDuration = 15;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function handle(request: Request, id: string): Promise<Response> {
  const url = new URL(request.url);
  let target: URL | null = null;
  try {
    target = isUuid(id) ? verifyClickTarget(id, url.searchParams.get("u"), url.searchParams.get("s")) : null;
  } catch (error) {
    // Brak EMAIL_TRACKING_SECRET: nie da się niczego zweryfikować, więc nie przekierowujemy.
    captureError(error, { path: "email:click:verify" });
  }
  if (!target) return new Response("Bad request", { status: 400, headers: NO_STORE });

  try {
    await recordEmailEvent({
      messageId: id,
      kind: "clicked",
      targetUrl: target.href,
      method: request.method,
      userAgent: request.headers.get("user-agent"),
      ip: clientIpFrom(request.headers),
    });
  } catch (error) {
    captureError(error, { path: "email:click" });
  }
  return new Response(null, { status: 302, headers: { Location: target.href, ...NO_STORE } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(request, (await context.params).id);
}

export async function HEAD(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(request, (await context.params).id);
}
