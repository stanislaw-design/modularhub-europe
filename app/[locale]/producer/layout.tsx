import type { ReactNode } from "react";
import { RouteShell } from "@/components/RouteShell";
import { SkipLink } from "@/components/SkipLink";
import { ProducerHeader } from "@/components/producent/ProducerHeader";

export default async function ProducentLayout({
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
