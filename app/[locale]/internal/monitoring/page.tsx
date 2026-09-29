import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminServicesHealth, type ServiceHealthStatus } from "@/lib/admin-monitoring";
import { Card, Heading, Stack, Text } from "@/components/ui";
import { getRecentSentryIssues } from "@/lib/observability/sentry-issues";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const healthLabel: Record<ServiceHealthStatus, string> = {
  ok: "Działa",
  error: "Błąd",
  unavailable: "Niedostępne",
};

const healthClass: Record<ServiceHealthStatus, string> = {
  ok: "text-status-approved",
  error: "text-status-blocked",
  unavailable: "text-brand-technical-graphite",
};

// Strona Monitoring (spec 0055 Build plan zadania 11, 12): ten sam wzorzec
// auth co /internal/products. Błędy z Sentry (AC-15) i stan trzech usług
// (AC-16) czytane na żywo przy każdym wejściu, każdy niezależnie (AC-9): jeśli
// jedno źródło nie odpowie, reszta strony i tak się renderuje.
export default async function InternalMonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/monitoring`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [sentryResult, health] = await Promise.all([getRecentSentryIssues(), getAdminServicesHealth()]);

  const services: Array<{ key: keyof typeof health; label: string }> = [
    { key: "database", label: "Baza danych" },
    { key: "storage", label: "Przechowywanie plików (R2)" },
    { key: "email", label: "E mail (Resend)" },
  ];

  return (
    <>
      <Heading level="h1">Monitoring</Heading>

      <Card>
        <Stack gap={3}>
          <Text as="span" variant="label" tone="muted">
            Stan usług
          </Text>
          <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-3">
            {services.map((service) => (
              <div key={service.key} className="flex items-center justify-between gap-brand-2 rounded-data border border-brand-steel p-brand-2">
                <Text as="span">{service.label}</Text>
                <Text as="span" className={`font-medium ${healthClass[health[service.key]]}`}>
                  {healthLabel[health[service.key]]}
                </Text>
              </div>
            ))}
          </div>
        </Stack>
      </Card>

      <Card>
        <Stack gap={2}>
          <Text as="span" variant="label" tone="muted">
            Ostatnie błędy (Sentry)
          </Text>
          {!sentryResult.ok ? (
            <Text tone="muted">Niedostępne.</Text>
          ) : sentryResult.issues.length === 0 ? (
            <Text tone="muted">Brak nierozwiązanych błędów.</Text>
          ) : (
            <ul className="flex flex-col gap-brand-2">
              {sentryResult.issues.map((issue) => (
                <li key={issue.id} className="flex items-baseline justify-between gap-brand-2 border-b border-brand-steel/50 pb-brand-1">
                  <a href={issue.permalink} target="_blank" rel="noreferrer" className="focus-ring rounded-data text-brand-passage-blue underline">
                    {issue.title}
                  </a>
                  <span className="shrink-0 text-brand-technical-graphite">
                    {issue.count}× · {dateFormatter.format(new Date(issue.lastSeen))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
    </>
  );
}
