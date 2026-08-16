import { Check, Circle, Download, FileText, Image as ImageIcon } from "lucide-react";
import { tv } from "tailwind-variants";
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
}

const marker = tv({
  base: "flex size-8 shrink-0 items-center justify-center rounded-data border",
  variants: {
    status: {
      completed: "border-brand-foundation-navy bg-brand-foundation-navy text-brand-warm-white",
      current: "border-brand-passage-blue bg-brand-passage-blue text-brand-warm-white",
      upcoming: "border-brand-steel bg-brand-warm-white text-brand-technical-graphite",
    },
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
  },
});

const statusLabel: Record<StageStatus, string> = {
  completed: "Ukończono",
  current: "Aktualny etap",
  upcoming: "Nadchodzący",
};

const statusLabelClassName: Record<StageStatus, string> = {
  completed: "text-brand-foundation-navy",
  current: "text-brand-passage-blue",
  upcoming: "text-brand-technical-graphite",
};

const documentIconByType = {
  pdf: FileText,
  image: ImageIcon,
} as const;

export function StageTimeline({ items, className }: StageTimelineProps) {
  return (
    <ol className={`flex flex-col ${className ?? ""}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.key} className="flex gap-brand-3" aria-current={item.status === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span className={marker({ status: item.status })}>
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
              {!isLast && <span className={connector({ status: item.status })} aria-hidden="true" />}
            </div>
            <div className="flex-1 pb-brand-4">
              <div className="flex flex-wrap items-baseline gap-brand-2">
                <Text as="span" variant="bodyL" className="font-medium">
                  {item.label}
                </Text>
                <Text as="span" variant="label" className={statusLabelClassName[item.status]}>
                  {statusLabel[item.status]}
                </Text>
              </div>
              {item.date && <Text tone="muted">{item.date}</Text>}
              {item.documents && item.documents.length > 0 && (
                <ul className="mt-brand-2 flex flex-col gap-1">
                  {item.documents.map((document) => {
                    const DocumentIcon = documentIconByType[document.type];
                    return (
                      <li key={document.name} className="flex items-center gap-brand-1">
                        <DocumentIcon
                          className="size-3.5 shrink-0 text-brand-technical-graphite"
                          aria-hidden="true"
                        />
                        <Text as="span" tone="muted">
                          {document.name}
                        </Text>
                        <Download
                          className="size-3.5 shrink-0 text-brand-technical-graphite"
                          aria-hidden="true"
                        />
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
