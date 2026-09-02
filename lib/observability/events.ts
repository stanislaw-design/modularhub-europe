import "server-only";
import { PostHog } from "posthog-node";
import { waitUntil } from "@vercel/functions";
import { resolveEnvironment } from "./environment";
import { scrubProperties } from "./scrub";
import type { EventName, Role } from "./types";

// trackEvent() and identify() are server only: every business event (registration, a query,
// an offer, a payment) fires from a Server Action or Route Handler in this app, and posthog-node
// is a Node client, not a browser one. Because it never touches a cookie or localStorage, this
// also satisfies the cookieless requirement for free, ahead of scope item 5's consent banner,
// with no separate "in memory persistence" flag to set.
let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) {
    client = null;
    return client;
  }

  client = new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 });
  return client;
}

function flushAfterResponse(posthog: PostHog): void {
  waitUntil(
    posthog.flush().catch((flushError) => {
      console.error("[observability] PostHog flush failed", flushError);
    })
  );
}

// The only sanctioned way to report a business event (AC-5). `distinctId` is always supplied
// by the caller (AC-4), never read from a persisted identifier. Never throws and never blocks
// the caller (AC-6); flushed inside `waitUntil()` before the function is allowed to suspend.
export function trackEvent(
  name: EventName,
  properties: Record<string, unknown>,
  distinctId: string
): void {
  try {
    const posthog = getClient();
    if (!posthog) return;

    posthog.capture({
      distinctId,
      event: name,
      properties: {
        ...scrubProperties(properties),
        environment: resolveEnvironment(),
      },
    });
    flushAfterResponse(posthog);
  } catch (trackFailure) {
    console.error("[observability] trackEvent failed", trackFailure);
  }
}

// No-ops until a real session exists (Auth.js is planned but not wired in yet); the feature
// that ships the first real login calls this once to alias the caller's prior anonymous
// `distinctId` to the real user.
export function identify(userId: string, role: Role, distinctId: string): void {
  try {
    const posthog = getClient();
    if (!posthog) return;

    posthog.identify({
      distinctId,
      properties: { userId, role },
    });
    flushAfterResponse(posthog);
  } catch (identifyFailure) {
    console.error("[observability] identify failed", identifyFailure);
  }
}
