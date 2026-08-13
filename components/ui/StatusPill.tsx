import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

const pill = tv({
  base: "inline-flex items-center gap-brand-1 rounded-data border px-brand-2 py-1 text-label uppercase tracking-[0.1em] font-medium",
  variants: {
    status: {
      approved: "border-status-approved/30 bg-status-approved/10 text-status-approved",
      conditional: "border-status-conditional/30 bg-status-conditional/10 text-status-conditional",
      blocked: "border-status-blocked/30 bg-status-blocked/10 text-status-blocked",
    },
  },
});

const iconByStatus = {
  approved: CheckCircle2,
  conditional: AlertTriangle,
  blocked: XCircle,
} as const;

interface StatusPillProps extends VariantProps<typeof pill> {
  status: "approved" | "conditional" | "blocked";
  children: string;
  className?: string;
}

export function StatusPill({ status, children, className }: StatusPillProps) {
  const Icon = iconByStatus[status];
  return (
    <span className={pill({ status, className })}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
