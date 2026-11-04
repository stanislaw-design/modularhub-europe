import { CircleSlash, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LINK_KIND_LABELS } from "@/lib/conversations/constants";
import type { ResolvedPlatformLink } from "@/lib/conversations/platform-links";

// Klikalny link do rekordu platformy z jego bieżącym statusem (spec 0080 AC-18). Gdy rekord zniknął
// albo odczyt się nie udał, to jedno miejsce pokazuje "Rekord niedostępny" i nic więcej nie cierpi (AC-3).
// Niedostępność ma ikonę i tekst, nigdy sam kolor.
export function PlatformLinkBadge({ locale, link }: { locale: string; link: ResolvedPlatformLink }) {
  const kindLabel = LINK_KIND_LABELS[link.kind];
  if (!link.available) {
    return (
      <span className="inline-flex items-center gap-brand-1 text-data text-brand-technical-graphite">
        <CircleSlash aria-hidden="true" className="h-4 w-4" />
        {kindLabel}: rekord niedostępny
      </span>
    );
  }
  return (
    <Link href={`/${locale}${link.path}`} className="focus-ring inline-flex items-center gap-brand-1 text-data underline">
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
      {kindLabel}: {link.label}
      {link.status ? ` (${link.status})` : ""}
    </Link>
  );
}
