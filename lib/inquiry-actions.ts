"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { client, inquiry, inquiryItem } from "@/lib/db/schema";
import type { CountryCode } from "@/lib/data/types";
import type { InquiryContact } from "@/lib/inquiry";

export interface SubmitInquiryInput {
  contact: InquiryContact;
  deliveryCountryCode: CountryCode;
  projectIds: string[];
  idempotencyKey: string;
}

export interface SubmitInquiryResult {
  ok: boolean;
  inquiryId?: string;
  error?: string;
}

// Zawsze powiązane z client.id wyprowadzonym z sesji, nigdy z identyfikatorem
// podanym wprost (spec 0023 Key invariants) — chroni przed podszyciem się pod
// innego klienta. Upsert bezpieczny na idempotencyKey (AC-8): ponów po błędzie
// z tym samym kluczem trafia w onConflictDoNothing i zwraca istniejący wiersz
// zamiast tworzyć drugi.
export async function submitInquiry(input: SubmitInquiryInput): Promise<SubmitInquiryResult> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient, żeby wysłać zapytanie." };
  }
  if (input.projectIds.length === 0) {
    return { ok: false, error: "Wybierz przynajmniej jeden produkt." };
  }

  const [clientRow] = await db
    .select({ id: client.id })
    .from(client)
    .where(eq(client.userId, session.user.id));
  if (!clientRow) {
    return { ok: false, error: "Nie znaleziono konta klienta." };
  }

  try {
    const inserted = await db
      .insert(inquiry)
      .values({
        clientId: clientRow.id,
        name: input.contact.name,
        email: input.contact.email,
        phone: input.contact.phone,
        deliveryCountryCode: input.deliveryCountryCode,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({ target: inquiry.idempotencyKey })
      .returning({ id: inquiry.id });

    if (inserted[0]) {
      await db
        .insert(inquiryItem)
        .values(input.projectIds.map((productId) => ({ inquiryId: inserted[0].id, productId })));
      return { ok: true, inquiryId: inserted[0].id };
    }

    const [existing] = await db
      .select({ id: inquiry.id })
      .from(inquiry)
      .where(eq(inquiry.idempotencyKey, input.idempotencyKey));
    if (!existing) {
      return { ok: false, error: "Nie udało się zapisać zapytania. Spróbuj ponownie." };
    }
    return { ok: true, inquiryId: existing.id };
  } catch {
    return { ok: false, error: "Nie udało się zapisać zapytania. Spróbuj ponownie." };
  }
}
