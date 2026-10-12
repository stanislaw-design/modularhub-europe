import { signIn } from "@/auth";
import { getGuestLinkPlan } from "@/lib/cases/guest";
import { db } from "@/lib/db/client";
import { pendingRegistration } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";

// Spec 0066 AC-7, AC-8: wspólna wysyłka linku magicznego do gościa, używana
// przez zapytanie (submitAdvisoryInquiry) i ponowną wysyłkę (resendGuestCaseLink).
// Osobny plik, nie "use server", żeby nie stała się publiczną akcją.
export type GuestLinkResult = "sent" | "skipped" | "failed";

export async function sendGuestCaseLink(input: {
  inquiryId: string;
  email: string;
  name: string;
  phone: string;
  locale: string;
  // "new": nowy e mail, "existing": sprawa przypięta do istniejącego konta klienta.
  variant: "new" | "existing";
}): Promise<GuestLinkResult> {
  const email = input.email.toLowerCase();
  try {
    const plan = await getGuestLinkPlan(email, new Date());
    if (!plan.send) return "skipped";

    if (plan.stagePending) {
      await db
        .insert(pendingRegistration)
        .values({ email, role: "client", payload: { name: input.name, phone: input.phone } })
        .onConflictDoNothing({ target: pendingRegistration.email });
    }

    await signIn("resend", {
      email,
      redirect: false,
      redirectTo: `/${input.locale}/panel/inquiries/${input.inquiryId}?welcome=${input.variant}`,
    });
    return "sent";
  } catch (error) {
    captureError(error, { path: "cases:sendGuestCaseLink" });
    return "failed";
  }
}
