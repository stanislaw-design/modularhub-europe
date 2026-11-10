"use server";

import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { commercialDisplayInquiry } from "@/lib/db/schema";
import {
  COMMERCIAL_INQUIRY_LIMITS,
  COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR,
  commercialDisplayInquirySchema,
  normalizeCommercialEmail,
  type CommercialDisplayInquiryInput,
} from "@/lib/commercial-display-inquiry-specs";
import { notifyTeamOfCommercialDisplayInquiry } from "@/lib/notifications/commercial-display-team";
import { captureError, trackEvent } from "@/lib/observability";

export type SubmitCommercialDisplayInquiryResult =
  | { ok: true; id?: string }
  | { ok: false; error: "invalid" | typeof COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR | "failed" };

// Spec 0083: zapis zgłoszenia z /commercial-displays. Publiczna akcja bez sesji (gość), więc:
// walidacja po stronie serwera (Zod, ten sam schemat co formularz), pole-pułapka na boty
// (AC-5) i limit zgłoszeń na adres e-mail na dobę (AC-6). Mail do zespołu jest best effort
// i nie cofa zapisu (AC-7).
export async function submitCommercialDisplayInquiry(
  input: CommercialDisplayInquiryInput,
): Promise<SubmitCommercialDisplayInquiryResult> {
  const parsed = commercialDisplayInquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  // Bot wypełnił ukryte pole: odpowiadamy "ok" jak człowiekowi, ale niczego nie zapisujemy ani nie wysyłamy.
  if (data.website && data.website.trim().length > 0) return { ok: true };

  const email = normalizeCommercialEmail(data.email);
  try {
    const [recent] = await db
      .select({ total: count() })
      .from(commercialDisplayInquiry)
      .where(
        and(
          eq(commercialDisplayInquiry.contactEmail, email),
          gt(commercialDisplayInquiry.createdAt, sql`now() - interval '24 hours'`),
        ),
      );
    if ((recent?.total ?? 0) >= COMMERCIAL_INQUIRY_LIMITS.perEmailPerDay) {
      return { ok: false, error: COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR };
    }

    const [inserted] = await db
      .insert(commercialDisplayInquiry)
      .values({
        contactName: data.name,
        company: data.company ?? null,
        contactEmail: email,
        contactPhone: data.phone ?? null,
        countryCode: data.countryCode,
        useCase: data.useCase,
        interests: data.interests,
        screenCount: data.screenCount ?? null,
        message: data.message,
        contactLocale: data.locale,
      })
      .returning({ id: commercialDisplayInquiry.id });

    trackEvent(
      "commercial_display_inquiry_submitted",
      { countryCode: data.countryCode, useCase: data.useCase, interests: data.interests, locale: data.locale },
      inserted.id,
    );
    // Zgłoszenie jest już zapisane: błąd maila nie może zamienić go w "nie udało się", bo klient
    // wysłałby je drugi raz (AC-7).
    try {
      await notifyTeamOfCommercialDisplayInquiry({ id: inserted.id, data: { ...data, email } });
    } catch (error) {
      captureError(error, { path: "submitCommercialDisplayInquiry:notify" });
    }
    return { ok: true, id: inserted.id };
  } catch (error) {
    captureError(error, { path: "submitCommercialDisplayInquiry" });
    return { ok: false, error: "failed" };
  }
}
