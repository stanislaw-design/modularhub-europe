import { Button, Card, Heading, Stack, Text } from "@/components/ui";

export type ReactionTone = "action" | "decision" | "warning";

export interface ReactionRow {
  key: string;
  tone: ReactionTone;
  title: string;
  detail?: string;
  href: string;
  cta: string;
}

interface ProducerReactionListProps {
  heading: string;
  emptyMessage: string;
  rows: ReactionRow[];
}

const DOT_TONE: Record<ReactionTone, string> = {
  action: "bg-brand-passage-blue",
  decision: "bg-status-approved",
  warning: "bg-status-conditional",
};

// Blok "Wymaga Twojej reakcji" na pulpicie producenta (spec 0074 AC-3, AC-4):
// wiersze z kropką, tytułem, linijką szczegółu i przyciskiem do właściwego
// miejsca. Wiersze z zerem wywołujący w ogóle nie przekazuje; pusta lista
// pokazuje komunikat, że nic nie czeka.
export function ProducerReactionList({ heading, emptyMessage, rows }: ProducerReactionListProps) {
  return (
    <Card padding="lg">
      <Stack gap={3}>
        <Heading level="h2">{heading}</Heading>
        {rows.length === 0 ? (
          <Text tone="muted">{emptyMessage}</Text>
        ) : (
          <ul className="flex flex-col divide-y divide-brand-steel/60">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-brand-3 py-brand-3 first:pt-0 last:pb-0">
                <span className={`size-2.5 shrink-0 rounded-full ${DOT_TONE[row.tone]}`} aria-hidden="true" />
                <div className="min-w-0 flex-1 basis-56">
                  <Text className="font-medium">{row.title}</Text>
                  {row.detail && (
                    <Text tone="muted" className="text-label">
                      {row.detail}
                    </Text>
                  )}
                </div>
                <Button as="a" href={row.href} variant="secondary" size="md" className="shrink-0">
                  {row.cta}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Card>
  );
}
