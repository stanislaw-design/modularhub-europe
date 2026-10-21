import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, Heading, Stack, Text } from "@/components/ui";

export interface ChecklistTask {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

interface ProducerProfileChecklistProps {
  heading: string;
  progressLabel: string;
  tasks: ChecklistTask[];
}

// Karta "Dokończ profil" (spec 0074 AC-6): pasek postępu i lista zadań.
// Zrobione zadania mają znaczek i nie są linkami, niezrobione prowadzą do
// właściwego ekranu. Gdy wszystko jest zrobione, karta się nie renderuje.
export function ProducerProfileChecklist({ heading, progressLabel, tasks }: ProducerProfileChecklistProps) {
  const doneCount = tasks.filter((task) => task.done).length;
  if (doneCount === tasks.length) return null;

  return (
    <Card padding="lg">
      <Stack gap={3}>
        <Heading level="h2">{heading}</Heading>
        <div>
          <Text tone="muted" className="text-label">
            {progressLabel}
          </Text>
          <div
            role="progressbar"
            aria-label={heading}
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-valuenow={doneCount}
            aria-valuetext={progressLabel}
            className="mt-1 h-2 overflow-hidden rounded-full bg-brand-steel/40"
          >
            <div className="h-full bg-brand-passage-blue" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
          </div>
        </div>
        <ul className="flex flex-col">
          {tasks.map((task) => (
            <li key={task.key}>
              {task.done ? (
                <div className="flex min-h-11 items-center gap-2 py-brand-1 text-brand-technical-graphite">
                  <Check className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <span className="text-body line-through">{task.label}</span>
                </div>
              ) : (
                <Link
                  href={task.href}
                  className="focus-ring flex min-h-11 items-center gap-2 rounded-data py-brand-1 text-body font-medium text-brand-foundation-navy hover:text-brand-passage-blue"
                >
                  <span className="size-4 shrink-0 rounded-full border border-brand-technical-graphite" aria-hidden="true" />
                  <span className="flex-1">{task.label}</span>
                  <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Stack>
    </Card>
  );
}
