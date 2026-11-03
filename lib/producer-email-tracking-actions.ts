"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { grantEmailTrackingConsent, withdrawEmailTrackingConsent } from "@/lib/analytics/user-consent";
import { captureError } from "@/lib/observability/errors";

export interface SetEmailTrackingConsentResult {
  ok: boolean;
  error?: string;
}

const UNAUTHORIZED_ERROR = "Musisz być zalogowany jako producent.";
const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";
const SAVE_ERROR = "Nie udało się zapisać zgody. Spróbuj ponownie.";

// Spec 0079 AC-19: użytkownik producenta udziela albo wycofuje WYŁĄCZNIE własną zgodę. Id
// użytkownika pochodzi z sesji, nigdy z danych wejściowych, więc nie da się zmienić cudzej zgody.
// Brak sesji to 401, inna rola niż producent to 403. Zgoda jest per użytkownik, nie per firma,
// więc działa też dla członków dołączonych do firmy później (spec 0057).
export async function setProducerEmailTrackingConsent(grant: boolean): Promise<SetEmailTrackingConsentResult> {
  const session = await auth();
  if (!session) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (session.user.role !== "producer") return { ok: false, error: DENIED_ERROR };

  try {
    if (grant) await grantEmailTrackingConsent(session.user.id);
    else await withdrawEmailTrackingConsent(session.user.id);
  } catch (error) {
    captureError(error, { path: "setProducerEmailTrackingConsent", userId: session.user.id });
    return { ok: false, error: SAVE_ERROR };
  }

  revalidatePath("/[locale]/producer/panel/settings", "page");
  return { ok: true };
}
