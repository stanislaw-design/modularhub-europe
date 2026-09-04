"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/favorite-actions";

interface FavoriteButtonProps {
  productId: string;
  productName: string;
  locale: string;
  /** Sesja istnieje i ma rolę client (spec 0024 Key invariants); w przeciwnym
   * razie serce jest linkiem do logowania, nie wywołuje toggleFavorite. */
  isClientSession: boolean;
  initialFavorited: boolean;
  className?: string;
}

// Serce widoczne na ResultCard (/wyniki) i stronie szczegółów projektu (spec
// 0024 AC-2, AC-4). Bez sesji klienta jest linkiem do logowania z zachowanym
// powrotem (bieżąca ścieżka i parametry URL), nie wywołuje akcji serwerowej —
// dopiero zalogowany klient dostaje przycisk. Optymistyczna zmiana stanu,
// cofnięta przy błędzie zapisu (AC-8): kolejny klik jest jednocześnie ponowem,
// bo toggleFavorite jest idempotentny na docelowym stanie.
export function FavoriteButton({
  productId,
  productName,
  locale,
  isClientSession,
  initialFavorited,
  className,
}: FavoriteButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseClassName =
    "focus-ring flex items-center justify-center rounded-data bg-brand-warm-white/95 p-1.5 shadow-sm hover:opacity-80";

  if (!isClientSession) {
    const query = searchParams.toString();
    const returnHref = `${pathname}${query ? `?${query}` : ""}`;
    return (
      <Link
        href={`/${locale}/logowanie?callbackUrl=${encodeURIComponent(returnHref)}`}
        aria-label={`Zaloguj się, żeby zapisać ${productName} do ulubionych`}
        className={`${baseClassName} ${className ?? ""}`}
      >
        <Heart className="size-4 text-brand-foundation-navy" aria-hidden="true" />
      </Link>
    );
  }

  function handleClick() {
    const next = !favorited;
    setFavorited(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleFavorite(productId, next);
      if (!result.ok) {
        setFavorited(!next);
        setError(result.error ?? "Nie udało się zapisać. Spróbuj ponownie.");
      }
    });
  }

  return (
    <div className={className ?? ""}>
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-pressed={favorited}
          aria-label={favorited ? `Usuń ${productName} z ulubionych` : `Dodaj ${productName} do ulubionych`}
          className={`${baseClassName} disabled:opacity-60`}
        >
          <Heart
            className={
              favorited
                ? "size-4 fill-brand-passage-blue text-brand-passage-blue"
                : "size-4 text-brand-foundation-navy"
            }
            aria-hidden="true"
          />
        </button>
        {error && (
          <p
            role="alert"
            className="absolute right-0 top-full z-20 mt-1 w-40 rounded-data bg-status-blocked px-2 py-1 text-label text-brand-warm-white shadow-sm"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
