import { probeAzureOpenAi } from "../lib/ai/openai";

async function main() {
  try {
    const r = await probeAzureOpenAi();
    console.log("OK", JSON.stringify(r));
  } catch (e: any) {
    console.error("NAME:", e?.name);
    console.error("MESSAGE:", e?.message);
    console.error("CAUSE_NAME:", e?.cause?.name);
    console.error("CAUSE_MESSAGE:", e?.cause?.message ?? "");
  }
}
main();
