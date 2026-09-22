export type AzureAiErrorCode =
  | "AZURE_DOCUMENT_ANALYSIS_FAILED"
  | "AZURE_DOCUMENT_ANALYSIS_TIMEOUT"
  | "AZURE_DOCUMENT_RESULT_INVALID"
  | "AZURE_OPENAI_REQUEST_FAILED"
  | "AZURE_OPENAI_RESPONSE_INVALID";

interface AzureAiProviderErrorOptions extends ErrorOptions {
  fieldPath?: string;
  providerCode?: string;
  rateLimitTokens?: number;
  remainingTokens?: number;
  tokenLimitResetsAfter?: string;
  retryAfterSeconds?: number;
  requestId?: string;
}

export class AzureAiProviderError extends Error {
  readonly fieldPath?: string;
  readonly providerCode?: string;
  readonly rateLimitTokens?: number;
  readonly remainingTokens?: number;
  readonly tokenLimitResetsAfter?: string;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;

  constructor(
    readonly code: AzureAiErrorCode,
    readonly retryable: boolean,
    readonly statusCode?: number,
    options: AzureAiProviderErrorOptions = {},
  ) {
    super(code, options);
    this.name = "AzureAiProviderError";
    this.fieldPath = options.fieldPath;
    this.providerCode = options.providerCode;
    this.rateLimitTokens = options.rateLimitTokens;
    this.remainingTokens = options.remainingTokens;
    this.tokenLimitResetsAfter = options.tokenLimitResetsAfter;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.requestId = options.requestId;
  }
}
