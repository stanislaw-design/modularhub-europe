import type { ResendDeliveryEvent } from "./email-message";

// Spec 0079 AC-14: czysta część webhooka Resend (bez bazy i bez podpisu), żeby dało się ją
// przetestować osobno od trasy.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_BY_TYPE: Record<string, ResendDeliveryEvent> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export interface ParsedResendEvent {
  messageId: string;
  event: ResendDeliveryEvent;
  occurredAt: Date;
}

function readTag(tags: unknown, name: string): string | null {
  // Resend wysyła tagi jako obiekt {nazwa: wartość}; tablica {name, value} też bywa spotykana.
  if (Array.isArray(tags)) {
    const hit = tags.find((tag) => tag && typeof tag === "object" && (tag as { name?: unknown }).name === name);
    const value = (hit as { value?: unknown } | undefined)?.value;
    return typeof value === "string" ? value : null;
  }
  if (tags && typeof tags === "object") {
    const value = (tags as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  }
  return null;
}

// Zwraca null dla wszystkiego, co nie jest naszym zdarzeniem dostarczalności: brak tagu
// `message_id` (login_link i reszta maili z domeny), tag, który nie jest uuid, albo inny
// typ zdarzenia (np. email.sent, email.delivery_delayed). Trasa odpowiada wtedy 200.
export function parseResendEvent(payload: unknown): ParsedResendEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const { type, created_at: createdAt, data } = payload as { type?: unknown; created_at?: unknown; data?: unknown };
  const event = typeof type === "string" ? EVENT_BY_TYPE[type] : undefined;
  if (!event || !data || typeof data !== "object") return null;

  const messageId = readTag((data as { tags?: unknown }).tags, "message_id");
  if (!messageId || !UUID.test(messageId)) return null;

  const stamp = typeof createdAt === "string" ? new Date(createdAt) : null;
  return { messageId, event, occurredAt: stamp && !Number.isNaN(stamp.getTime()) ? stamp : new Date() };
}
