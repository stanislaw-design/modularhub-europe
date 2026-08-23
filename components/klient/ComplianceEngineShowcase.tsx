import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck2 } from "lucide-react";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";

interface ComplianceEngineShowcaseProps {
  locale: string;
}

const checklist = [
  { label: "Konstrukcja", status: "ok" as const },
  { label: "Izolacja", status: "ok" as const },
  { label: "Wentylacja", status: "ok" as const },
  { label: "Dokumentacja", status: "ok" as const },
  { label: "Lokalne pozwolenie", status: "warning" as const },
];

// One hard-coded illustrative example (not real EligibilityByCountry data,
// spec 0015 AC-6) — deliberately styled as a technology/SaaS surface (dark
// card, monospace figures via DataText) so Compliance Engine™ reads as a
// real competitive advantage, not one of four interchangeable benefit tiles
// (the old WhyUs treatment this section replaces). Status text always
// renders in white; only the paired icon carries the status color, so the
// state is never color-only and stays readable on the dark card.
export function ComplianceEngineShowcase({ locale }: ComplianceEngineShowcaseProps) {
  return (
    <section className="py-brand-5">
      <div className="grid grid-cols-1 items-center gap-brand-5 lg:grid-cols-12">
        <div className="flex flex-col gap-brand-3 lg:col-span-5">
          <span className="flex items-center gap-brand-1 text-label font-semibold tracking-[0.1em] text-brand-v5-ink">
            <FileCheck2 className="size-4" aria-hidden="true" />
            Compliance Engine™
          </span>
          <Heading level="h2">Sprawdzamy zgodność z prawem, zanim Ty to zrobisz</Heading>
          <Text tone="muted" className="text-body-l">
            Każdy dom porównujemy z lokalnymi przepisami budowlanymi kraju docelowego —
            konstrukcją, izolacją, wentylacją i wymaganą dokumentacją — zanim wyślesz zapytanie do
            producenta.
          </Text>
        </div>
        <div className="lg:col-span-7">
          <div className="flex flex-col gap-brand-3 rounded-v5-panel bg-brand-v5-night p-brand-4 text-brand-v5-surface">
            <div className="flex items-start justify-between gap-brand-2">
              <div className="flex flex-col gap-0.5">
                <Text className="text-body-l font-semibold text-brand-v5-surface">
                  Nordic 126
                </Text>
                <Text className="text-data text-brand-v4-mist">Lokalizacja: Venlo, Holandia</Text>
              </div>
              <div className="flex flex-col items-end">
                <DataText className="text-h2 font-semibold text-brand-v5-amber">92%</DataText>
                <Text className="text-data text-brand-v4-mist">zgodności</Text>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-brand-v4-line-dark border-t border-brand-v4-line-dark">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-brand-2 py-brand-2"
                >
                  <DataText className="text-data text-brand-v5-surface">{item.label}</DataText>
                  {item.status === "ok" ? (
                    <span className="flex items-center gap-1 text-data text-brand-v5-surface">
                      <CheckCircle2 className="size-4 text-status-approved" aria-hidden="true" />
                      Spełnione
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-data text-brand-v5-surface">
                      <AlertTriangle className="size-4 text-status-conditional" aria-hidden="true" />
                      Wymaga uwagi
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/klient/wyniki`}
              className="focus-ring inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
            >
              Sprawdź dom
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
