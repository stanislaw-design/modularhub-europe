import type { ReactNode } from "react";
import { auth } from "@/auth";
import { QuickEntryDialog } from "@/components/internal/conversations/QuickEntryDialog";
import { Heading } from "@/components/ui";
import { getQuickEntryOptions, listActiveAdmins } from "@/lib/conversations/queries";
import { CASE_TEMPLATES } from "@/lib/conversations/templates";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Nagłówek sekcji "Rozmowy" z oknem szybkiego wpisu na każdym ekranie (spec 0080 AC-17).
// To nie jest bramka: każda strona sekcji powtarza własną (internal/AGENTS.md). Layout tylko
// nie czyta danych dla kogoś, kto nie jest administratorem, a awaria odczytu opcji chowa sam przycisk.
export default async function ConversationsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "admin";
  const data = isAdmin
    ? await Promise.all([getQuickEntryOptions(), listActiveAdmins()]).catch(() => null)
    : null;

  let quickEntry: ReactNode = null;
  if (isAdmin && session) {
    quickEntry = data ? (
      <QuickEntryDialog
        locale={locale}
        currentUserId={session.user.id}
        admins={data[1].map((admin) => ({ id: admin.id, name: admin.name }))}
        partners={data[0].partners}
        threads={data[0].threads}
        contacts={data[0].contacts}
        templates={CASE_TEMPLATES.map((template) => ({ key: template.key, name: template.name, taskCount: template.tasks.length }))}
      />
    ) : (
      <span className="text-body text-brand-technical-graphite">Szybki wpis niedostępny</span>
    );
  }

  return (
    <div className="flex flex-col gap-brand-5">
      <div className="flex items-center justify-end gap-brand-3">
        <Heading level="h1" className="sr-only">
          Rozmowy
        </Heading>
        {quickEntry}
      </div>
      {children}
    </div>
  );
}
