import type { ReactNode } from "react";
import { RouteShell } from "@/components/RouteShell";
import { SkipLink } from "@/components/SkipLink";
import { SiteHeader } from "@/components/klient/SiteHeader";

export default async function KlientLayout({
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
      <SiteHeader locale={locale} />
      <RouteShell>{children}</RouteShell>
    </>
  );
}
