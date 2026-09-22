import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzePdfLayout } from "../lib/ai/document-intelligence";
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

  const pdfArgument = process.argv[2];
  if (!pdfArgument) {
    console.log(JSON.stringify({ service: "document-intelligence", skipped: true, reason: "NO_TEST_PDF" }));
    return;
  }

  const pdf = await readFile(resolve(pdfArgument));
  const layout = await analyzePdfLayout(pdf);
  console.log(
    JSON.stringify({
      service: "document-intelligence",
      ok: true,
      model: layout.modelId,
      apiVersion: layout.apiVersion,
      pages: layout.pages.length,
      languages: [...new Set(layout.pages.map((page) => page.language?.locale).filter(Boolean))],
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
