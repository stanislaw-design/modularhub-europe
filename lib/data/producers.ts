import { producers } from "./fixtures/producers";
import type { Producer } from "./types";

export async function getProducers(): Promise<Producer[]> {
  return producers;
}

export async function getProducerById(id: string): Promise<Producer | null> {
  return producers.find((producer) => producer.id === id) ?? null;
}
