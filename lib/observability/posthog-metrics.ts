import { captureError } from "./errors";

// Odczyt HogQL Query API PostHog dla dashboardu /internal (spec 0055 AC-6,
// AC-9, AC-17): jedyne miejsce poza events.ts, gdzie ten katalog wie o
// PostHog (posthog-node to klient do zapisu zdarzeń, nie do zapytań, więc
// zwykły fetch do REST API tego samego dostawcy, ten sam wzorzec co
// sentry-issues.ts). NEXT_PUBLIC_POSTHOG_HOST (host, nie sekret) plus osobny
// POSTHOG_PERSONAL_API_KEY (odczyt), nie NEXT_PUBLIC_POSTHOG_KEY (ten drugi
// jest tylko do zapisu zdarzeń z przeglądarki i nie nadaje się do odczytu,
// spec Configuration required). Limit czasu 5s (AC-9), cache ~60s, błąd/timeout
// -> captureError i stan "niedostępne", reszta dashboardu renderuje się normalnie.

export type PageviewsResult = { ok: true; count: number } | { ok: false };

export async function getPageviewsLast30Days(): Promise<PageviewsResult> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    captureError(new Error("PostHog monitoring misconfigured: POSTHOG_PERSONAL_API_KEY/NEXT_PUBLIC_POSTHOG_HOST missing"), {
      path: "getPageviewsLast30Days",
    });
    return { ok: false };
  }

  try {
    const response = await fetch(`${host}/api/projects/@current/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: "select count() from events where event = '$pageview' and timestamp >= now() - interval 30 day",
        },
      }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`PostHog query request failed with ${response.status}`);

    const data = (await response.json()) as { results?: Array<[number]> };
    const count = data.results?.[0]?.[0];
    if (typeof count !== "number") throw new Error("PostHog query response missing a numeric count");

    return { ok: true, count };
  } catch (error) {
    captureError(error, { path: "getPageviewsLast30Days" });
    return { ok: false };
  }
}
