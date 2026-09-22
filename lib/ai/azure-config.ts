import { z } from "zod";

const azureAiConfigSchema = z
  .object({
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().url(),
    AZURE_OPENAI_ENDPOINT: z.string().url(),
    AZURE_OPENAI_DEPLOYMENT: z.string().min(1),
    AZURE_OPENAI_MODEL_SNAPSHOT: z.string().min(1),
  })
  .strict();

export interface AzureAiConfig {
  documentIntelligenceEndpoint: string;
  openAiEndpoint: string;
  openAiDeployment: string;
  openAiModelSnapshot: string;
}

export class AzureAiConfigurationError extends Error {
  readonly code = "AZURE_AI_CONFIGURATION_INVALID";

  constructor(readonly missingOrInvalidVariables: readonly string[]) {
    super(`Brak lub nieprawidłowa konfiguracja Azure AI: ${missingOrInvalidVariables.join(", ")}`);
    this.name = "AzureAiConfigurationError";
  }
}

export function getAzureAiConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AzureAiConfig {
  const parsed = azureAiConfigSchema.safeParse({
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: environment.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    AZURE_OPENAI_ENDPOINT: environment.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: environment.AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_MODEL_SNAPSHOT: environment.AZURE_OPENAI_MODEL_SNAPSHOT,
  });

  if (!parsed.success) {
    const variables = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))]
      .filter(Boolean)
      .sort();
    throw new AzureAiConfigurationError(variables);
  }

  return {
    documentIntelligenceEndpoint: parsed.data.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.replace(/\/+$/, ""),
    openAiEndpoint: parsed.data.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, ""),
    openAiDeployment: parsed.data.AZURE_OPENAI_DEPLOYMENT,
    openAiModelSnapshot: parsed.data.AZURE_OPENAI_MODEL_SNAPSHOT,
  };
}
