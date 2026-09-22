import { z } from "zod";
import { auth } from "@/auth";
import { requireCaseAccess } from "@/lib/cases/access";
import { getCaseActor } from "@/lib/cases/actor";
import { systemClock } from "@/lib/cases/clock";
import { listMessages, touchChannel } from "@/lib/cases/messaging";
import { parseCursor } from "@/lib/cases/poll";

// Polling wiadomości (spec 0048 AC-6, AC-8). Odmowa i brak zasobu wyglądają
// tak samo (404), żeby nie ujawniać istnienia cudzej sprawy lub kanału.
export async function GET(request: Request, context: { params: Promise<{ id: string; channelId: string }> }) {
  const { id, channelId } = await context.params;
  const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

  const session = await auth();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(channelId).success) return notFound();

  const actor = await getCaseActor();
  if (!actor) return notFound();
  const access = await requireCaseAccess(actor, id, channelId);
  if (!access) return notFound();

  const rawCursor = new URL(request.url).searchParams.get("after");
  const cursor = parseCursor(rawCursor);
  if (rawCursor && !cursor) return Response.json({ error: "bad_cursor" }, { status: 400 });

  // Każdy poll odświeża last_seen_at, z którego korzysta reguła e maila (AC-10).
  const [messages] = await Promise.all([
    listMessages(channelId, cursor),
    touchChannel(channelId, actor.userId, systemClock),
  ]);

  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
