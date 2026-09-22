import { z } from "zod";
import { HOUSE_AI_FIELD_PATHS } from "@/lib/house-ai-field-catalog";

export const fxNormalizationMetadataSchema = z
  .object({
    kind: z.literal("fx"),
    provider: z.literal("ECB"),
    series: z.string().min(1),
    sourceAmount: z.string().regex(/^\d+(?:\.\d+)?$/),
    sourceCurrency: z.string().regex(/^[A-Z]{3}$/),
    targetCurrency: z.literal("EUR"),
    rate: z.string().regex(/^\d+(?:\.\d+)?$/),
    rateDate: z.iso.date(),
    retrievedAt: z.iso.datetime(),
    rounding: z.literal("HALF_UP_2"),
  })
  .strict();

export const houseAiOriginSchema = z.enum(["extracted", "inferred", "generated", "translated"]);
export const houseAiConfidenceSchema = z.enum(["high", "medium", "low"]);

export const houseAiEvidenceSchema = z
  .object({
    id: z.string().min(1),
    documentName: z.string().min(1),
    evidenceType: z.enum(["source", "context"]),
    pageNumber: z.number().int().positive().nullable(),
    excerpt: z.string().min(1).nullable(),
  })
  .strict();

export const houseAiCandidateSchema = z
  .object({
    id: z.string().min(1),
    fieldPath: z.enum(HOUSE_AI_FIELD_PATHS),
    entityKey: z.string().min(1).nullable().default(null),
    parentEntityKey: z.string().min(1).nullable().default(null),
    sourceCandidateId: z.string().min(1).nullable().default(null),
    rawValue: z.unknown(),
    normalizedValue: z.unknown(),
    normalizationMetadata: fxNormalizationMetadataSchema.nullable().default(null),
    origin: houseAiOriginSchema,
    confidence: houseAiConfidenceSchema,
    ocrConfidence: z.number().min(0).max(1).nullable(),
    evidence: z.array(houseAiEvidenceSchema),
  })
  .strict()
  .superRefine((candidate, context) => {
    const sourceEvidence = candidate.evidence.filter((item) => item.evidenceType === "source");
    if (candidate.origin === "extracted" || candidate.origin === "inferred") {
      if (sourceEvidence.length === 0 || sourceEvidence.some((item) => item.pageNumber === null || item.excerpt === null)) {
        context.addIssue({ code: "custom", path: ["evidence"], message: "Wartość źródłowa wymaga dokumentu, strony i fragmentu." });
      }
    }
    if (candidate.origin === "generated" && sourceEvidence.length > 0) {
      context.addIssue({ code: "custom", path: ["evidence"], message: "Treść wygenerowana może wskazywać tylko kontekst." });
    }
    if (candidate.origin === "translated") {
      if (!candidate.sourceCandidateId) {
        context.addIssue({ code: "custom", path: ["sourceCandidateId"], message: "Tłumaczenie wymaga kandydata źródłowego." });
      }
      if (candidate.evidence.length > 0) {
        context.addIssue({ code: "custom", path: ["evidence"], message: "Tłumaczenie nie kopiuje dowodów źródłowych." });
      }
    }
  });

export const houseAiDecisionSchema = z
  .object({
    fieldPath: z.enum(HOUSE_AI_FIELD_PATHS),
    entityKey: z.string().min(1).nullable().default(null),
    parentEntityKey: z.string().min(1).nullable().default(null),
    selectedCandidateId: z.string().min(1).nullable(),
    finalValue: z.unknown(),
    decisionType: z.enum(["accepted", "manual", "rejected", "not_applicable", "keep_current", "overwrite_changed"]),
    version: z.number().int().positive(),
  })
  .strict();

export const houseAiDocumentIssueSchema = z
  .object({
    id: z.string().min(1),
    documentName: z.string().min(1),
    pageFrom: z.number().int().positive().nullable(),
    pageTo: z.number().int().positive().nullable(),
    issueCode: z.string().min(1),
    acknowledged: z.boolean(),
  })
  .strict();

export type HouseAiCandidate = z.infer<typeof houseAiCandidateSchema>;
export type HouseAiDecision = z.infer<typeof houseAiDecisionSchema>;
export type HouseAiDocumentIssue = z.infer<typeof houseAiDocumentIssueSchema>;
export type FxNormalizationMetadata = z.infer<typeof fxNormalizationMetadataSchema>;
