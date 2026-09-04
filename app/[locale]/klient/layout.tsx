import type { ReactNode } from "react";
import { auth } from "@/auth";
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
  const session = await auth();

  return (
    <>
      <SkipLink />
      <SiteHeader locale={locale} session={session} />
      <RouteShell>{children}</RouteShell>
    </>
  );
}
