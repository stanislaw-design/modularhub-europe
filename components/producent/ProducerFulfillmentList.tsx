import { Button, Card, Heading, Stack, StatusPill, Text } from "@/components/ui";
import type { FulfillmentOrder, FulfillmentStageName, Project } from "@/lib/data/types";

interface ProducerFulfillmentListProps {
  locale: string;
  orders: FulfillmentOrder[];
  projects: Project[];
}

const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];
const DELIVERED_INDEX = STAGE_ORDER.indexOf("odbior");

const stageLabel: Record<FulfillmentStageName, string> = {
  produkcja: "Produkcja",
  transport: "Transport",
  montaz: "Montaż",
  odbior: "Odbiór",
  gwarancja: "Gwarancja",
};

export function ProducerFulfillmentList({ locale, orders, projects }: ProducerFulfillmentListProps) {
  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Heading level="h1">Realizacje</Heading>
        <Text variant="bodyL" tone="muted" measure>
          Oś statusu produkcji, transportu, montażu i odbioru — ta sama, którą widzi klient dla tego
          samego zamówienia. Po odbiorze odblokowuje się weryfikacja firmy przed pierwszą wypłatą.
        </Text>
      </Stack>

      {orders.length === 0 ? (
        <Card as="div" padding="md">
          <Text tone="muted">Brak realizacji — pojawią się tu zamówienia z zaakceptowaną ofertą.</Text>
        </Card>
      ) : (
        <Stack gap={3}>
          {orders.map((order) => {
            const project = projects.find((candidate) => candidate.id === order.projectId);
            if (!project) return null;

            const isDelivered = STAGE_ORDER.indexOf(order.currentStage) >= DELIVERED_INDEX;
            const detailHref = `/${locale}/producent/realizacja?project=${project.id}`;

            return (
              <Card key={order.projectId} as="div" padding="md">
                <Stack gap={2} align="start">
                  <Heading level="h2">{project.name}</Heading>
                  <Text tone="muted">
                    {project.producerName} · {project.floorAreaM2} m²
                  </Text>
                  <StatusPill status={isDelivered ? "approved" : "conditional"}>
                    {isDelivered ? "Gotowe do weryfikacji firmy" : `Aktualny etap: ${stageLabel[order.currentStage]}`}
                  </StatusPill>
                  <Button as="a" href={detailHref} variant="secondary" className="w-fit">
                    Zobacz oś statusu
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
