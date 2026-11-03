import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailMessage } from "@/lib/db/schema";

// Spec 0079 etap 2: zapisy dziennika maili do producentów (email_message). Neon HTTP nie ma
// interaktywnych transakcji, więc każdy zapis to jedno zapytanie. Bez adresu e mail (AC-15).

export interface NewEmailMessage {
  id: string;
  emailType: string;
  entityId: string;
  producerId: string;
  recipientUserId: string | null;
  tracked: boolean;
}

// AC-13: wiersz powstaje PRZED wysyłką, bo jego id jedzie w tagu Resend.
export async function insertEmailMessage(message: NewEmailMessage): Promise<void> {
  await db.insert(emailMessage).values(message);
}

export async function setEmailMessageResendId(id: string, resendEmailId: string): Promise<void> {
  await db.update(emailMessage).set({ resendEmailId }).where(eq(emailMessage.id, id));
}

// Po porażce wysyłki wiersz znika: dziennik liczy maile, które naprawdę wyszły.
export async function deleteEmailMessage(id: string): Promise<void> {
  await db.delete(emailMessage).where(eq(emailMessage.id, id));
}

export type ResendDeliveryEvent = "delivered" | "bounced" | "complained";

const EVENT_COLUMN = {
  delivered: emailMessage.deliveredAt,
  bounced: emailMessage.bouncedAt,
  complained: emailMessage.complainedAt,
} as const;

const EVENT_FIELD = {
  delivered: "deliveredAt",
  bounced: "bouncedAt",
  complained: "complainedAt",
} as const;

// AC-14: idempotentny zapis zdarzenia z webhooka. coalesce zostawia pierwszy znacznik, więc
// powtórzone zdarzenie niczego nie zmienia. Zwraca false, gdy wiersza o tym id nie ma
// (webhook odpowie wtedy 503 i Resend ponowi).
export async function applyResendDeliveryEvent(messageId: string, event: ResendDeliveryEvent, occurredAt: Date): Promise<boolean> {
  const column = EVENT_COLUMN[event];
  const rows = await db
    .update(emailMessage)
    .set({ [EVENT_FIELD[event]]: sql`coalesce(${column}, ${occurredAt.toISOString()}::timestamptz)` })
    .where(eq(emailMessage.id, messageId))
    .returning({ id: emailMessage.id });
  return rows.length > 0;
}
