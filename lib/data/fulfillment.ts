import { fulfillmentOrders } from "./fixtures/fulfillment";
import type { FulfillmentOrder } from "./types";

// null means no accepted offer has a matching order yet (see spec 0007 AC-2);
// the realizacja page redirects to /oferta in that case, never an error.
export async function getFulfillmentOrder(projectId: string): Promise<FulfillmentOrder | null> {
  const match = fulfillmentOrders.find((order) => order.projectId === projectId);
  return match ?? null;
}
