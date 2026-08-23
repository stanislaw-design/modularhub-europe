import { producers } from "./fixtures/producers";
import type { Producer } from "./types";

export async function getProducers(): Promise<Producer[]> {
  return producers;
}
