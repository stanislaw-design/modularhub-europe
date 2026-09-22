import { auth } from "@/auth";
import { getClientIdForUser, getProducerIdForUser } from "@/lib/db/queries";
import type { CaseActor } from "./access";

// Aktor sprawy wyliczany wyłącznie z sesji (spec 0048 AC-31): rola admin to
// doradca, klient i producent dostają swój client.id lub producer.id z bazy.
// Konto bez powiązanego profilu nie jest aktorem.
export async function getCaseActor(): Promise<CaseActor | null> {
  const session = await auth();
  if (!session) return null;

  const userId = session.user.id;
  switch (session.user.role) {
    case "admin":
      return { kind: "advisor", userId };
    case "client": {
      const clientId = await getClientIdForUser(userId);
      return clientId ? { kind: "client", userId, clientId } : null;
    }
    case "producer": {
      const producerId = await getProducerIdForUser(userId);
      return producerId ? { kind: "producer", userId, producerId } : null;
    }
    default:
      return null;
  }
}
