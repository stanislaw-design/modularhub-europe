import type { ReactNode } from "react";
import { RouteShell } from "@/components/RouteShell";
import { SkipLink } from "@/components/SkipLink";
import { ProducerHeader } from "@/components/producent/ProducerHeader";

// Shell for the public/pre-auth producer routes (landing, registration, demo
// screens): logo + home/language/account header. Scoped to this route group
// (not app/[locale]/producer/layout.tsx) so the signed-in panel branch, which
// gets its own sidebar shell (see panel/layout.tsx), never renders this
// header too — Next.js applies every ancestor layout, so keeping the header
// here is what makes it *not* wrap the panel branch.
export default async function ProducerPublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <SkipLink />
      <ProducerHeader locale={locale} />
      <RouteShell>{children}</RouteShell>
    </>
  );
}
