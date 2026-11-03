import { recordEmailEvent } from "@/lib/analytics/email-events";
import { clientIpFrom, isUuid } from "@/lib/analytics/email-request";
import { captureError } from "@/lib/observability";

// Spec 0079 AC-21: pikselka otwarcia. ZAWSZE 200 i gif 1x1 (także dla nieznanego id, złego id i
// błędu bazy), nigdy cache. Zapis zdarzenia jest dodatkiem: pomijany, gdy mail nie był śledzony
// albo odbiorca wycofał zgodę (AC-20). `/api` jest poza matcherem proxy.ts.
export const maxDuration = 15;

// Przezroczysty gif 1x1.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixelResponse(): Response {
  return new Response(PIXEL, {
    status: 200,
    headers: { "Content-Type": "image/gif", "Content-Length": String(PIXEL.length), "Cache-Control": "no-store, max-age=0" },
  });
}

async function handle(request: Request, id: string): Promise<Response> {
  if (isUuid(id)) {
    try {
      await recordEmailEvent({
        messageId: id,
        kind: "opened",
        method: request.method,
        userAgent: request.headers.get("user-agent"),
        ip: clientIpFrom(request.headers),
      });
    } catch (error) {
      captureError(error, { path: "email:open" });
    }
  }
  return pixelResponse();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(request, (await context.params).id);
}

export async function HEAD(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(request, (await context.params).id);
}
