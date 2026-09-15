import { Check, Circle, Download, FileText, Image as ImageIcon } from "lucide-react";
import { tv } from "@/lib/tv";
import { Text } from "./Text";

export type StageStatus = "completed" | "current" | "upcoming";

export interface StageTimelineDocument {
  name: string;
  type: "pdf" | "image";
}

export interface StageTimelineItem {
  key: string;
  label: string;
  status: StageStatus;
  date?: string | null;
  documents?: StageTimelineDocument[];
}

interface StageTimelineProps {
  items: StageTimelineItem[];
  className?: string;
  surface?: "v3" | "v5";
  // Domain free primitive: never bakes in its own copy (see components/ui/AGENTS.md),
  // so the three status words come from the caller, already resolved via next-intl.
  statusLabels: Record<StageStatus, string>;
}

const marker = tv({
  base: "flex size-8 shrink-0 items-center justify-center rounded-data border",
  variants: {
    status: {
      completed: "border-brand-foundation-navy bg-brand-foundation-navy text-brand-warm-white",
      current: "border-brand-passage-blue bg-brand-passage-blue text-brand-action-foreground",
      upcoming: "border-brand-steel bg-brand-warm-white text-brand-technical-graphite",
    },
    surface: {
      v3: "",
      v5: "",
    },
  },
  compoundVariants: [
    { status: "completed", surface: "v5", class: "border-brand-v5-ink bg-brand-v5-ink" },
    {
      status: "current",
      surface: "v5",
      class: "border-brand-v5-amber-strong bg-brand-v5-amber-strong text-brand-v5-amber-foreground",
    },
    { status: "upcoming", surface: "v5", class: "border-brand-v5-line bg-brand-v5-surface text-brand-v5-muted" },
  ],
  defaultVariants: {
    surface: "v3",
  },
});

const connector = tv({
  base: "w-px flex-1",
  variants: {
    status: {
      completed: "bg-brand-foundation-navy",
      current: "bg-brand-steel",
      upcoming: "bg-brand-steel",
    },
    surface: {
      v3: "",
      v5: "",
    },
  },
  compoundVariants: [
    { status: "completed", surface: "v5", class: "bg-brand-v5-ink" },
    { status: "current", surface: "v5", class: "bg-brand-v5-line" },
    { status: "upcoming", surface: "v5", class: "bg-brand-v5-line" },
  ],
  defaultVariants: {
    surface: "v3",
  },
});

const statusLabelClassName: Record<"v3" | "v5", Record<StageStatus, string>> = {
  v3: {
    completed: "text-brand-foundation-navy",
    current: "text-brand-passage-blue",
    upcoming: "text-brand-technical-graphite",
  },
  v5: {
    completed: "text-brand-v5-ink",
    // ink, not amber-strong: amber-strong (#e89200) on white is ~2.5:1,
    // below WCAG's 4.5:1 text threshold (AC-9).
    current: "text-brand-v5-ink",
    upcoming: "text-brand-v5-muted",
  },
};

const documentIconByType = {
  pdf: FileText,
  image: ImageIcon,
} as const;

export function StageTimeline({ items, className, surface = "v3", statusLabels }: StageTimelineProps) {
  const iconMutedClass = surface === "v5" ? "text-brand-v5-muted" : "text-brand-technical-graphite";
  return (
    <ol className={`flex flex-col ${className ?? ""}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.key} className="flex gap-brand-3" aria-current={item.status === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span className={marker({ status: item.status, surface })}>
                {item.status === "completed" ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Circle
                    className="size-4"
                    fill={item.status === "current" ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                )}
              </span>
              {!isLast && <span className={connector({ status: item.status, surface })} aria-hidden="true" />}
            </div>
            <div className="flex-1 pb-brand-4">
              <div className="flex flex-wrap items-baseline gap-brand-2">
                <Text as="span" variant="bodyL" surface={surface} className="font-medium">
                  {item.label}
                </Text>
                <Text as="span" variant="label" surface={surface} className={statusLabelClassName[surface][item.status]}>
                  {statusLabels[item.status]}
                </Text>
              </div>
              {item.date && (
                <Text tone="muted" surface={surface}>
                  {item.date}
                </Text>
              )}
              {item.documents && item.documents.length > 0 && (
                <ul className="mt-brand-2 flex flex-col gap-1">
                  {item.documents.map((document) => {
                    const DocumentIcon = documentIconByType[document.type];
                    return (
                      <li key={document.name} className="flex items-center gap-brand-1">
                        <DocumentIcon className={`size-3.5 shrink-0 ${iconMutedClass}`} aria-hidden="true" />
                        <Text as="span" tone="muted" surface={surface}>
                          {document.name}
                        </Text>
                        <Download className={`size-3.5 shrink-0 ${iconMutedClass}`} aria-hidden="true" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
