import { describe, expect, it, vi } from "vitest";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import type { AzureDocumentLayout } from "@/lib/ai/document-intelligence";
import type { HouseProjectExtractionResult } from "@/lib/ai/house-project-extraction";
import {
  HouseImportWorkerError,
  runHouseImportWorker,
  type HouseImportWorkerDependencies,
} from "@/lib/ai/house-import-worker";
import type { HouseImportLease } from "@/lib/ai/house-import-worker-store";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const SOURCE_DOCUMENT_ID = "00000000-0000-4000-8000-000000000002";

const lease: HouseImportLease = {
  sessionId: SESSION_ID,
  attemptToken: 1,
  documents: [{ sourceDocumentId: SOURCE_DOCUMENT_ID, r2Key: "private/source.pdf", sortOrder: 0 }],
};

const layout: AzureDocumentLayout = {
  apiVersion: "2024-11-30",
  modelId: "prebuilt-layout",
  pages: [{
    pageNumber: 1,
    text: "NORD 68",
    averageWordConfidence: 0.97,
    language: { locale: "pl", confidence: 0.99 },
    lines: [],
  }],
};

const extraction: HouseProjectExtractionResult = {
  responseIds: ["response-1"],
  model: "gpt-5-mini:test",
  targetCurrency: "EUR",
  documentLanguage: "pl",
  candidates: [{
    fieldPath: "product.name",
    entityKey: null,
    parentEntityKey: null,
    rawValue: "NORD 68",
    normalizedValue: "NORD 68",
    normalizationMetadata: null,
    origin: "extracted",
    confidence: "high",
    ocrConfidence: 0.97,
    evidence: [{ pageNumber: 1, excerpt: "NORD 68" }],
  }],
  issues: [],
  inputTokens: 100,
  outputTokens: 20,
};

function dependencies(
  overrides: Partial<HouseImportWorkerDependencies> = {},
): HouseImportWorkerDependencies {
  return {
    claimLease: vi.fn().mockResolvedValue({ kind: "claimed", lease }),
    heartbeatLease: vi.fn().mockResolvedValue("active"),
    advanceLease: vi.fn().mockResolvedValue("active"),
    updateSourceDocument: vi.fn().mockResolvedValue("active"),
    cancelLease: vi.fn().mockResolvedValue(undefined),
    failLease: vi.fn().mockResolvedValue("retry"),
    loadPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
    analyzePdf: vi.fn().mockResolvedValue(layout),
    extractProject: vi.fn().mockResolvedValue(extraction),
    persistExtraction: vi.fn().mockResolvedValue({
      alreadyPersisted: false,
      candidateCount: 1,
      evidenceCount: 1,
      issueCount: 0,
      conflictCount: 0,
    }),
    heartbeatIntervalMs: 60_000,
    ...overrides,
  };
}

describe("house import worker", () => {
  it("runs Document Intelligence, extraction, normalization and fenced persistence", async () => {
    const deps = dependencies();

    const result = await runHouseImportWorker({ sessionId: SESSION_ID }, deps);

    expect(result).toEqual({
      status: "review_ready",
      candidateCount: 1,
      evidenceCount: 1,
      issueCount: 0,
      conflictCount: 0,
    });
    expect(deps.loadPdf).toHaveBeenCalledWith("private/source.pdf");
    expect(deps.analyzePdf).toHaveBeenCalledOnce();
    expect(deps.extractProject).toHaveBeenCalledWith(layout, { documentKey: SESSION_ID });
    expect(deps.advanceLease).toHaveBeenNthCalledWith(1, lease, {
      status: "extracting",
      currentStage: "model_extraction",
      progress: 55,
    });
    expect(deps.advanceLease).toHaveBeenNthCalledWith(2, lease, {
      status: "normalizing",
      currentStage: "normalization",
      progress: 90,
    });
    expect(deps.persistExtraction).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      expectedAttemptCount: 1,
      documents: [{
        sourceDocumentId: SOURCE_DOCUMENT_ID,
        candidates: extraction.candidates,
        issues: [],
      }],
    });
    expect(deps.failLease).not.toHaveBeenCalled();
  });

  it("stops at an stage boundary when cancellation is requested", async () => {
    const deps = dependencies({
      heartbeatLease: vi.fn().mockResolvedValue("cancel_requested"),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).resolves.toEqual({
      status: "cancelled",
      reason: "cancel_requested",
    });
    expect(deps.cancelLease).toHaveBeenCalledWith(lease);
    expect(deps.loadPdf).not.toHaveBeenCalled();
    expect(deps.persistExtraction).not.toHaveBeenCalled();
  });

  it("releases a retryable provider failure back to the queue and rethrows a safe error", async () => {
    const deps = dependencies({
      analyzePdf: vi.fn().mockRejectedValue(
        new AzureAiProviderError("AZURE_DOCUMENT_ANALYSIS_FAILED", true, 503),
      ),
      failLease: vi.fn().mockResolvedValue("retry"),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).rejects.toMatchObject({
      code: "AZURE_DOCUMENT_ANALYSIS_FAILED",
      retryable: true,
      retryAfterSeconds: 30,
    });
    expect(deps.failLease).toHaveBeenCalledWith(lease, "AZURE_DOCUMENT_ANALYSIS_FAILED", true);
    expect(deps.persistExtraction).not.toHaveBeenCalled();
  });

  it("uses the second backoff after the second failed attempt", async () => {
    const secondLease = { ...lease, attemptToken: 2 };
    const deps = dependencies({
      claimLease: vi.fn().mockResolvedValue({ kind: "claimed", lease: secondLease }),
      analyzePdf: vi.fn().mockRejectedValue(
        new AzureAiProviderError("AZURE_DOCUMENT_ANALYSIS_FAILED", true, 503),
      ),
      failLease: vi.fn().mockResolvedValue("retry"),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).rejects.toMatchObject({
      code: "AZURE_DOCUMENT_ANALYSIS_FAILED",
      retryable: true,
      retryAfterSeconds: 120,
    });
  });

  it("finishes with retries exhausted after the last allowed attempt", async () => {
    const lastLease = { ...lease, attemptToken: 3 };
    const deps = dependencies({
      claimLease: vi.fn().mockResolvedValue({ kind: "claimed", lease: lastLease }),
      analyzePdf: vi.fn().mockRejectedValue(
        new AzureAiProviderError("AZURE_DOCUMENT_ANALYSIS_FAILED", true, 503),
      ),
      failLease: vi.fn().mockResolvedValue("failed"),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).resolves.toEqual({
      status: "failed",
      reason: "AI_IMPORT_RETRIES_EXHAUSTED",
    });
  });

  it("marks a deterministic model schema failure as failed without retrying", async () => {
    const deps = dependencies({
      extractProject: vi.fn().mockRejectedValue(
        new AzureAiProviderError("AZURE_OPENAI_RESPONSE_INVALID", false),
      ),
      failLease: vi.fn().mockResolvedValue("failed"),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).resolves.toEqual({
      status: "failed",
      reason: "AZURE_OPENAI_RESPONSE_INVALID",
    });
    expect(deps.failLease).toHaveBeenCalledWith(lease, "AZURE_OPENAI_RESPONSE_INVALID", false);
    expect(deps.persistExtraction).not.toHaveBeenCalled();
  });

  it("keeps a nonretryable Document Intelligence failure as a review issue and continues", async () => {
    const deps = dependencies({
      analyzePdf: vi.fn().mockRejectedValue(
        new AzureAiProviderError("AZURE_DOCUMENT_RESULT_INVALID", false),
      ),
      persistExtraction: vi.fn().mockResolvedValue({
        alreadyPersisted: false,
        candidateCount: 0,
        evidenceCount: 0,
        issueCount: 1,
        conflictCount: 0,
      }),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).resolves.toMatchObject({
      status: "review_ready",
      issueCount: 1,
    });
    expect(deps.extractProject).not.toHaveBeenCalled();
    expect(deps.persistExtraction).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      expectedAttemptCount: 1,
      documents: [{
        sourceDocumentId: SOURCE_DOCUMENT_ID,
        candidates: [],
        issues: [{ code: "AZURE_DOCUMENT_RESULT_INVALID", evidencePages: [] }],
      }],
    });
  });

  it("treats a duplicate delivery for an active lease as a safe no-op", async () => {
    const deps = dependencies({
      claimLease: vi.fn().mockResolvedValue({ kind: "skip", reason: "lease_busy" }),
    });

    await expect(runHouseImportWorker({ sessionId: SESSION_ID }, deps)).resolves.toEqual({
      status: "skipped",
      reason: "lease_busy",
    });
    expect(deps.loadPdf).not.toHaveBeenCalled();
  });

  it("rejects a malformed queue message before touching the database", async () => {
    const deps = dependencies();

    await expect(runHouseImportWorker({ sessionId: SESSION_ID, extra: "untrusted" }, deps))
      .rejects.toBeInstanceOf(HouseImportWorkerError);
    expect(deps.claimLease).not.toHaveBeenCalled();
  });
});
