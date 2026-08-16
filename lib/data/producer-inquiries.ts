import { producerInquiries } from "./fixtures/producer-inquiries";
import type { ProducerInquiry } from "./types";

export async function getProducerInquiries(): Promise<ProducerInquiry[]> {
  return producerInquiries;
}

export async function getProducerInquiryById(id: string): Promise<ProducerInquiry | null> {
  return producerInquiries.find((inquiry) => inquiry.id === id) ?? null;
}
