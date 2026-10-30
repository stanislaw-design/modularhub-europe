"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AccountContext,
  useAccountSessionState,
  type AccountContextValue,
} from "@/components/klient/useAccountSession";

// Spec 0078 AC-5: jedyne miejsce, które w przeglądarce ustala konto dla strony
// publicznej (jedno żądanie sesji dla nagłówka, serc ulubionych i formularzy).
// Ulubione pobiera tylko klient, jednym żądaniem na wizytę.
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccountSessionState();
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string> | null>(null);
  const isClient = account.status === "authenticated" && account.session.user.role === "client";

  useEffect(() => {
    if (!isClient) return;
    const controller = new AbortController();
    fetch("/api/me/favorites", { credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (body && typeof body === "object" && "ids" in body && Array.isArray(body.ids)) {
          setFavoriteIds(new Set(body.ids.filter((id): id is string => typeof id === "string")));
        }
      })
      .catch(() => {
        // Bez ulubionych serca zostają puste; kliknięcie nadal działa.
      });
    return () => controller.abort();
  }, [isClient]);

  const value = useMemo<AccountContextValue>(
    () => ({ account, favoriteIds: isClient ? favoriteIds : null }),
    [account, favoriteIds, isClient],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
