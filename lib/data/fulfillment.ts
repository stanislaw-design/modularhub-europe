import { fulfillmentOrders } from "./fixtures/fulfillment";
import type { FulfillmentOrder } from "./types";

// null means no accepted offer has a matching order yet (see spec 0007 AC-2);
// the realizacja page redirects to /oferta in that case, never an error.
export async function getFulfillmentOrder(projectId: string): Promise<FulfillmentOrder | null> {
  const match = fulfillmentOrders.find((order) => order.projectId === projectId);
  return match ?? null;
}

// All orders, for the producer-facing list (feature 16): not scoped to a
// single producer's own projects, same "no login session" convention already
// used by lib/gap-closure.ts.
export async function getFulfillmentOrders(): Promise<FulfillmentOrder[]> {
  return fulfillmentOrders;
}
