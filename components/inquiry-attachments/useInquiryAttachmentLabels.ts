"use client";

import { useTranslations } from "next-intl";
import { buildInquiryAttachmentLabels, type InquiryAttachmentLabels } from "./labels";

// Dla komponentów klienckich (kreator zapytania, okno zapytania o produkt, formularz admina).
export function useInquiryAttachmentLabels(): InquiryAttachmentLabels {
  const t = useTranslations("InquiryAttachments");
  return buildInquiryAttachmentLabels((key) => t.raw(key));
}
