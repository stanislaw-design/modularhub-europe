import type { TokenCredential } from "@azure/core-auth";
import { getBearerTokenProvider } from "@azure/identity";
import OpenAI from "openai";
import { getAzureAiConfig } from "@/lib/ai/azure-config";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import { createAzureCredential } from "@/lib/ai/azure-identity";

const AZURE_AI_SCOPE = "https://ai.azure.com/.default";

export function createAzureOpenAiClient(credential: TokenCredential = createAzureCredential()): OpenAI {
  const { openAiEndpoint } = getAzureAiConfig();
  const tokenProvider = getBearerTokenProvider(credential, AZURE_AI_SCOPE);

  return new OpenAI({
    baseURL: `${openAiEndpoint}/openai/v1/`,
    apiKey: tokenProvider,
    maxRetries: 0,
    timeout: 5 * 60 * 1000,
  });
}

export interface AzureOpenAiProbeResult {
  responseId: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export async function probeAzureOpenAi(client: OpenAI = createAzureOpenAiClient()): Promise<AzureOpenAiProbeResult> {
  const { openAiDeployment, openAiModelSnapshot } = getAzureAiConfig();

  try {
    const response = await client.responses.create({
      model: openAiDeployment,
      instructions: "Return exactly the word OK. Do not use tools.",
      input: "Connection check.",
      max_output_tokens: 16,
      store: false,
    });

    return {
      responseId: response.id,
      model: `${openAiDeployment}:${openAiModelSnapshot}`,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    };
  } catch (error) {
    const statusCode = error instanceof OpenAI.APIError ? error.status : undefined;
    const retryable = statusCode === undefined || [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
    throw new AzureAiProviderError("AZURE_OPENAI_REQUEST_FAILED", retryable, statusCode, { cause: error });
  }
}
