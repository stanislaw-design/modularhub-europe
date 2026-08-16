import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Stack, StageTimeline, Text } from "@/components/ui";
import type { StageTimelineItem } from "@/components/ui";
import { getFulfillmentOrder } from "@/lib/data/fulfillment";
import { getProjectById } from "@/lib/data/projects";
import type { FulfillmentStageName } from "@/lib/data/types";

// Producer view carries only the four stages up to delivery — the same
// pattern as the client's axis, minus the post-delivery gwarancja stage
// (scope feature 16: "produkcja, transport, montaż, odbiór").
const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];
const PRODUCER_STAGES: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior"];
const DELIVERED_INDEX = STAGE_ORDER.indexOf("odbior");

const stageLabel: Record<FulfillmentStageName, string> = {
  produkcja: "Produkcja",
  transport: "Transport",
  montaz: "Montaż",
  odbior: "Odbiór",
  gwarancja: "Gwarancja",
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function ProducerRealizacjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const listHref = `/${locale}/producent/realizacje`;

  const projectId = typeof rawSearchParams.project === "string" ? rawSearchParams.project : undefined;
  if (!projectId) {
    redirect(listHref);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    redirect(listHref);
  }

  // No matching order yet (no accepted offer): nothing to show here, back to
  // the list rather than an error — same soft-redirect convention as the
  // client's realizacja page (spec 0007 AC-2).
  const order = await getFulfillmentOrder(projectId);
  if (!order) {
    redirect(listHref);
  }

  const currentIndex = STAGE_ORDER.indexOf(order.currentStage);
  const items: StageTimelineItem[] = PRODUCER_STAGES.map((name) => {
    const stage = order.stages.find((candidate) => candidate.name === name);
    const stageIndex = STAGE_ORDER.indexOf(name);
    const status = stageIndex < currentIndex ? "completed" : stageIndex === currentIndex ? "current" : "upcoming";
    return {
      key: name,
      label: stageLabel[name],
      status,
      date: stage?.reachedAt ? dateFormatter.format(new Date(stage.reachedAt)) : null,
      documents: stage?.documents,
    };
  });

  const isDelivered = currentIndex >= DELIVERED_INDEX;
  const verificationHref = `/${locale}/producent/weryfikacja-firmy?project=${projectId}`;

  return (
    <Stack gap={4}>
      <Heading level="h1">Realizacja — {project.name}</Heading>
      <Text tone="muted">
        {project.producerName} · {project.floorAreaM2} m²
      </Text>

      {isDelivered && (
        <div
          aria-live="polite"
          className="flex items-center gap-brand-2 rounded-data border border-status-approved/30 bg-status-approved/10 p-brand-3"
        >
          <CheckCircle2 className="size-5 shrink-0 text-status-approved" aria-hidden="true" />
          <Text className="font-medium text-status-approved">
            Zamówienie odebrane — można teraz przejść do weryfikacji firmy przed pierwszą wypłatą.
          </Text>
        </div>
      )}

      <Card as="div">
        <StageTimeline items={items} />
      </Card>

      <Stack direction="row" gap={3} className="flex-wrap">
        <Button as="a" href={listHref} variant="secondary" className="w-fit">
          Wróć do realizacji
        </Button>
        {isDelivered && (
          <Button as="a" href={verificationHref} className="w-fit">
            Weryfikacja firmy i wypłata
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
