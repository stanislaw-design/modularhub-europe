"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { clearSessionHint, hasSessionHint } from "@/lib/session-hint";

export interface AccountSession {
  user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role: "client" | "producer" | "admin";
  };
}

// `unknown`: pierwsze renderowanie (serwer i hydracja), jeszcze nie wiadomo nic
// o ciasteczku; o tym, co widać, decyduje wtedy CSS na podstawie atrybutu
// `data-has-session` z <head> (spec 0078 AC-5). Reszta stanów powstaje w efekcie.
export type AccountState =
  | { status: "unknown" }
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; session: AccountSession };

export interface AccountContextValue {
  account: AccountState;
  /** Id produktów ulubionych klienta; `null`, dopóki nie wiadomo (anonim, ładowanie albo inna rola). */
  favoriteIds: ReadonlySet<string> | null;
}

export const AccountContext = createContext<AccountContextValue | null>(null);

const ANONYMOUS: AccountContextValue = { account: { status: "anonymous" }, favoriteIds: null };

function isAccountSession(value: unknown): value is AccountSession {
  if (typeof value !== "object" || value === null || !("user" in value)) return false;
  const user = (value as { user: unknown }).user;
  if (typeof user !== "object" || user === null || !("role" in user)) return false;
  const role = (user as { role: unknown }).role;
  return role === "client" || role === "producer" || role === "admin";
}

/**
 * Pobiera stan konta dla strony publicznej: bez ciasteczka wskazówki nie robi
 * żadnego żądania, z nim woła `/api/auth/session` (spec 0078 AC-5). Jedna
 * instancja żyje w `AccountProvider`; serwer i tak sam weryfikuje sesję przy
 * każdym dostępie do danych.
 */
export function useAccountSessionState(): AccountState {
  const [state, setState] = useState<AccountState>({ status: "unknown" });

  useEffect(() => {
    if (!hasSessionHint()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ciasteczko jest dostępne dopiero w przeglądarce
      setState({ status: "anonymous" });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    fetch("/api/auth/session", { credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (isAccountSession(body)) {
          setState({ status: "authenticated", session: body });
          return;
        }
        // Wskazówka bez sesji (wygasła albo wylogowanie w innej karcie): kasujemy ją.
        clearSessionHint();
        setState({ status: "anonymous" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Błąd sieci nie dowodzi braku sesji, więc wskazówka zostaje.
        setState({ status: "anonymous" });
      });
    return () => controller.abort();
  }, []);

  return state;
}

const subscribeNever = () => () => {};

// `false` tylko w renderze hydracji tego komponentu. Granica Suspense (np. nagłówek
// w layoucie) bywa hydratowana później niż `AccountProvider` zdąży zmienić stan w
// efekcie, więc konsument nie może ufać stanowi z kontekstu, dopóki sam nie
// zakończy hydracji: serwer wyrenderował `unknown`, a inna wartość to błąd #418.
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

const UNKNOWN: AccountContextValue = { account: { status: "unknown" }, favoriteIds: null };

/** Stan konta z najbliższego `AccountProvider`; poza nim (panele, testy) konto jest anonimowe. */
export function useAccountSession(): AccountState {
  const context = useContext(AccountContext);
  const hydrated = useHydrated();
  return (context ? (hydrated ? context : UNKNOWN) : ANONYMOUS).account;
}

/** Ulubione klienta z `AccountProvider` albo `null`, gdy jeszcze nieznane. */
export function useFavoriteIds(): ReadonlySet<string> | null {
  const context = useContext(AccountContext);
  const hydrated = useHydrated();
  return (context ? (hydrated ? context : UNKNOWN) : ANONYMOUS).favoriteIds;
}

export interface ContactPrefill {
  name: string;
  email: string;
  phone: string;
}

/**
 * Dane kontaktowe zalogowanego klienta do wstępnego wypełnienia formularza
 * (spec 0078: strona jest statyczna, więc dane nie przychodzą z serwera).
 * Zwraca `undefined` dla anonima, producenta, admina i w czasie ładowania.
 */
export function useClientContactPrefill(): ContactPrefill | undefined {
  const account = useAccountSession();
  if (account.status !== "authenticated" || account.session.user.role !== "client") return undefined;
  const { name, email, phone } = account.session.user;
  if (!email) return undefined;
  return { name: name ?? "", email, phone: phone ?? "" };
}
