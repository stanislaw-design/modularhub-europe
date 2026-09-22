import { z } from "zod";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import { analyzePdfLayout, type AzureDocumentLayout } from "@/lib/ai/document-intelligence";
import {
  extractHouseProject,
  type HouseProjectExtractionResult,
} from "@/lib/ai/house-project-extraction";
import {
  persistHouseProjectExtraction,
  type HouseProjectExtractionDocumentResult,
  type HouseProjectPersistenceIssue,
} from "@/lib/ai/house-project-extraction-persistence";
import {
  advanceHouseImportLease,
  cancelHouseImportLease,
  claimHouseImportLease,
  failHouseImportLease,
  heartbeatHouseImportLease,
  type HouseImportLease,
  type HouseImportLeaseClaim,
  type HouseImportLeaseControl,
  type HouseImportWorkerSafeErrorCode,
  updateHouseImportSourceDocument,
} from "@/lib/ai/house-import-worker-store";
import { downloadAiSourcePdf } from "@/lib/storage/ai-private-r2-client";

const HEARTBEAT_INTERVAL_MS = 30_000;
const RETRY_DELAYS_SECONDS = [30, 120] as const;

export const houseImportWorkerMessageSchema = z.object({
  sessionId: z.string().uuid(),
}).strict();

export type HouseImportWorkerMessage = z.infer<typeof houseImportWorkerMessageSchema>;

export type HouseImportWorkerResult =
  | {
      status: "review_ready";
      candidateCount: number;
      evidenceCount: number;
      issueCount: number;
      conflictCount: number;
    }
  | { status: "cancelled" | "failed" | "skipped"; reason: string };

export class HouseImportWorkerError extends Error {
  readonly retryAfterSeconds?: number;

  constructor(
    readonly code: HouseImportWorkerSafeErrorCode,
    readonly retryable: boolean,
    options: ErrorOptions & { retryAfterSeconds?: number } = {},
  ) {
    super(code, options);
    this.name = "HouseImportWorkerError";
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export interface HouseImportWorkerDependencies {
  claimLease: (sessionId: string) => Promise<HouseImportLeaseClaim>;
  heartbeatLease: (lease: HouseImportLease) => Promise<HouseImportLeaseControl>;
  advanceLease: typeof advanceHouseImportLease;
  updateSourceDocument: typeof updateHouseImportSourceDocument;
  cancelLease: (lease: HouseImportLease) => Promise<void>;
  failLease: typeof failHouseImportLease;
  loadPdf: (key: string) => Promise<Uint8Array>;
  analyzePdf: (pdf: Uint8Array) => Promise<AzureDocumentLayout>;
  extractProject: (
    layout: AzureDocumentLayout,
    options: { documentKey: string },
  ) => Promise<HouseProjectExtractionResult>;
  persistExtraction: typeof persistHouseProjectExtraction;
  heartbeatIntervalMs: number;
}

const defaultDependencies: HouseImportWorkerDependencies = {
  claimLease: claimHouseImportLease,
  heartbeatLease: heartbeatHouseImportLease,
  advanceLease: advanceHouseImportLease,
  updateSourceDocument: updateHouseImportSourceDocument,
  cancelLease: cancelHouseImportLease,
  failLease: failHouseImportLease,
  loadPdf: downloadAiSourcePdf,
  analyzePdf: (pdf) => analyzePdfLayout(pdf),
  extractProject: (layout, options) => extractHouseProject(layout, options),
  persistExtraction: persistHouseProjectExtraction,
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
};

function dominantLayoutLanguage(layout: AzureDocumentLayout): string | null {
  const counts = new Map<string, number>();
  for (const page of layout.pages) {
    if (!page.language?.locale) continue;
    counts.set(page.language.locale, (counts.get(page.language.locale) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function documentIssue(code: HouseProjectPersistenceIssue["code"]): HouseProjectPersistenceIssue {
  return { code, evidencePages: [] };
}

function safeWorkerError(error: unknown): HouseImportWorkerError {
  if (error instanceof HouseImportWorkerError) return error;
  if (error instanceof AzureAiProviderError) {
    return new HouseImportWorkerError(error.code, error.retryable, { cause: error });
  }
  if (error instanceof Error && error.message === "HOUSE_PROJECT_EXTRACTION_PERSISTENCE_REJECTED") {
    return new HouseImportWorkerError("HOUSE_PROJECT_EXTRACTION_PERSISTENCE_REJECTED", true, { cause: error });
  }
  return new HouseImportWorkerError("HOUSE_IMPORT_WORKER_FAILED", true, {
    cause: error instanceof Error ? error : undefined,
  });
}

function startHeartbeat(
  lease: HouseImportLease,
  dependencies: HouseImportWorkerDependencies,
): { stop: () => Promise<void> } {
  let stopped = false;
  let pending = Promise.resolve();
  const timer = setInterval(() => {
    pending = pending.then(async () => {
      if (stopped) return;
      await dependencies.heartbeatLease(lease);
    }).catch(() => undefined);
  }, dependencies.heartbeatIntervalMs);

  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await pending;
    },
  };
}

async function requireActiveLease(
  lease: HouseImportLease,
  dependencies: HouseImportWorkerDependencies,
): Promise<void> {
  const control = await dependencies.heartbeatLease(lease);
  if (control === "active") return;
  if (control === "cancel_requested") {
    await dependencies.cancelLease(lease);
    throw new HouseImportWorkerError("AI_IMPORT_LEASE_LOST", false);
  }
  throw new HouseImportWorkerError("AI_IMPORT_LEASE_LOST", true);
}

type DocumentIssueCode = Extract<
  HouseProjectPersistenceIssue["code"],
  "AZURE_DOCUMENT_ANALYSIS_FAILED" | "AZURE_DOCUMENT_ANALYSIS_TIMEOUT" | "AZURE_DOCUMENT_RESULT_INVALID"
>;

function isDocumentIssue(
  error: AzureAiProviderError,
): error is AzureAiProviderError & { code: DocumentIssueCode } {
  return !error.retryable && (
    error.code === "AZURE_DOCUMENT_ANALYSIS_FAILED"
    || error.code === "AZURE_DOCUMENT_ANALYSIS_TIMEOUT"
    || error.code === "AZURE_DOCUMENT_RESULT_INVALID"
  );
}

function skipResult(claim: Exclude<HouseImportLeaseClaim, { kind: "claimed" }>): HouseImportWorkerResult {
  if (claim.reason === "cancelled") return { status: "cancelled", reason: claim.reason };
  if (claim.reason === "retries_exhausted") return { status: "failed", reason: claim.reason };
  return { status: "skipped", reason: claim.reason };
}

export async function runHouseImportWorker(
  message: unknown,
  dependencyOverrides: Partial<HouseImportWorkerDependencies> = {},
): Promise<HouseImportWorkerResult> {
  const parsedMessage = houseImportWorkerMessageSchema.safeParse(message);
  if (!parsedMessage.success) {
    throw new HouseImportWorkerError("HOUSE_IMPORT_WORKER_FAILED", false);
  }
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  const claim = await dependencies.claimLease(parsedMessage.data.sessionId);
  if (claim.kind !== "claimed") return skipResult(claim);
  const { lease } = claim;
  const heartbeat = startHeartbeat(lease, dependencies);

  try {
    if (lease.documents.length === 0) {
      throw new HouseImportWorkerError("HOUSE_IMPORT_WORKER_FAILED", false);
    }

    const analyzedDocuments: Array<{
      sourceDocumentId: string;
      layout: AzureDocumentLayout;
    }> = [];
    const documentResults: HouseProjectExtractionDocumentResult[] = [];

    for (const source of lease.documents) {
      await requireActiveLease(lease, dependencies);
      const processingControl = await dependencies.updateSourceDocument(
        lease,
        source.sourceDocumentId,
        { ocrStatus: "processing" },
      );
      if (processingControl !== "active") {
        await requireActiveLease(lease, dependencies);
      }

      let pdf: Uint8Array;
      try {
        pdf = await dependencies.loadPdf(source.r2Key);
      } catch (error) {
        throw new HouseImportWorkerError("AI_IMPORT_SOURCE_READ_FAILED", true, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      try {
        const layout = await dependencies.analyzePdf(pdf);
        analyzedDocuments.push({ sourceDocumentId: source.sourceDocumentId, layout });
        const readyControl = await dependencies.updateSourceDocument(
          lease,
          source.sourceDocumentId,
          { ocrStatus: "ready", detectedLanguage: dominantLayoutLanguage(layout) },
        );
        if (readyControl !== "active") await requireActiveLease(lease, dependencies);
      } catch (error) {
        if (!(error instanceof AzureAiProviderError) || !isDocumentIssue(error)) throw error;
        documentResults.push({
          sourceDocumentId: source.sourceDocumentId,
          candidates: [],
          issues: [documentIssue(error.code)],
        });
        const failedControl = await dependencies.updateSourceDocument(
          lease,
          source.sourceDocumentId,
          { ocrStatus: "failed" },
        );
        if (failedControl !== "active") await requireActiveLease(lease, dependencies);
      }
    }

    const extractionControl = await dependencies.advanceLease(lease, {
      status: "extracting",
      currentStage: "model_extraction",
      progress: 55,
    });
    if (extractionControl !== "active") await requireActiveLease(lease, dependencies);

    for (const source of analyzedDocuments) {
      await requireActiveLease(lease, dependencies);
      const extraction = await dependencies.extractProject(source.layout, {
        documentKey: lease.sessionId,
      });
      documentResults.push({
        sourceDocumentId: source.sourceDocumentId,
        candidates: extraction.candidates,
        issues: extraction.issues,
      });
    }

    const normalizationControl = await dependencies.advanceLease(lease, {
      status: "normalizing",
      currentStage: "normalization",
      progress: 90,
    });
    if (normalizationControl !== "active") await requireActiveLease(lease, dependencies);

    const persisted = await dependencies.persistExtraction({
      sessionId: lease.sessionId,
      expectedAttemptCount: lease.attemptToken,
      documents: documentResults,
    });
    return {
      status: "review_ready",
      candidateCount: persisted.candidateCount,
      evidenceCount: persisted.evidenceCount,
      issueCount: persisted.issueCount,
      conflictCount: persisted.conflictCount,
    };
  } catch (error) {
    const workerError = safeWorkerError(error);
    if (workerError.code === "AI_IMPORT_LEASE_LOST" && !workerError.retryable) {
      return { status: "cancelled", reason: "cancel_requested" };
    }
    const failure = await dependencies.failLease(lease, workerError.code, workerError.retryable);
    if (failure === "failed") {
      return {
        status: "failed",
        reason: workerError.retryable ? "AI_IMPORT_RETRIES_EXHAUSTED" : workerError.code,
      };
    }
    if (failure === "lost") {
      throw new HouseImportWorkerError("AI_IMPORT_LEASE_LOST", true, { cause: workerError });
    }
    throw new HouseImportWorkerError(workerError.code, workerError.retryable, {
      cause: workerError,
      retryAfterSeconds: workerError.retryable
        ? workerError.retryAfterSeconds
          ?? RETRY_DELAYS_SECONDS[Math.min(lease.attemptToken - 1, RETRY_DELAYS_SECONDS.length - 1)]
        : undefined,
    });
  } finally {
    await heartbeat.stop();
  }
}
