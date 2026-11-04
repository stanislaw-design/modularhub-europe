"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DailyPoint {
  day: string;
  visitors: number;
  pageviews: number;
}

interface TrafficTrendChartProps {
  daily: DailyPoint[];
  /** Ten sam indeks co `daily`: dzień poprzedniego okresu. Bez niego nie ma linii porównawczej. */
  previousDaily?: DailyPoint[];
  rangeDays: number;
}

const METRICS = [
  { key: "visitors", label: "Odwiedzający", unit: "odwiedzających" },
  { key: "pageviews", label: "Obejrzane strony", unit: "wyświetleń stron" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

interface ChartRow {
  day: string;
  current: number;
  previous: number;
  previousDay: string;
}

const formatDay = (day: string) => {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
};

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
}

// Wykres trendu dziennego: pełna linia to bieżący okres, przerywana to ten sam
// dzień okresu poprzedniego. Kolory przez var(...), bo Recharts wstawia je do
// atrybutów SVG (patrz DashboardTrendChart).
export function TrafficTrendChart({ daily, previousDaily, rangeDays }: TrafficTrendChartProps) {
  const [metric, setMetric] = useState<MetricKey>("visitors");
  const meta = METRICS.find((item) => item.key === metric) ?? METRICS[0];

  const rows: ChartRow[] = daily.map((point, index) => ({
    day: point.day,
    current: point[metric],
    previous: previousDaily?.[index]?.[metric] ?? 0,
    previousDay: previousDaily?.[index]?.day ?? "",
  }));
  const total = rows.reduce((sum, row) => sum + row.current, 0);

  function renderTooltip({ active, payload }: TooltipProps) {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;
    return (
      <div className="rounded-data border border-brand-steel bg-brand-warm-white p-brand-1 text-data text-brand-foundation-navy shadow-sm">
        <p className="font-semibold">
          {formatDay(row.day)}: {row.current} {meta.unit}
        </p>
        {previousDaily && (
          <p className="text-brand-technical-graphite">
            {formatDay(row.previousDay)} (okres wcześniej): {row.previous}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <div className="flex flex-wrap items-center gap-brand-1" role="group" aria-label="Co pokazać na wykresie">
        {METRICS.map((item) => {
          const active = item.key === metric;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setMetric(item.key)}
              className={`focus-ring rounded-marketing border px-brand-2 py-1 text-body ${active ? "border-brand-passage-blue bg-brand-passage-blue/10 font-semibold" : "border-brand-steel"}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="img" aria-label={`Wykres dzienny: ${meta.label}, ostatnie ${rangeDays} dni, razem ${total}. Dane także w tooltipie.`}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-steel)" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              stroke="var(--brand-technical-graphite)"
              tick={{ fill: "var(--brand-technical-graphite)", fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              stroke="var(--brand-technical-graphite)"
              tick={{ fill: "var(--brand-technical-graphite)", fontSize: 12 }}
              width={32}
            />
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey="current"
              stroke="var(--brand-electric-plane)"
              strokeWidth={2}
              fill="var(--brand-passage-blue)"
              fillOpacity={0.18}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {previousDaily && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--brand-technical-graphite)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="flex flex-wrap items-center gap-brand-2 text-data text-brand-technical-graphite">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-5 bg-brand-electric-plane" aria-hidden="true" /> ostatnie {rangeDays} dni
        </span>
        {previousDaily && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-5 border-t-2 border-dashed border-brand-technical-graphite" aria-hidden="true" /> poprzednie {rangeDays} dni
          </span>
        )}
      </p>
    </div>
  );
}
