import { getTranslations } from "next-intl/server";
import { Button, Card, Heading, Stack, StatusPill, Text } from "@/components/ui";
import type { FulfillmentOrder, FulfillmentStageName, Project } from "@/lib/data/types";

interface ProducerFulfillmentListProps {
  locale: string;
  orders: FulfillmentOrder[];
  projects: Project[];
}

const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];
const DELIVERED_INDEX = STAGE_ORDER.indexOf("odbior");

export async function ProducerFulfillmentList({ locale, orders, projects }: ProducerFulfillmentListProps) {
  const [t, tStage] = await Promise.all([
    getTranslations("ProducerFulfillmentList"),
    getTranslations("FulfillmentStage"),
  ]);
  const stageLabel: Record<FulfillmentStageName, string> = {
    produkcja: tStage("produkcja"),
    transport: tStage("transport"),
    montaz: tStage("montaz"),
    odbior: tStage("odbior"),
    gwarancja: tStage("gwarancja"),
  };

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Heading level="h1">{t("heading")}</Heading>
        <Text variant="bodyL" tone="muted" measure>
          {t("intro")}
        </Text>
      </Stack>

      {orders.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">{t("empty")}</Text>
        </Card>
      ) : (
        <Stack gap={3}>
          {orders.map((order) => {
            const project = projects.find((candidate) => candidate.id === order.projectId);
            if (!project) return null;

            const isDelivered = STAGE_ORDER.indexOf(order.currentStage) >= DELIVERED_INDEX;
            const detailHref = `/${locale}/producer/fulfillment?project=${project.id}`;

            return (
              <Card key={order.projectId} as="div" padding="md">
                <Stack gap={2} align="start">
                  <Heading level="h2">{project.name}</Heading>
                  <Text tone="muted">
                    {project.producerName} · {project.floorAreaM2} m²
                  </Text>
                  <StatusPill status={isDelivered ? "approved" : "conditional"}>
                    {isDelivered ? t("readyForVerification") : t("currentStage", { stage: stageLabel[order.currentStage] })}
                  </StatusPill>
                  <Button as="a" href={detailHref} variant="secondary" className="w-fit">
                    {t("viewTimeline")}
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
