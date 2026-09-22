import { HOUSE_AI_SCHEMA_VERSION } from "@/lib/house-ai-field-catalog";

export type HousePdfImportView = "upload" | "processing" | "review" | "error";

export function resolveHousePdfImportView(status: string): HousePdfImportView {
  if (status === "uploading") return "upload";
  if (status === "review_ready" || status === "applied") return "review";
  if (status === "failed" || status === "cancelled") return "error";
  return "processing";
}

export function buildAiProductDraftValues(input: {
  productId: string;
  sessionId: string;
  producerId: string;
  userId: string;
  model: string;
}) {
  return {
    product: {
      id: input.productId,
      producerId: input.producerId,
      status: "draft" as const,
      family: "dom" as const,
      currency: "EUR",
    },
    session: {
      id: input.sessionId,
      productId: input.productId,
      producerId: input.producerId,
      createdByUserId: input.userId,
      status: "uploading" as const,
      currentStage: "upload" as const,
      progress: 0,
      schemaVersion: HOUSE_AI_SCHEMA_VERSION,
      baseLocale: "pl",
      targetLocales: ["en", "de", "nl"],
      provider: "azure",
      model: input.model,
    },
  };
}
