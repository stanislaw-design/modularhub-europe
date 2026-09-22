import { AzureAiProviderError } from "../lib/ai/azure-errors";
import { probeAzureOpenAi } from "../lib/ai/openai";

async function main(): Promise<void> {
  const openAi = await probeAzureOpenAi();
  console.log(
    JSON.stringify({
      service: "azure-openai",
      ok: true,
      model: openAi.model,
      inputTokens: openAi.inputTokens,
      outputTokens: openAi.outputTokens,
    }),
  );
}

main().catch((error: unknown) => {
  if (error instanceof AzureAiProviderError) {
    console.error(JSON.stringify({ ok: false, code: error.code, retryable: error.retryable, statusCode: error.statusCode }));
  } else {
    console.error(JSON.stringify({ ok: false, code: "AZURE_AI_CHECK_FAILED" }));
  }
  process.exitCode = 1;
});
