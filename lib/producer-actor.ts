import { auth } from "@/auth";
import { getProducerIdForUser } from "@/lib/db/queries";

export interface ProducerActor {
  userId: string;
  producerId: string;
}

export async function requireProducerActor(): Promise<ProducerActor | null> {
  const session = await auth();
  if (!session || session.user.role !== "producer") return null;
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) return null;
  return { userId: session.user.id, producerId };
}
