"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
}

// E mail zostaje nieedytowalny w tej funkcji (spec 0024 Key invariants): to
// tożsamość logowania (link magiczny). Aktualizuje wyłącznie users.name i
// users.phone zalogowanego klienta, wyprowadzonego z sesji.
export async function updateProfile(name: string, phone: string): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient, żeby zmienić profil." };
  }

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  if (trimmedName.length === 0) {
    return { ok: false, error: "Podaj imię i nazwisko." };
  }
  if (trimmedPhone.length === 0) {
    return { ok: false, error: "Podaj numer telefonu." };
  }

  try {
    await db
      .update(users)
      .set({ name: trimmedName, phone: trimmedPhone, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));
    return { ok: true };
  } catch {
    return { ok: false, error: "Nie udało się zapisać zmian. Spróbuj ponownie." };
  }
}
