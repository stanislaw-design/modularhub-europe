import { captureError } from "./errors";

// Odczyt REST Sentry dla /internal/monitoring (spec 0055 AC-15, AC-9, AC-17):
// jedyne miejsce poza sentry.*.config.ts, gdzie ten plik wie o Sentry — stąd
// tutaj, nie w lib/admin-monitoring.ts (ESLint no-restricted-imports pilnuje
// wyłącznie importu pakietu @sentry/nextjs, ale to REST API tego samego
// dostawcy, więc zostaje w jednym miejscu razem z nim, patrz AGENTS.md).
// Prosty fetch do REST API (nie SDK): to jednorazowy odczyt przy wejściu na
// stronę, nie strumień zdarzeń. next: { revalidate: 60 } cache'uje odpowiedź
// ~60s (spec Configuration required), limit czasu 5s (AC-9), błąd/timeout ->
// captureError i stan "niedostępne", reszta strony renderuje się normalnie.
//
// Osobny sekret SENTRY_MONITORING_TOKEN, nie SENTRY_AUTH_TOKEN (spec 0055
// Follow-up): ten drugi już wgrywa sourcemapy przy buildzie i poszerzanie
// jego zakresu o odczyt zamiast osobnego tokena byłoby niepotrzebnym
// zwiększeniem uprawnień czegoś, co już działa.

export interface SentryIssueSummary {
  id: string;
  title: string;
  count: number;
  lastSeen: string;
  permalink: string;
}

export type SentryIssuesResult = { ok: true; issues: SentryIssueSummary[] } | { ok: false };

interface SentryApiIssue {
  id: string;
  title: string;
  count: string;
  lastSeen: string;
  permalink: string;
}

export async function getRecentSentryIssues(): Promise<SentryIssuesResult> {
  const token = process.env.SENTRY_MONITORING_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const baseUrl = process.env.SENTRY_URL || "https://sentry.io";

  if (!token || !org || !project) {
    captureError(new Error("Sentry monitoring misconfigured: SENTRY_MONITORING_TOKEN/SENTRY_ORG/SENTRY_PROJECT missing"), {
      path: "getRecentSentryIssues",
    });
    return { ok: false };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/0/projects/${org}/${project}/issues/?limit=10&query=is:unresolved&sort=date`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) throw new Error(`Sentry issues request failed with ${response.status}`);

    const data = (await response.json()) as SentryApiIssue[];
    return {
      ok: true,
      issues: data.map((issue) => ({
        id: issue.id,
        title: issue.title,
        count: Number(issue.count),
        lastSeen: issue.lastSeen,
        permalink: issue.permalink,
      })),
    };
  } catch (error) {
    captureError(error, { path: "getRecentSentryIssues" });
    return { ok: false };
  }
}
