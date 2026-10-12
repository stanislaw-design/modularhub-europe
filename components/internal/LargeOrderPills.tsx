import { Building2, CircleCheck, CircleDashed, Inbox, Link2, Megaphone, Package, XCircle, type LucideIcon } from "lucide-react";
import type { LargeOrderKind, LargeOrderStatus } from "@/lib/db/queries";

// Każda plakietka ma własny kolor (pełne nazwy klas, żeby Tailwind je widział);
// tekst ciemniejszy w jasnym motywie i jaśniejszy w ciemnym, ikona dalej niesie
// znaczenie obok koloru.
type Tone = "violet" | "teal" | "sky" | "indigo" | "amber" | "emerald" | "zinc";

const TONE_CLASSES: Record<Tone, string> = {
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  zinc: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

function Pill({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-data border px-brand-2 py-0.5 text-label font-medium ${TONE_CLASSES[tone]}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

const KIND: Record<LargeOrderKind, { label: string; tone: Tone; icon: LucideIcon }> = {
  request: { label: "Zapytanie wolne", tone: "violet", icon: Building2 },
  product: { label: "Produkt", tone: "teal", icon: Package },
};

// Rodzaj zapytania jako plakietka: ikona plus tekst, nigdy sam kolor.
export function LargeOrderKindPill({ kind }: { kind: LargeOrderKind }) {
  const { label, tone, icon } = KIND[kind];
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}

const STATUS: Record<LargeOrderStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  open: { label: "Zbieramy oferty", tone: "sky", icon: CircleDashed },
  quoted: { label: "Są oferty", tone: "indigo", icon: Inbox },
  published: { label: "Opublikowane", tone: "amber", icon: Megaphone },
  accepted: { label: "Połączone", tone: "emerald", icon: Link2 },
  closed: { label: "Zamknięte", tone: "zinc", icon: XCircle },
};

export const LARGE_ORDER_STATUS_LABEL: Record<LargeOrderStatus, string> = {
  open: STATUS.open.label,
  quoted: STATUS.quoted.label,
  published: STATUS.published.label,
  accepted: STATUS.accepted.label,
  closed: STATUS.closed.label,
};

const QUOTE_STATUS: Record<string, { label: string; tone: Tone; icon: LucideIcon }> = {
  active: { label: "Aktywna", tone: "sky", icon: CircleDashed },
  superseded: { label: "Zastąpiona nowszą", tone: "zinc", icon: XCircle },
  accepted: { label: "Wybrana", tone: "emerald", icon: CircleCheck },
  rejected: { label: "Odrzucona", tone: "zinc", icon: XCircle },
};

// Status pojedynczej oferty producenta, ten sam język plakietek co status zapytania.
export function LargeOrderQuoteStatusPill({ status }: { status: string }) {
  const entry = QUOTE_STATUS[status] ?? { label: status, tone: "zinc" as Tone, icon: CircleCheck };
  return (
    <Pill tone={entry.tone} icon={entry.icon}>
      {entry.label}
    </Pill>
  );
}

// Ogólna plakietka dla stanów oferty, które nie mają własnej mapy (np. "Do publikacji").
export function LargeOrderTonePill({ tone, icon, children }: { tone: Tone; icon: LucideIcon; children: string }) {
  return (
    <Pill tone={tone} icon={icon}>
      {children}
    </Pill>
  );
}

export function LargeOrderStatusPill({ status }: { status: LargeOrderStatus }) {
  const entry = STATUS[status];
  if (!entry) {
    return (
      <Pill tone="zinc" icon={CircleCheck}>
        {status}
      </Pill>
    );
  }
  return (
    <Pill tone={entry.tone} icon={entry.icon}>
      {entry.label}
    </Pill>
  );
}
