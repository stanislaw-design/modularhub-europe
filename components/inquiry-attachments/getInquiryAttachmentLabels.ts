import { getTranslations } from "next-intl/server";
import { buildInquiryAttachmentLabels, type InquiryAttachmentLabels } from "./labels";

// Dla stron serwerowych. Admin zawsze dostaje polskie teksty (panel admina jest po polsku),
// klient i producent teksty w języku strony.
export async function getInquiryAttachmentLabels(locale: string): Promise<InquiryAttachmentLabels> {
  const t = await getTranslations({ locale, namespace: "InquiryAttachments" });
  return buildInquiryAttachmentLabels((key) => t.raw(key));
}
