"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { countActiveLoginTokens, MAX_ACTIVE_LOGIN_TOKENS } from "@/lib/cases/guest";
import { db } from "@/lib/db/client";
import { inquiry, pendingRegistration, users } from "@/lib/db/schema";
import { routing } from "@/lib/i18n/routing";
import { captureError } from "@/lib/observability";

// Spec 0066 AC-8: konto na jawne kliknięcie gościa. Akcja jest publiczna, więc
// odpowiada zawsze tak samo i niczego nie zdradza o istnieniu kont: tylko błąd
// samej wysyłki linku daje { ok: false }, żeby dało się ponowić.
const inputSchema = z.object({ inquiryId: z.uuid(), locale: z.string().min(2).max(5) });

export async function requestAccountForGuestCase(input: {
  inquiryId: string;
  locale: string;
}): Promise<{ ok: boolean }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !(routing.locales as readonly string[]).includes(parsed.data.locale)) return { ok: true };
  const { inquiryId, locale } = parsed.data;

  try {
    const [row] = await db
      .select({
        clientId: inquiry.clientId,
        verifiedAt: inquiry.contactEmailVerifiedAt,
        email: inquiry.email,
        name: inquiry.name,
        phone: inquiry.phone,
      })
      .from(inquiry)
      .where(eq(inquiry.id, inquiryId));
    // Tylko sprawa gościa z niepotwierdzonym kontaktem (przypięte z AC-10 nic nie robią).
    if (!row || row.clientId !== null || row.verifiedAt !== null) return { ok: true };
    const email = row.email.toLowerCase();

    const [existingUser] = await db.select({ role: users.role }).from(users).where(eq(users.email, email));
    if (existingUser) {
      if (existingUser.role !== "client") return { ok: true };
    } else {
      const [pending] = await db
        .select({ role: pendingRegistration.role })
        .from(pendingRegistration)
        .where(eq(pendingRegistration.email, email));
      if (pending) {
        // Istniejącej oczekującej rejestracji nigdy nie nadpisujemy.
        if (pending.role !== "client") return { ok: true };
      } else {
        await db
          .insert(pendingRegistration)
          .values({ email, role: "client", payload: { name: row.name, phone: row.phone } })
          .onConflictDoNothing({ target: pendingRegistration.email });
      }
    }

    if ((await countActiveLoginTokens(email, new Date())) >= MAX_ACTIVE_LOGIN_TOKENS) return { ok: true };

    await signIn("resend", { email, redirect: false, redirectTo: `/${locale}/panel/inquiries/${inquiryId}` });
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "requestAccountForGuestCase" });
    return { ok: false };
  }
}
