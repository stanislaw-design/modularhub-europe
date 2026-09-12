import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Bramka sesji wspólna dla /panel/* klienta (spec 0024 AC-4, AC-5): wywoływana
// przez każdą z trzech podstron osobno, nie w layout.tsx, bo layout nie zna
// dokładnej ścieżki (i parametrów) podstrony, którą renderuje — żaden z
// trzech segmentów nie jest dynamiczny. selfHref jest budowany przez wywołującą
// stronę z jej własnych params/searchParams, więc powrót po zalogowaniu ląduje
// dokładnie tam, skąd klient przyszedł.
export async function requirePanelClientSession(locale: string, selfHref: string) {
  const session = await auth();
  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role === "producer") {
    redirect(`/${locale}/producer`);
  }
  if (session.user.role === "admin") {
    redirect(`/${locale}/internal/inquiries`);
  }
  return session;
}

// Bramka sesji wspólna dla /producer/panel/* (spec 0032 AC-1), mirror
// requirePanelClientSession: brak sesji -> logowanie z powrotem; rola client ->
// panel klienta; rola admin -> widok wewnętrzny.
export async function requirePanelProducerSession(locale: string, selfHref: string) {
  const session = await auth();
  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role === "client") {
    redirect(`/${locale}/panel`);
  }
  if (session.user.role === "admin") {
    redirect(`/${locale}/internal/inquiries`);
  }
  return session;
}
