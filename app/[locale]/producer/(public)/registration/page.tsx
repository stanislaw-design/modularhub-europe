import { redirect } from "next/navigation";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Cienki alias (spec 0040 AC-10): stara trasa nadal działa, ale przekierowuje
// na wspólny wizard zamiast renderować własny formularz. Zostaje jako plik,
// bo dzisiejsze linki (nawigacja, BulkOrdersShowcase, marketing producenta,
// proxy.ts, testy) wskazują wprost tutaj i nie wymagają zmiany.
export default async function ProducerRegistrationRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ locale }, { callbackUrl }] = await Promise.all([params, searchParams]);
  const query = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
  redirect(`/${locale}/registration?role=producer${query}`);
}
