import { getGuestLinkPlan } from "@/lib/cases/guest";
import { db } from "@/lib/db/client";
import { pendingRegistration } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";

// Bez "use server": wołane tylko z innych akcji, nigdy z przeglądarki.
// Spec 0070 AC-20, AC-23, AC-39: klient bez konta (zapytanie złożone przez doradcę, mail o
// opublikowanym podsumowaniu) zakłada konto pierwszym logowaniem linkiem z maila. Do tego
// potrzebna jest oczekująca rejestracja, którą zapisuje ta sama reguła co requestPanelLoginLink
// (getGuestLinkPlan). Best effort: zapytanie już istnieje, a klient i tak może poprosić o link sam.
export async function stageClientRegistration(email: string, name: string, phone: string | undefined): Promise<void> {
  try {
    const plan = await getGuestLinkPlan(email, new Date());
    if (!plan.stagePending) return;
    await db
      .insert(pendingRegistration)
      .values({ email, role: "client", payload: { name, phone: phone ?? "" } })
      .onConflictDoNothing({ target: pendingRegistration.email });
  } catch (error) {
    captureError(error, { path: "stageClientRegistration" });
  }
}
