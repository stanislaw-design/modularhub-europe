import type { NotificationEmailType } from "./send";

// Spec 0079 AC-13: siedem typów maili do producentów dostaje wpis w dzienniku (email_message),
// tag Resend `message_id` i UTM w linkach do naszej domeny. Każdy inny typ, w tym login_link,
// przechodzi przez sendNotificationEmail() bez zmian co do bajta.
export const TRACKED_EMAIL_TYPES = [
  "large_order_producer_request_closed",
  "large_order_producer_not_selected",
  "large_order_producer_connected",
  "large_order_producer_new_request",
  "large_order_producer_new_platform_project",
  "large_order_producer_platform_selection_done",
  "large_order_producer_reminder",
] as const satisfies readonly NotificationEmailType[];

export type TrackedEmailType = (typeof TRACKED_EMAIL_TYPES)[number];

export function isTrackedEmailType(type: NotificationEmailType): type is TrackedEmailType {
  return (TRACKED_EMAIL_TYPES as readonly NotificationEmailType[]).includes(type);
}

// Host bez "www.", małymi literami: apex i www liczą się jako ta sama domena.
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return normalizeHost(new URL(url).host);
  } catch {
    return null;
  }
}

function withUtm(rawUrl: string, campaign: string, ownHosts: ReadonlySet<string>): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return rawUrl;
  if (!ownHosts.has(normalizeHost(url.host))) return rawUrl;
  // Istniejące parametry utm_ zostają (nie nadpisujemy cudzej decyzji).
  if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "email");
  if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "producer_mail");
  if (!url.searchParams.has("utm_campaign")) url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

// Spec 0079 AC-13: UTM w linkach do naszej domeny, w HTML (atrybut href) i w tekście
// (gołe adresy). Linki mailto: i obce domeny zostają nietknięte.
export function addUtmToEmailBodies(
  bodies: { html?: string; text?: string },
  campaign: string,
  ownHosts: ReadonlySet<string>,
): { html?: string; text?: string } {
  const html = bodies.html?.replace(/(\bhref=")([^"]+)(")/gi, (_match, open: string, value: string, close: string) => {
    // Atrybut ma encje (&amp;), URL ich nie rozumie: dekodujemy przed i kodujemy po.
    const decoded = value.replace(/&amp;/g, "&");
    return `${open}${withUtm(decoded, campaign, ownHosts).replace(/&/g, "&amp;")}${close}`;
  });
  const text = bodies.text?.replace(/https?:\/\/[^\s<>"']+/gi, (match) => {
    // Końcowa interpunkcja zdania nie należy do adresu.
    const trailing = /[.,;:!?)]+$/.exec(match)?.[0] ?? "";
    const core = trailing ? match.slice(0, -trailing.length) : match;
    return `${withUtm(core, campaign, ownHosts)}${trailing}`;
  });
  return { html, text };
}
