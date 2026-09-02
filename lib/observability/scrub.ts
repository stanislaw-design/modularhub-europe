// AC-1 / key invariant: email, name, phone, address, payment details, and document contents
// never reach Sentry or PostHog. Matched by key, case insensitive, on whatever shape a caller
// or the Sentry SDK's own auto collection hands us.
const FORBIDDEN_KEY_PATTERN =
  /email|name|phone|address|payment|card|iban|document|attachment|postal|zip/i;

export function scrubProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) continue;
    scrubbed[key] = value;
  }
  return scrubbed;
}

type ScrubableSentryEvent = {
  user?: ({ id?: string | number } & Record<string, unknown>) | null;
  request?: {
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, string>;
  };
  extra?: Record<string, unknown>;
};

// Sentry's dataCollection option is left at its conservative default (no sendDefaultPii),
// this hook is the second, explicit layer: strip anything a future integration or
// autocapture path might still attach.
export function scrubSentryEvent<T extends ScrubableSentryEvent>(event: T): T {
  if (event.user) {
    const { id } = event.user;
    event.user = id ? { id } : null;
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete headers["authorization"];
      delete headers["Authorization"];
      delete headers["cookie"];
      delete headers["Cookie"];
      event.request.headers = headers;
    }
  }
  if (event.extra) {
    event.extra = scrubProperties(event.extra);
  }
  return event;
}
