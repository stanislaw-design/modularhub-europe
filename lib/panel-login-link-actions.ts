"use server";

import { and, eq, inArray } from "drizzle-orm";
import { signIn } from "@/auth";
import { getGuestLinkPlan } from "@/lib/cases/guest";
import { db } from "@/lib/db/client";
import { bulkProductInquiry, pendingRegistration, projectRequest } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { normalizeContactEmail } from "@/lib/project-request-specs";

const LOCALES = ["pl", "en", "de", "nl"] as const;
const ACTIVE_STATUSES = ["open", "quoted", "published"] as const;

// Spec 0070 AC-39: gość u limitu trzech zapytań nie ma konta, więc nie wejdzie do panelu,
// żeby zamknąć jedno z nich. Ta akcja wysyła link logujący na adres, który ma co najmniej
// jedno aktywne duże zamówienie. Odpowiedź jest zawsze taka sama (też dla adresu bez
// zapytań, z limitem linków albo po błędzie), więc nie da się nią sprawdzać cudzych
// adresów. Limit aktywnych linków i zapis oczekującej rejestracji robi getGuestLinkPlan.
export async function requestPanelLoginLink(email: string, locale: string): Promise<{ ok: true }> {
  const address = normalizeContactEmail(String(email ?? ""));
  const targetLocale = (LOCALES as readonly string[]).includes(locale) ? locale : "pl";
  if (!address.includes("@")) return { ok: true };

  try {
    const [request] = await db
      .select({ name: projectRequest.contactName, phone: projectRequest.contactPhone })
      .from(projectRequest)
      .where(and(eq(projectRequest.contactEmail, address), inArray(projectRequest.status, [...ACTIVE_STATUSES])))
      .limit(1);
    const [bulk] = request
      ? []
      : await db
          .select({ name: bulkProductInquiry.contactName, phone: bulkProductInquiry.contactPhone })
          .from(bulkProductInquiry)
          .where(and(eq(bulkProductInquiry.contactEmail, address), inArray(bulkProductInquiry.status, [...ACTIVE_STATUSES])))
          .limit(1);
    const contact = request ?? bulk;
    if (!contact) return { ok: true };

    const plan = await getGuestLinkPlan(address, new Date());
    if (!plan.send) return { ok: true };

    if (plan.stagePending) {
      await db
        .insert(pendingRegistration)
        .values({ email: address, role: "client", payload: { name: contact.name, phone: contact.phone ?? "" } })
        .onConflictDoNothing({ target: pendingRegistration.email });
    }
    await signIn("resend", { email: address, redirect: false, redirectTo: `/${targetLocale}/panel/quotes` });
  } catch (error) {
    captureError(error, { path: "requestPanelLoginLink" });
  }
  return { ok: true };
}
