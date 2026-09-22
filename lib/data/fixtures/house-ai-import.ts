// PLACEHOLDER: replaced by spec 0047 data integration and Azure pipeline tasks.
import type { HouseAiFieldPath } from "@/lib/house-ai-field-catalog";
import type { HouseAiCandidate, HouseAiDecision, HouseAiDocumentIssue } from "@/lib/house-ai-schemas";

export interface HouseAiReviewField {
  fieldPath: HouseAiFieldPath;
  currentValue: string;
  candidates: HouseAiCandidate[];
}

export interface HouseAiReviewFixture {
  sessionId: string;
  decisionRevision: number;
  status: "uploading" | "queued" | "scanning" | "extracting" | "normalizing" | "processing" | "review_ready" | "applying" | "applied" | "cancel_requested" | "cancelled" | "failed";
  progress: number;
  currentStage: string;
  documents: Array<{ id: string; name: string; pages: number; language: string }>;
  fields: HouseAiReviewField[];
  decisions: HouseAiDecision[];
  documentIssues: HouseAiDocumentIssue[];
  conflictingIdentityKeys: string[];
  additionalObservations: Array<{ id: string; label: string; value: string; documentName: string; pageNumber: number }>;
}

function sourceCandidate(input: {
  id: string;
  fieldPath: HouseAiFieldPath;
  value: unknown;
  confidence: HouseAiCandidate["confidence"];
  documentName: string;
  pageNumber: number;
  excerpt: string;
  ocrConfidence: number;
  rawValue?: HouseAiCandidate["rawValue"];
  normalizedValue?: HouseAiCandidate["normalizedValue"];
  normalizationMetadata?: HouseAiCandidate["normalizationMetadata"];
}): HouseAiCandidate {
  return {
    id: input.id,
    fieldPath: input.fieldPath,
    entityKey: null,
    parentEntityKey: null,
    sourceCandidateId: null,
    rawValue: input.rawValue ?? input.value,
    normalizedValue: input.normalizedValue ?? input.value,
    normalizationMetadata: input.normalizationMetadata ?? null,
    origin: "extracted",
    confidence: input.confidence,
    ocrConfidence: input.ocrConfidence,
    evidence: [
      {
        id: `${input.id}-evidence`,
        documentName: input.documentName,
        evidenceType: "source",
        pageNumber: input.pageNumber,
        excerpt: input.excerpt,
      },
    ],
  };
}

const commonFields: HouseAiReviewField[] = [
  {
    fieldPath: "product.name",
    currentValue: "CAS 98 Mikołajki",
    candidates: [sourceCandidate({ id: "name-1", fieldPath: "product.name", value: "CAS 98 Mikołajki", confidence: "high", documentName: "oferta-cas-98.pdf", pageNumber: 1, excerpt: "CAS 98 Mikołajki", ocrConfidence: 0.98 })],
  },
  {
    fieldPath: "product.floorAreaM2",
    currentValue: "98,4 m²",
    candidates: [
      sourceCandidate({ id: "area-1", fieldPath: "product.floorAreaM2", value: 98.4, confidence: "high", documentName: "oferta-cas-98.pdf", pageNumber: 2, excerpt: "Powierzchnia użytkowa: 98,4 m²", ocrConfidence: 0.97 }),
      sourceCandidate({ id: "area-2", fieldPath: "product.floorAreaM2", value: 102.1, confidence: "medium", documentName: "specyfikacja-techniczna.pdf", pageNumber: 4, excerpt: "Łączna powierzchnia: 102,1 m²", ocrConfidence: 0.86 }),
    ],
  },
  {
    fieldPath: "technical.heatSource",
    currentValue: "Pompa ciepła powietrze woda",
    candidates: [sourceCandidate({ id: "heat-1", fieldPath: "technical.heatSource", value: "pompa-ciepla-powietrze-woda", confidence: "low", documentName: "specyfikacja-techniczna.pdf", pageNumber: 8, excerpt: "Opcjonalnie pompa ciepła powietrze–woda", ocrConfidence: 0.68 })],
  },
  {
    fieldPath: "variants[].priceMinCents",
    currentValue: "207 000 EUR",
    candidates: [sourceCandidate({
      id: "price-1",
      fieldPath: "variants[].priceMinCents",
      value: 20700000,
      rawValue: { amount: "207000", currency: "EUR", taxBasis: "net" },
      normalizedValue: 20700000,
      normalizationMetadata: {
        kind: "fx",
        provider: "ECB",
        series: "EUR/EUR",
        sourceAmount: "207000",
        sourceCurrency: "EUR",
        targetCurrency: "EUR",
        rate: "1",
        rateDate: "2026-09-19",
        retrievedAt: "2026-09-19T12:00:00.000Z",
        rounding: "HALF_UP_2",
      },
      confidence: "high",
      documentName: "oferta-cas-98.pdf",
      pageNumber: 6,
      excerpt: "Stan surowy zamknięty: 207 000 EUR netto",
      ocrConfidence: 0.96,
    })],
  },
];

export const HOUSE_AI_REVIEW_FIXTURES: Record<"processing" | "review" | "error", HouseAiReviewFixture> = {
  processing: {
    sessionId: "session-processing",
    decisionRevision: 0,
    status: "processing",
    progress: 58,
    currentStage: "Rozpoznajemy układ i tekst dokumentów",
    documents: [{ id: "doc-1", name: "oferta-cas-98.pdf", pages: 14, language: "PL" }],
    fields: [],
    decisions: [],
    documentIssues: [],
    conflictingIdentityKeys: [],
    additionalObservations: [],
  },
  review: {
    sessionId: "session-review",
    decisionRevision: 0,
    status: "review_ready",
    progress: 100,
    currentStage: "Wynik gotowy do przeglądu",
    documents: [
      { id: "doc-1", name: "oferta-cas-98.pdf", pages: 14, language: "PL" },
      { id: "doc-2", name: "specyfikacja-techniczna.pdf", pages: 9, language: "PL" },
    ],
    fields: commonFields,
    decisions: [],
    documentIssues: [{ id: "issue-1", documentName: "specyfikacja-techniczna.pdf", pageFrom: 9, pageTo: 9, issueCode: "PAGE_UNREADABLE", acknowledged: false }],
    conflictingIdentityKeys: [JSON.stringify(["product.floorAreaM2", null, null])],
    additionalObservations: [{ id: "observation-1", label: "Termin ważności oferty", value: "30 dni", documentName: "oferta-cas-98.pdf", pageNumber: 7 }],
  },
  error: {
    sessionId: "session-error",
    decisionRevision: 0,
    status: "failed",
    progress: 34,
    currentStage: "Analiza zatrzymana",
    documents: [{ id: "doc-3", name: "skan-oferty.pdf", pages: 31, language: "DE" }],
    fields: [],
    decisions: [],
    documentIssues: [{ id: "issue-2", documentName: "skan-oferty.pdf", pageFrom: null, pageTo: null, issueCode: "OCR_UNAVAILABLE", acknowledged: false }],
    conflictingIdentityKeys: [],
    additionalObservations: [],
  },
};
