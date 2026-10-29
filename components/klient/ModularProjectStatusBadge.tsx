import { CheckCircle2, CircleDashed, Hammer, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ModularProjectStatus } from "@/lib/data/modularprojects";

const ICONS: Record<ModularProjectStatus, LucideIcon> = {
  planned: CircleDashed,
  in_production: Hammer,
  delivered: CheckCircle2,
};

// Status wpisu: ikona plus tekst, nigdy sam kolor (WCAG 2.2 AA, spec 0076 AC-12).
export async function ModularProjectStatusBadge({ status, locale }: { status: ModularProjectStatus; locale: string }) {
  const t = await getTranslations({ locale, namespace: "ModularProjectsPage.status" });
  const Icon = ICONS[status];
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-v5-pill border border-brand-v5-line px-brand-2 py-1 text-data font-semibold text-brand-v5-ink">
      <Icon className="size-3.5" aria-hidden="true" />
      {t(status)}
    </span>
  );
}
