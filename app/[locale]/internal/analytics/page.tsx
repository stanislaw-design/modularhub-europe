import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BarList } from "@/components/internal/analytics/BarList";
import { PageRankings } from "@/components/internal/analytics/PageRankings";
import { ProducerRanking } from "@/components/internal/analytics/ProducerRanking";
import { StatTile, computeDelta } from "@/components/internal/analytics/StatTile";
import { TrafficTrendChart } from "@/components/internal/analytics/TrafficTrendChart";
import { EmailsView, ProducerDetailView } from "@/components/internal/AnalyticsEmailViews";
import { Card, Heading, Stack, Text } from "@/components/ui";
import { getProducerNamesByIds } from "@/lib/db/queries";
import {
  getPagesReport,
  getProducerTraffic,
  getTrafficSummary,
  type AnalyticsRange,
} from "@/lib/observability/posthog-metrics";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const RANGES: AnalyticsRange[] = [7, 30, 90];
const VIEWS = [
  { key: "traffic", label: "Odwiedziny" },
  { key: "pages", label: "Strony" },
  { key: "producers", label: "Producenci" },
  { key: "emails", label: "Maile" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

function parseRange(value: string | undefined): AnalyticsRange {
  const parsed = Number(value);
  return parsed === 7 || parsed === 90 ? parsed : 30;
}

function parseView(value: string | undefined): ViewKey {
  return VIEWS.find((view) => view.key === value)?.key ?? "traffic";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)} min ${String(rounded % 60).padStart(2, "0")} s`;
}

function Unavailable() {
  return (
    <Text as="p" tone="muted">
      Niedostępne (PostHog nie odpowiada). Pozostałe źródła działają normalnie.
    </Text>
  );
}

// Etykiety wartości `page_type` ze zdarzenia $pageview (spec 0079). Nieznana wartość
// zostaje surowa, żeby nowy typ strony nie znikał z rankingu.
const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "Strona główna",
  results: "Wyniki wyszukiwania",
  project: "Strony domów",
  sauna: "Strony saun",
  outdoor_tv: "Strony outdoor TV",
  modularproject: "Strony projektów modułowych",
  producer: "Strony producentów",
  other: "Pozostałe strony",
};

const pillClass = (active: boolean) =>
  `focus-ring rounded-marketing border px-brand-2 py-1 text-body ${active ? "border-brand-passage-blue bg-brand-passage-blue/10 font-semibold" : "border-brand-steel"}`;

// Spec 0079 AC-7 do AC-9, AC-11: ruch z PostHog, każde źródło osobno. Ta sama
// inline bramka sesji co inne ekrany /internal (kopia, nie wspólny layout).
export default async function InternalAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; view?: string; producer?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/analytics`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const range = parseRange(query.range);
  const view = parseView(query.view);
  const href = (nextView: ViewKey, nextRange: AnalyticsRange) => `${selfHref}?view=${nextView}&range=${nextRange}`;
  // AC-9: szczegół jednego producenta; rozpoznajemy go tylko po poprawnym uuid.
  const producerId = query.producer && UUID_PATTERN.test(query.producer) ? query.producer : null;
  const producerHref = (id: string) => `${selfHref}?view=producers&range=${range}&producer=${id}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-brand-2">
        <Heading level="h1">{VIEWS.find((item) => item.key === view)?.label}</Heading>
        <nav aria-label="Zakres dni" className="flex flex-wrap items-center gap-brand-1">
          {RANGES.map((value) => (
            <Link
              key={value}
              href={href(view, value)}
              aria-current={value === range ? "true" : undefined}
              className={pillClass(value === range)}
            >
              {value} dni
            </Link>
          ))}
        </nav>
      </div>
      <Text as="p" tone="muted" className="hidden md:block">
        Liczby obejmują tylko odwiedzających, którzy kliknęli „Akceptuję” w banerze zgody, więc są niższe niż prawdziwy ruch.
        Służą do trendów i porównań, nie do bezwzględnej liczby gości.
      </Text>

      {view === "traffic" && <TrafficView range={range} />}
      {view === "pages" && <PagesView range={range} />}
      {view === "producers" &&
        (producerId ? (
          <ProducerDetailView producerId={producerId} range={range} backHref={href("producers", range)} />
        ) : (
          <ProducersView range={range} producerHref={producerHref} />
        ))}
      {view === "emails" && <EmailsView range={range} producerHref={producerHref} />}
    </>
  );
}

async function TrafficView({ range }: { range: AnalyticsRange }) {
  const result = await getTrafficSummary(range);
  if (!result.ok) return <Unavailable />;
  const { daily, previousDaily, previous } = result.data;
  const comparedTo = `poprzednie ${range} dni`;
  const tiles = [
    {
      label: "Unikalni odwiedzający",
      value: String(result.data.visitors),
      delta: computeDelta(result.data.visitors, previous.visitors),
      hint: "Ile różnych osób weszło na portal.",
    },
    {
      label: "Wizyty",
      value: String(result.data.sessions),
      delta: computeDelta(result.data.sessions, previous.sessions),
      hint: "Ile razy ktoś wszedł na portal. Jedna osoba może wejść kilka razy.",
    },
    {
      label: "Obejrzane strony",
      value: String(result.data.pageviews),
      delta: computeDelta(result.data.pageviews, previous.pageviews),
      hint: "Łączna liczba otwartych stron.",
    },
    {
      label: "Czas jednej wizyty",
      value: formatDuration(result.data.avgSessionSeconds),
      delta: computeDelta(result.data.avgSessionSeconds, previous.avgSessionSeconds),
      hint: "Średnio tyle osoba spędza na portalu podczas jednej wizyty.",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} comparedTo={comparedTo} />
        ))}
      </div>
      <Card>
        <Stack gap={2}>
          <Text as="span" variant="label" tone="muted">
            Ilu ludzi odwiedza portal dzień po dniu?
          </Text>
          <TrafficTrendChart daily={daily} previousDaily={previousDaily} rangeDays={range} />
        </Stack>
      </Card>
    </>
  );
}

async function PagesView({ range }: { range: AnalyticsRange }) {
  const result = await getPagesReport(range);
  if (!result.ok) return <Unavailable />;
  const { top, entry, exit, types } = result.data;
  const typesTotal = types.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <Stack gap={2}>
            <Text as="span" variant="label" tone="muted">
              Ranking stron
            </Text>
            <PageRankings top={top} entry={entry} exit={exit} />
          </Stack>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <Stack gap={2}>
            <Text as="span" variant="label" tone="muted">
              Czego szukają odwiedzający?
            </Text>
            <Text as="p" tone="muted">
              Wyświetlenia stron według rodzaju strony.
            </Text>
            <BarList
              rows={types.map((row) => ({
                key: row.path || "(brak)",
                label: PAGE_TYPE_LABELS[row.path] ?? (row.path || "Bez rodzaju"),
                value: row.count,
                detail: typesTotal > 0 ? `${Math.round((row.count / typesTotal) * 100)}% wyświetleń` : undefined,
              }))}
            />
          </Stack>
        </Card>
      </div>
    </div>
  );
}

async function ProducersView({ range, producerHref }: { range: AnalyticsRange; producerHref: (id: string) => string }) {
  const result = await getProducerTraffic(range);
  if (!result.ok) return <Unavailable />;
  const rows = result.data;
  // Nazwy z Neon; awaria bazy nie psuje rankingu (zostają same identyfikatory).
  const names = await getProducerNamesByIds(rows.map((row) => row.producerId)).catch(() => new Map<string, string>());

  return (
    <Card>
      <Stack gap={2}>
        <Text as="span" variant="label" tone="muted">
          Ranking producentów po wyświetleniach
        </Text>
        <ProducerRanking
          rows={rows.map((row) => ({
            ...row,
            name: names.get(row.producerId) ?? row.producerId,
            href: producerHref(row.producerId),
          }))}
        />
      </Stack>
    </Card>
  );
}
