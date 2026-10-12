import { request } from "@playwright/test";

// Staging jest za ochroną wdrożeń Vercel (SSO). Jedno żądanie z sekretem obejścia
// dla automatyzacji sprawia, że Vercel ustawia ciasteczko dla tej domeny, a testy
// używają go przez storageState. Sekret nie jest wysyłany na obce domeny (obrazy,
// analityka), czego nie dałoby się uniknąć przez extraHTTPHeaders.
// Bez PLAYWRIGHT_BASE_URL (lokalny dev) i bez sekretu nie robi nic.
export const BYPASS_STATE_PATH = "e2e/.auth/vercel-bypass.json";

export default async function globalSetup(): Promise<void> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!secret || !baseURL) return;

  const context = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const response = await context.get("/");
  if (!response.ok()) {
    throw new Error(`Obejście ochrony Vercel nie zadziałało (status ${response.status()}). Sprawdź VERCEL_AUTOMATION_BYPASS_SECRET.`);
  }
  await context.storageState({ path: BYPASS_STATE_PATH });
  await context.dispose();
}
