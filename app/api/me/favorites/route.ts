import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";

// Spec 0078 AC-5, AC-10: strony publiczne są statyczne, więc stan serc ulubionych
// nie może przyjść z serwera razem ze stroną. Ten endpoint oddaje go tylko
// zalogowanemu klientowi i nigdy nie trafia do wspólnego cache.
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ ids: [] }, { headers: PRIVATE_HEADERS });
  }
  const clientId = await getClientIdForUser(session.user.id);
  const ids = clientId ? [...(await getFavoritedProductIds(clientId))] : [];
  return NextResponse.json({ ids }, { headers: PRIVATE_HEADERS });
}
