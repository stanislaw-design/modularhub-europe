"use client";

import { useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  isConsentSettingsOpen,
  subscribeConsent,
  type ConsentDecision,
} from "@/lib/observability/analytics-consent";

// Po stronie serwera i podczas hydracji zawsze `null` i `false`, więc baner nie
// miga w prerenderowanym szkielecie (spec 0079, "Kolejność ładowania i cache").
export function useAnalyticsConsent(): { decision: ConsentDecision | null; settingsOpen: boolean; hydrated: boolean } {
  const decision = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getConsentServerSnapshot);
  const settingsOpen = useSyncExternalStore(subscribeConsent, isConsentSettingsOpen, () => false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return { decision, settingsOpen, hydrated };
}
