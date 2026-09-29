import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardTrendChart } from "@/components/internal/DashboardTrendChart";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import {
  getAdminActivityFeed,
  getAdminDashboardAccountCounts,
  getAdminDashboardCoreCounts,
  getAdminDashboardTrend,
} from "@/lib/db/queries";
import { getPageviewsLast30Days } from "@/lib/observability/posthog-metrics";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Dashboard /internal (spec 0055 Build plan zadania 3, 4, 5, 6, 7): ten sam
// wzorzec auth co /internal/products (patrz internal/products/AGENTS.md).
// Kafelek ruchu (AC-6) jest jedynym, który może zawieść niezależnie od
// reszty (PostHog nie odpowiada/limit czasu) — value: null renderuje
// "Niedostępne" zamiast liczby, bez psucia pozostałych kafelków (AC-9).
export default async function InternalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const [
    { activeClientCount, activeProducerCount },
    { projectCount, inquiryCount, offerCount },
    trend,
    activity,
    pageviewsResult,
  ] = await Promise.all([
    getAdminDashboardAccountCounts(),
    getAdminDashboardCoreCounts(),
    getAdminDashboardTrend(),
    getAdminActivityFeed(),
    getPageviewsLast30Days(),
  ]);

  const tiles: Array<{ label: string; value: number | null }> = [
    { label: "Aktywne konta klientów", value: activeClientCount },
    { label: "Aktywne konta producentów", value: activeProducerCount },
    { label: "Projekty", value: projectCount },
    { label: "Zapytania", value: inquiryCount },
    { label: "Oferty", value: offerCount },
    { label: "Wyświetlenia stron (30 dni)", value: pageviewsResult.ok ? pageviewsResult.count : null },
  ];

  return (
    <>
      <Heading level="h1">Dashboard</Heading>
      <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <Text as="span" variant="label" tone="muted">
              {tile.label}
            </Text>
            {tile.value === null ? (
              <Text as="p" tone="muted">
                Niedostępne
              </Text>
            ) : (
              <DataText as="p" className="text-h2">
                {tile.value}
              </DataText>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <Stack gap={2}>
          <Text as="span" variant="label" tone="muted">
            Trend (ostatnie 30 dni)
          </Text>
          <DashboardTrendChart data={trend} />
        </Stack>
      </Card>

      <Card>
        <Stack gap={2}>
          <Text as="span" variant="label" tone="muted">
            Ostatnia aktywność
          </Text>
          {activity.length === 0 ? (
            <Text tone="muted">Brak aktywności.</Text>
          ) : (
            <ul className="flex flex-col gap-brand-2">
              {activity.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-brand-2 border-b border-brand-steel/50 pb-brand-1">
                  <span>
                    <span className="font-medium">{item.label}</span> — {item.detail}
                  </span>
                  <span className="shrink-0 text-brand-technical-graphite">{dateFormatter.format(item.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
    </>
  );
}
