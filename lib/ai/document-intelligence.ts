import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  type AnalyzeOperationOutput,
  type AnalyzeResultOutput,
  type DocumentLanguageOutput,
  type DocumentPageOutput,
  type DocumentSpanOutput,
} from "@azure-rest/ai-document-intelligence";
import type { TokenCredential } from "@azure/core-auth";
import { getAzureAiConfig } from "@/lib/ai/azure-config";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import { createAzureCredential } from "@/lib/ai/azure-identity";

const DOCUMENT_ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

export interface AzureDocumentLine {
  content: string;
  polygon: readonly number[] | null;
}

export interface AzureDocumentPage {
  pageNumber: number;
  text: string;
  averageWordConfidence: number | null;
  language: { locale: string; confidence: number } | null;
  lines: readonly AzureDocumentLine[];
}

export interface AzureDocumentLayout {
  apiVersion: string;
  modelId: string;
  pages: readonly AzureDocumentPage[];
}

function pageRange(page: DocumentPageOutput): DocumentSpanOutput | null {
  if (page.spans.length === 0) return null;
  const start = Math.min(...page.spans.map((span) => span.offset));
  const end = Math.max(...page.spans.map((span) => span.offset + span.length));
  return { offset: start, length: end - start };
}

function overlaps(first: DocumentSpanOutput, second: DocumentSpanOutput): boolean {
  const firstEnd = first.offset + first.length;
  const secondEnd = second.offset + second.length;
  return first.offset < secondEnd && second.offset < firstEnd;
}

function languageForPage(
  page: DocumentPageOutput,
  languages: readonly DocumentLanguageOutput[],
): AzureDocumentPage["language"] {
  const range = pageRange(page);
  if (!range) return null;

  const best = languages
    .filter((language) => language.spans.some((span) => overlaps(range, span)))
    .sort((left, right) => right.confidence - left.confidence)[0];

  return best ? { locale: best.locale, confidence: best.confidence } : null;
}

function averageWordConfidence(page: DocumentPageOutput): number | null {
  const words = page.words ?? [];
  if (words.length === 0) return null;
  return words.reduce((total, word) => total + word.confidence, 0) / words.length;
}

export function normalizeDocumentLayout(result: AnalyzeResultOutput): AzureDocumentLayout {
  return {
    apiVersion: result.apiVersion,
    modelId: result.modelId,
    pages: result.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: (page.lines ?? []).map((line) => line.content).join("\n"),
      averageWordConfidence: averageWordConfidence(page),
      language: languageForPage(page, result.languages ?? []),
      lines: (page.lines ?? []).map((line) => ({
        content: line.content,
        polygon: line.polygon ?? null,
      })),
    })),
  };
}

export async function analyzePdfLayout(
  pdf: Uint8Array,
  options: { credential?: TokenCredential; timeoutMs?: number } = {},
): Promise<AzureDocumentLayout> {
  const { documentIntelligenceEndpoint } = getAzureAiConfig();
  const client = DocumentIntelligence(documentIntelligenceEndpoint, options.credential ?? createAzureCredential());
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), options.timeoutMs ?? DOCUMENT_ANALYSIS_TIMEOUT_MS);

  try {
    const initialResponse = await client.path("/documentModels/{modelId}:analyze", "prebuilt-layout").post({
      contentType: "application/json",
      body: { base64Source: Buffer.from(pdf).toString("base64") },
      queryParameters: {
        features: ["languages"],
        outputContentFormat: "text",
      },
      abortSignal: abortController.signal,
    });

    if (isUnexpected(initialResponse)) {
      const statusCode = Number(initialResponse.status);
      throw new AzureAiProviderError(
        "AZURE_DOCUMENT_ANALYSIS_FAILED",
        RETRYABLE_STATUS_CODES.has(statusCode),
        statusCode,
      );
    }

    const poller = getLongRunningPoller(client, initialResponse, { intervalInMs: 1000 });
    const operation = (await poller.pollUntilDone({ abortSignal: abortController.signal })).body as AnalyzeOperationOutput;
    if (operation.status !== "succeeded" || !operation.analyzeResult) {
      throw new AzureAiProviderError("AZURE_DOCUMENT_RESULT_INVALID", false);
    }

    return normalizeDocumentLayout(operation.analyzeResult);
  } catch (error) {
    if (error instanceof AzureAiProviderError) throw error;
    if (abortController.signal.aborted) {
      throw new AzureAiProviderError("AZURE_DOCUMENT_ANALYSIS_TIMEOUT", true, undefined, { cause: error });
    }
    throw new AzureAiProviderError("AZURE_DOCUMENT_ANALYSIS_FAILED", true, undefined, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
