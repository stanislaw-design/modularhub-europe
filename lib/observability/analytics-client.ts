import type { PostHog } from "posthog-js";
import { readConsent } from "./analytics-consent";
import { isAnalyticsEnabled } from "./analytics-enabled";

// Spec 0079: jedyny moduł, który w przeglądarce wie o posthog-js (reguła ESLint
// ze spec 0021 zostaje bez wyjątków). Biblioteka jest pobierana dynamicznym
// import() dopiero po akceptacji zgody (AC-2): przed decyzją i po odmowie nie ma
// żadnego żądania, cookies ani wpisu w storage.

export type PageType =
  | "home"
  | "results"
  | "project"
  | "sauna"
  | "outdoor_tv"
  | "modularproject"
  | "producer"
  | "other";

export interface PageviewProperties {
  page_path: string;
  locale: string;
  page_type: PageType;
  producer_id?: string;
  product_id?: string;
  family?: string;
}

// Strony szczegółu, na których pageview wysyła komponent atrybucji strony
// (z producer_id), a nie ogólny tracker (spec 0079, "Kto wysyła pageview").
export const ATTRIBUTED_PAGE_TYPES: ReadonlySet<PageType> = new Set([
  "project",
  "sauna",
  "outdoor_tv",
  "modularproject",
  "producer",
]);

const DETAIL_SEGMENT_TYPES: Record<string, PageType> = {
  project: "project",
  sauna: "sauna",
  "outdoor-tv": "outdoor_tv",
  modularprojects: "modularproject",
  producers: "producer",
};

// `pathname` bez prefiksu języka (usePathname z lib/i18n/navigation).
export function pageTypeFromPath(pathname: string): PageType {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "home";
  if (segments[0] === "results") return "results";
  const detail = DETAIL_SEGMENT_TYPES[segments[0]];
  if (detail && segments.length >= 2) return detail;
  return "other";
}

let posthogPromise: Promise<PostHog> | null = null;
let started = false;
let lastPageview: PageviewProperties | null = null;
let pagehideBound = false;

function loadPosthog(): Promise<PostHog> {
  posthogPromise ??= import("posthog-js").then(({ default: posthog }) => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not set");
    posthog.init(key, {
      // Zdarzenia idą przez naszą domenę (AC-4); ui_host tylko dla linków z panelu PostHog.
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      // Po zgodzie identyfikator jest trwały (spec 0079, "Zgoda na ruch").
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
      opt_out_capturing_by_default: true,
    });
    return posthog;
  });
  return posthogPromise;
}

function bindPagehide(posthog: PostHog) {
  if (pagehideBound) return;
  pagehideBound = true;
  window.addEventListener("pagehide", () => {
    if (!started || !lastPageview) return;
    posthog.capture("$pageleave", lastPageview, { transport: "sendBeacon" });
  });
}

// Wszystko, co posthog-js zapisuje w przeglądarce, ma prefiks `ph_` albo `__ph_`
// (identyfikator, okno, flaga opt-out). Po wycofaniu zgody nic z tego nie zostaje.
const POSTHOG_STORAGE_PREFIX = /^(__)?ph_/;

function clearPosthogStorage(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      Object.keys(storage)
        .filter((key) => POSTHOG_STORAGE_PREFIX.test(key))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // storage niedostępny: nie ma też czego czyścić
    }
  }
  const host = window.location.hostname;
  const domains = ["", `; domain=${host}`, `; domain=.${host}`];
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (!name || !POSTHOG_STORAGE_PREFIX.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

// Start pomiaru po akceptacji; idempotentny. `$opt_in` wysyłamy najwyżej raz na
// zgodę (posthog-js domyślnie wysyła je przy każdym wywołaniu), a w ogóle go nie
// potrzebujemy, więc `captureEventName: false`.
export async function startAnalytics(): Promise<void> {
  if (started || !isAnalyticsEnabled() || readConsent() !== "granted") return;
  const posthog = await loadPosthog();
  // Zgoda mogła zostać wycofana w trakcie ładowania biblioteki, albo drugie
  // równoległe wywołanie już zdążyło wystartować.
  if (started || readConsent() !== "granted") return;
  posthog.opt_in_capturing({ captureEventName: false });
  started = true;
  bindPagehide(posthog);
}

// Wycofanie zgody zatrzymuje pomiar natychmiast i czyści identyfikator (AC-3).
// Kolejność ma znaczenie: `reset()` od razu zapisuje nowy identyfikator, więc
// idzie przed `opt_out_capturing()`, a na końcu czyścimy wszystko, co zostało.
export async function stopAnalytics(): Promise<void> {
  started = false;
  lastPageview = null;
  if (posthogPromise) {
    const posthog = await posthogPromise.catch(() => null);
    if (posthog) {
      posthog.reset();
      posthog.opt_out_capturing();
    }
  }
  clearPosthogStorage();
}

export async function trackPageview(properties: PageviewProperties): Promise<void> {
  try {
    await startAnalytics();
    if (!started || readConsent() !== "granted") return;
    const posthog = await loadPosthog();
    if (lastPageview) posthog.capture("$pageleave", lastPageview);
    posthog.capture("$pageview", { ...properties, environment: "production" });
    lastPageview = properties;
  } catch {
    // Pomiar nigdy nie psuje strony.
  }
}
