import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Stack, StageTimeline, Text } from "@/components/ui";
import type { StageTimelineItem } from "@/components/ui";
import { getFulfillmentOrder } from "@/lib/data/fulfillment";
import { getProjectById } from "@/lib/data/projects";
import type { FulfillmentStageName } from "@/lib/data/types";

const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];

const stageLabel: Record<FulfillmentStageName, string> = {
  produkcja: "Produkcja",
  transport: "Transport",
  montaz: "Montaż",
  odbior: "Odbiór",
  gwarancja: "Gwarancja",
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function RealizacjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);

  const projectId = typeof rawSearchParams.project === "string" ? rawSearchParams.project : undefined;
  if (!projectId) {
    redirect(`/${locale}/klient/wyniki`);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    redirect(`/${locale}/klient/wyniki`);
  }

  // No accepted-offer order for this project yet: send the client to accept
  // one first, never render an empty/broken timeline (spec 0007 AC-2).
  const order = await getFulfillmentOrder(projectId);
  if (!order) {
    redirect(`/${locale}/klient/oferta?project=${projectId}`);
  }

  const currentIndex = STAGE_ORDER.indexOf(order.currentStage);
  const items: StageTimelineItem[] = order.stages.map((stage) => {
    const stageIndex = STAGE_ORDER.indexOf(stage.name);
    const status = stageIndex < currentIndex ? "completed" : stageIndex === currentIndex ? "current" : "upcoming";
    return {
      key: stage.name,
      label: stageLabel[stage.name],
      status,
      date: stage.reachedAt ? dateFormatter.format(new Date(stage.reachedAt)) : null,
      documents: stage.documents,
    };
  });

  const isComplete = order.currentStage === "gwarancja";
  const offerHref = `/${locale}/klient/oferta?project=${projectId}`;

  return (
    <Stack gap={4}>
      <Heading level="h1">Realizacja — {project.name}</Heading>
      <Text tone="muted">
        {project.producerName} · {project.floorAreaM2} m²
      </Text>

      {isComplete && (
        <div
          aria-live="polite"
          className="flex items-center gap-brand-2 rounded-data border border-status-approved/30 bg-status-approved/10 p-brand-3"
        >
          <CheckCircle2 className="size-5 shrink-0 text-status-approved" aria-hidden="true" />
          <Text className="font-medium text-status-approved">
            Zamówienie zrealizowane — wszystkie etapy zostały ukończone.
          </Text>
        </div>
      )}

      <Card as="div">
        <StageTimeline items={items} />
      </Card>

      <Button as="a" href={offerHref} variant="secondary" className="w-fit">
        Wróć do oferty
      </Button>
    </Stack>
  );
}
