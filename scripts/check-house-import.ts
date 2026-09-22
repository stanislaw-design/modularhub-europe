import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzePdfLayout } from "../lib/ai/document-intelligence";
import { AzureAiProviderError } from "../lib/ai/azure-errors";
import { extractHouseProject } from "../lib/ai/house-project-extraction";
import { prepareHouseProjectExtractionPersistence } from "../lib/ai/house-project-extraction-persistence";

const DEFAULT_FIXTURE = "_docs/treevia-do-testów.pdf";

async function main(): Promise<void> {
  const pdfPath = resolve(process.argv[2] ?? DEFAULT_FIXTURE);
  const pdf = await readFile(pdfPath);
  const layout = await analyzePdfLayout(pdf);
  const extraction = await extractHouseProject(layout, { documentKey: "treevia-nord-68" });
  const prepared = prepareHouseProjectExtractionPersistence({
    sessionId: "00000000-0000-4000-8000-000000000001",
    documents: [{
      sourceDocumentId: "00000000-0000-4000-8000-000000000002",
      candidates: extraction.candidates,
      issues: extraction.issues,
    }],
  });

  console.log(JSON.stringify({
    ok: true,
    fixture: DEFAULT_FIXTURE,
    pages: layout.pages.length,
    documentLanguage: extraction.documentLanguage,
    model: extraction.model,
    targetCurrency: extraction.targetCurrency,
    requestCount: extraction.responseIds.length,
    inputTokens: extraction.inputTokens,
    outputTokens: extraction.outputTokens,
    candidateCount: extraction.candidates.length,
    consolidatedCandidateCount: prepared.candidates.length,
    conflictCount: prepared.conflictCount,
    consolidatedEvidenceCount: prepared.candidates.reduce((sum, candidate) => sum + candidate.evidence.length, 0),
    issueCount: extraction.issues.length,
    issues: extraction.issues,
    priceNormalization: extraction.candidates
      .filter((candidate) => candidate.fieldPath === "variants[].priceMinCents" || candidate.fieldPath === "variants[].priceMaxCents")
      .map((candidate) => ({
        fieldPath: candidate.fieldPath,
        sourceCurrency: candidate.normalizationMetadata?.sourceCurrency,
        targetCurrency: candidate.normalizationMetadata?.targetCurrency,
        rateDate: candidate.normalizationMetadata?.rateDate,
        rounding: candidate.normalizationMetadata?.rounding,
      })),
    candidates: extraction.candidates.map((candidate) => ({
      fieldPath: candidate.fieldPath,
      entityKey: candidate.entityKey,
      parentEntityKey: candidate.parentEntityKey,
      origin: candidate.origin,
      confidence: candidate.confidence,
      evidencePages: candidate.evidence.map((item) => item.pageNumber),
    })),
  }));
}

main().catch((error: unknown) => {
  if (error instanceof AzureAiProviderError) {
    console.error(JSON.stringify({
      ok: false,
      code: error.code,
      retryable: error.retryable,
      statusCode: error.statusCode,
      fieldPath: error.fieldPath,
      providerCode: error.providerCode,
      rateLimitTokens: error.rateLimitTokens,
      remainingTokens: error.remainingTokens,
      tokenLimitResetsAfter: error.tokenLimitResetsAfter,
      retryAfterSeconds: error.retryAfterSeconds,
      requestId: error.requestId,
    }));
  } else {
    console.error(JSON.stringify({ ok: false, code: "HOUSE_IMPORT_CHECK_FAILED" }));
  }
  process.exitCode = 1;
});
