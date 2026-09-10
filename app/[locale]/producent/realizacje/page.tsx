import { DemoScreenNotice } from "@/components/producent/DemoScreenNotice";
import { ProducerFulfillmentList } from "@/components/producent/ProducerFulfillmentList";
import { Stack } from "@/components/ui";
import { getFulfillmentOrders } from "@/lib/data/fulfillment";
import { getProjects } from "@/lib/data/producer-mock-projects";

export default async function ProducerRealizacjePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [orders, projects] = await Promise.all([getFulfillmentOrders(), getProjects()]);

  return (
    <Stack gap={4}>
      <DemoScreenNotice />
      <ProducerFulfillmentList locale={locale} orders={orders} projects={projects} />
    </Stack>
  );
}
