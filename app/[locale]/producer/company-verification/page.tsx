import { redirect } from "next/navigation";
import { CompanyVerificationView } from "@/components/producent/CompanyVerificationView";
import { DemoScreenNotice } from "@/components/producent/DemoScreenNotice";
import { Stack } from "@/components/ui";
import { getFulfillmentOrder } from "@/lib/data/fulfillment";
import { getProjectById } from "@/lib/data/producer-mock-projects";
import type { FulfillmentStageName } from "@/lib/data/types";

const STAGE_ORDER: FulfillmentStageName[] = ["produkcja", "transport", "montaz", "odbior", "gwarancja"];
const DELIVERED_INDEX = STAGE_ORDER.indexOf("odbior");

export default async function WeryfikacjaFirmyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const listHref = `/${locale}/producer/fulfillments`;

  const projectId = typeof rawSearchParams.project === "string" ? rawSearchParams.project : undefined;
  if (!projectId) {
    redirect(listHref);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    redirect(listHref);
  }

  const realizacjaHref = `/${locale}/producer/fulfillment?project=${projectId}`;

  const order = await getFulfillmentOrder(projectId);
  // No order yet, or not delivered yet: verification only makes sense once
  // the order reached odbiór — soft redirect back to the axis, never an error.
  if (!order || STAGE_ORDER.indexOf(order.currentStage) < DELIVERED_INDEX) {
    redirect(realizacjaHref);
  }

  return (
    <Stack gap={4}>
      <DemoScreenNotice />
      <CompanyVerificationView projectId={projectId} projectName={project.name} realizacjaHref={realizacjaHref} />
    </Stack>
  );
}
