"use client";

import { archivePartnerAction, restorePartnerAction } from "@/app/[locale]/internal/conversations/actions";
import { ErrorLine, secondaryButtonClass, useRunAction } from "./shared";

// Archiwizacja i przywracanie firmy (AC-8). Blokadę (otwarte sprawy lub zadania) wylicza serwer
// i pokazuje w komunikacie, co ją powoduje.
export function PartnerArchiveControl({ partnerId, archived }: { partnerId: string; archived: boolean }) {
  const { run, isPending, error } = useRunAction();

  return (
    <div className="flex flex-col items-start gap-brand-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (archived || window.confirm("Zarchiwizować tę firmę? Zniknie z listy i z ekranu Najbliższe.")) {
            run(() => (archived ? restorePartnerAction(partnerId) : archivePartnerAction(partnerId)));
          }
        }}
        className={secondaryButtonClass}
      >
        {archived ? "Przywróć firmę" : "Archiwizuj firmę"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}
