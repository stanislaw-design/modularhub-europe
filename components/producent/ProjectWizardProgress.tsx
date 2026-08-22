"use client";

import { Check } from "lucide-react";
import { tv } from "tailwind-variants";
import { Text } from "@/components/ui";
import type { WizardStep } from "@/lib/producer-project-draft";

type StepStatus = "completed" | "current" | "upcoming";

interface ProjectWizardProgressProps {
  steps: WizardStep[];
  currentIndex: number;
  maxReachedIndex: number;
  onStepClick: (index: number) => void;
}

const marker = tv({
  base: "flex size-8 shrink-0 items-center justify-center rounded-data border text-label font-medium",
  variants: {
    status: {
      completed: "border-brand-foundation-navy bg-brand-foundation-navy text-brand-warm-white",
      current: "border-brand-passage-blue bg-brand-passage-blue text-brand-action-foreground",
      upcoming: "border-brand-steel bg-brand-warm-white text-brand-technical-graphite",
    },
  },
});

function statusFor(index: number, currentIndex: number, maxReachedIndex: number): StepStatus {
  if (index === currentIndex) return "current";
  if (index <= maxReachedIndex) return "completed";
  return "upcoming";
}

export function ProjectWizardProgress({
  steps,
  currentIndex,
  maxReachedIndex,
  onStepClick,
}: ProjectWizardProgressProps) {
  return (
    <ol className="flex flex-wrap gap-brand-3" aria-label="Postęp kreatora">
      {steps.map((step, index) => {
        const status = statusFor(index, currentIndex, maxReachedIndex);
        const clickable = status === "completed";
        return (
          <li key={step.id} aria-current={status === "current" ? "step" : undefined}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick(index)}
              className="focus-ring flex items-center gap-brand-1 rounded-data disabled:cursor-default"
            >
              <span className={marker({ status })}>
                {status === "completed" ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <Text as="span" variant="label" tone={status === "upcoming" ? "muted" : "default"}>
                {step.label}
              </Text>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
