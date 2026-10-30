"use server";

import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { SESSION_HINT_COOKIE } from "@/lib/session-hint";

export async function signOutAction() {
  // Spec 0078 AC-5: wskazówka znika razem z sesją, inaczej nagłówek strony
  // publicznej do końca życia ciasteczka rysowałby szkielet przycisku konta.
  (await cookies()).delete(SESSION_HINT_COOKIE);
  await signOut();
}
