import { Check, Circle, LoaderCircle } from "lucide-react";
import { DataText, Text } from "@/components/ui";

const stages = ["Bezpieczny upload", "Skan i OCR", "Porządkowanie danych", "Przegląd producenta"] as const;

export function HousePdfImportProgress({ progress, currentStage }: { progress: number; currentStage: string }) {
  const activeIndex = progress >= 100 ? 3 : progress >= 55 ? 2 : progress >= 15 ? 1 : 0;

  return (
    <section aria-labelledby="house-ai-progress-heading" className="rounded-card border border-brand-steel bg-brand-warm-white p-brand-3">
      <div className="flex flex-wrap items-end justify-between gap-brand-2">
        <div>
          <Text as="p" variant="label" tone="muted">Analiza dokumentów</Text>
          <div id="house-ai-progress-heading"><Text as="h2" variant="bodyL">{currentStage}</Text></div>
        </div>
        <DataText>{progress}%</DataText>
      </div>
      <progress className="mt-brand-2 h-2 w-full accent-brand-passage-blue" value={progress} max={100}>
        {progress}%
      </progress>
      <ol className="mt-brand-3 grid gap-brand-2 md:grid-cols-4">
        {stages.map((stage, index) => {
          const completed = index < activeIndex || progress >= 100;
          const current = index === activeIndex && progress < 100;
          const Icon = completed ? Check : current ? LoaderCircle : Circle;
          return (
            <li key={stage} aria-current={current ? "step" : undefined} className="flex items-center gap-brand-1 text-body">
              <Icon className={`size-5 shrink-0 ${completed ? "text-status-approved" : current ? "text-brand-passage-blue" : "text-brand-technical-graphite"}`} aria-hidden="true" />
              <span>{stage}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
