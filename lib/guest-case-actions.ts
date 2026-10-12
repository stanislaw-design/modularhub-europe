"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendGuestCaseLink } from "@/lib/cases/guest-link";
import { db } from "@/lib/db/client";
import { inquiry } from "@/lib/db/schema";
import { routing } from "@/lib/i18n/routing";
import { captureError } from "@/lib/observability";

// Spec 0066 AC-8: ponowna wysyłka linku do sprawy gościa (ekran potwierdzenia
// i strona claim). Akcja jest publiczna, więc odpowiada zawsze tak samo i
// niczego nie zdradza o istnieniu kont: tylko błąd samej wysyłki linku daje
// { ok: false }, żeby dało się ponowić.
const inputSchema = z.object({ inquiryId: z.uuid(), locale: z.string().min(2).max(5) });

export async function resendGuestCaseLink(input: { inquiryId: string; locale: string }): Promise<{ ok: boolean }> {
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
    // Tylko sprawy z niepotwierdzonym kontaktem (gość albo przypięta z AC-10).
    if (!row || row.verifiedAt !== null) return { ok: true };

    const result = await sendGuestCaseLink({
      inquiryId,
      email: row.email,
      name: row.name,
      phone: row.phone,
      locale,
      variant: row.clientId ? "existing" : "new",
    });
    return { ok: result !== "failed" };
  } catch (error) {
    captureError(error, { path: "resendGuestCaseLink" });
    return { ok: false };
  }
}
