"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
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
  surface?: "v3" | "v5";
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
  surface = "v3",
}: FavoriteButtonProps) {
  const t = useTranslations("FavoriteButton");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isV5 = surface === "v5";

  const baseClassName = isV5
    ? "focus-ring flex items-center justify-center rounded-data bg-brand-v5-surface/95 p-1.5 shadow-sm transition-opacity hover:opacity-80"
    : "focus-ring flex items-center justify-center rounded-data bg-brand-warm-white/95 p-1.5 shadow-sm transition-opacity hover:opacity-80";

  if (!isClientSession) {
    const query = searchParams.toString();
    const returnHref = `${pathname}${query ? `?${query}` : ""}`;
    return (
      <Link
        href={`/${locale}/login?callbackUrl=${encodeURIComponent(returnHref)}`}
        aria-label={t("signInToFavorite", { name: productName })}
        className={`${baseClassName} ${className ?? ""}`}
      >
        <Heart className={`size-4 ${isV5 ? "text-brand-v5-ink" : "text-brand-foundation-navy"}`} aria-hidden="true" />
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
        setError(result.error ?? t("genericError"));
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
          aria-label={favorited ? t("removeFavorite", { name: productName }) : t("addFavorite", { name: productName })}
          className={`${baseClassName} disabled:opacity-60`}
        >
          <Heart
            className={
              favorited
                ? isV5
                  ? "size-4 fill-brand-v5-amber-strong text-brand-v5-amber-strong"
                  : "size-4 fill-brand-passage-blue text-brand-passage-blue"
                : isV5
                  ? "size-4 text-brand-v5-ink"
                  : "size-4 text-brand-foundation-navy"
            }
            aria-hidden="true"
          />
        </button>
        {error && (
          <p
            role="alert"
            className="absolute right-0 top-full z-20 mt-1 w-40 rounded-data bg-status-blocked-fill px-2 py-1 text-label text-brand-white shadow-sm"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
