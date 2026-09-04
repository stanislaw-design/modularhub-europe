import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Bramka sesji wspólna dla /klient/panel/* (spec 0024 AC-4, AC-5): wywoływana
// przez każdą z trzech podstron osobno, nie w layout.tsx, bo layout nie zna
// dokładnej ścieżki (i parametrów) podstrony, którą renderuje — żaden z
// trzech segmentów nie jest dynamiczny. selfHref jest budowany przez wywołującą
// stronę z jej własnych params/searchParams, więc powrót po zalogowaniu ląduje
// dokładnie tam, skąd klient przyszedł.
export async function requirePanelClientSession(locale: string, selfHref: string) {
  const session = await auth();
  if (!session) {
    redirect(`/${locale}/logowanie?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role === "producer") {
    redirect(`/${locale}/producent`);
  }
  if (session.user.role === "admin") {
    redirect(`/${locale}/internal/zapytania`);
  }
  return session;
}
