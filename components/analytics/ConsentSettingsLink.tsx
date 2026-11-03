"use client";

import { openConsentSettings } from "@/lib/observability/analytics-consent";
import { isAnalyticsEnabled } from "@/lib/observability/analytics-enabled";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

// Spec 0079 AC-3: powrót do decyzji o zgodzie (stopka). Poza produkcją pomiaru
// nie ma, więc i linku nie pokazujemy.
export function ConsentSettingsLink({ label, className }: { label: string; className?: string }) {
  const { hydrated } = useAnalyticsConsent();
  if (!hydrated || !isAnalyticsEnabled()) return null;
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      {label}
    </button>
  );
}
