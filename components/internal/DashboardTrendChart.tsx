"use client";

import type { ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface DashboardTrendChartPoint {
  day: string;
  registrations: number;
  inquiries: number;
}

interface DashboardTrendChartProps {
  data: DashboardTrendChartPoint[];
}

function formatDayLabel(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

const xAxisTickFormatter = (value: string) => formatDayLabel(value);
const tooltipLabelFormatter = (label: ReactNode) => formatDayLabel(String(label));

// Wykres trendu na dashboardzie (spec 0055 AC-7): dwie serie dzienne z
// ostatnich 30 dni (Europe/Warsaw), dane już policzone i uzupełnione zerami
// w getAdminDashboardTrend (lib/db/queries.ts) — ten komponent tylko rysuje.
// Kolory przez zmienne CSS (var(...)), nie klasy Tailwind, bo Recharts
// wstrzykuje je do atrybutów SVG (stroke/fill), nie do className, a te
// zmienne już poprawnie odwracają się pod theme-internal.dark.
export function DashboardTrendChart({ data }: DashboardTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-steel)" />
        <XAxis
          dataKey="day"
          tickFormatter={xAxisTickFormatter}
          stroke="var(--brand-technical-graphite)"
          tick={{ fill: "var(--brand-technical-graphite)", fontSize: 12 }}
          interval={4}
        />
        <YAxis
          allowDecimals={false}
          stroke="var(--brand-technical-graphite)"
          tick={{ fill: "var(--brand-technical-graphite)", fontSize: 12 }}
          width={32}
        />
        <Tooltip
          labelFormatter={tooltipLabelFormatter}
          contentStyle={{
            background: "var(--brand-warm-white)",
            border: "1px solid var(--brand-steel)",
            color: "var(--brand-foundation-navy)",
          }}
        />
        <Legend wrapperStyle={{ color: "var(--brand-technical-graphite)", fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="registrations"
          name="Nowe rejestracje"
          stroke="var(--brand-foundation-navy)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="inquiries"
          name="Nowe zapytania"
          stroke="var(--brand-passage-blue)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
