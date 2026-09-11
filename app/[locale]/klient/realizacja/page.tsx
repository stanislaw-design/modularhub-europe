import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Button, Card, Heading, Stack, StageTimeline, Text } from "@/components/ui";
import type { StageStatus, StageTimelineItem } from "@/components/ui";
import { getFulfillmentOrder } from "@/lib/data/fulfillment";
import { getProjectById } from "@/lib/data/projects";
import type { FulfillmentStageName } from "@/lib/data/types";

const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function RealizacjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams, t, tStage, tStatus] = await Promise.all([
    params,
    searchParams,
    getTranslations("KlientRealizacjaPage"),
    getTranslations("FulfillmentStage"),
    getTranslations("StageTimelineStatus"),
  ]);
  const stageLabel: Record<FulfillmentStageName, string> = {
    produkcja: tStage("produkcja"),
    transport: tStage("transport"),
    montaz: tStage("montaz"),
    odbior: tStage("odbior"),
    gwarancja: tStage("gwarancja"),
  };
  const statusLabels: Record<StageStatus, string> = {
    completed: tStatus("completed"),
    current: tStatus("current"),
    upcoming: tStatus("upcoming"),
  };

  const projectId = typeof rawSearchParams.project === "string" ? rawSearchParams.project : undefined;
  if (!projectId) {
    redirect(`/${locale}/klient/wyniki`);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    redirect(`/${locale}/klient/wyniki`);
  }

  // No accepted-offer order for this project yet: send the client to accept
  // one first, never render an empty/broken timeline (spec 0007 AC-2). The
  // mock /klient/oferta screen was retired for the real offer path (spec
  // 0033 AC-16): points at the inquiries panel now, not a single project.
  const order = await getFulfillmentOrder(projectId);
  if (!order) {
    redirect(`/${locale}/klient/panel/zapytania`);
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
  const offerHref = `/${locale}/klient/panel/zapytania`;

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading", { name: project.name })}
      </Heading>
      <Text tone="muted" surface="v5">
        {project.producerName} · {project.floorAreaM2} m²
      </Text>

      {isComplete && (
        <div
          aria-live="polite"
          className="flex items-center gap-brand-2 rounded-data border border-status-approved/30 bg-status-approved/10 p-brand-3"
        >
          <CheckCircle2 className="size-5 shrink-0 text-status-approved" aria-hidden="true" />
          <Text surface="v5" className="font-medium text-status-approved">
            {t("completionBanner")}
          </Text>
        </div>
      )}

      <Card as="div" surface="v5">
        <StageTimeline items={items} surface="v5" statusLabels={statusLabels} />
      </Card>

      <Button as="a" href={offerHref} variant="secondary" surface="v5" className="w-fit">
        {t("backToOffer")}
      </Button>
    </Stack>
  );
}
