"use client";

import { CircleAlert, CircleCheck, CircleDot, Hourglass, Lock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LargeOrderTonePill } from "@/components/internal/LargeOrderPills";
import type { TaskStatus, ThreadStatus } from "@/lib/conversations/constants";
import { TASK_STATUS_LABELS, THREAD_STATUS_LABELS } from "@/lib/conversations/constants";

// Wspólne klasy i drobne elementy ekranów notatnika rozmów (spec 0080).

export const fieldClass =
  "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy";
export const textareaClass =
  "focus-ring w-full rounded-data border border-brand-steel bg-brand-warm-white p-brand-2 text-body text-brand-foundation-navy";
export const labelClass = "flex flex-col gap-brand-1 text-data";
export const labelTextClass = "text-brand-technical-graphite";
export const primaryButtonClass =
  "focus-ring inline-flex h-10 items-center rounded-data bg-brand-foundation-navy px-brand-3 text-body font-medium text-brand-warm-white disabled:opacity-50";
export const secondaryButtonClass =
  "focus-ring inline-flex h-10 items-center rounded-data border border-brand-steel px-brand-3 text-body font-medium hover:bg-brand-steel/30 disabled:opacity-50";

const THREAD_PILL: Record<ThreadStatus, { tone: "zinc" | "amber" | "sky" | "emerald"; icon: typeof Lock }> = {
  closed: { tone: "zinc", icon: Lock },
  waiting_us: { tone: "amber", icon: CircleAlert },
  waiting_them: { tone: "sky", icon: Hourglass },
  open: { tone: "emerald", icon: CircleDot },
};

// Status sprawy: kolor, ikona i tekst razem (AC-2), nigdy sam kolor.
export function ThreadStatusPill({ status }: { status: ThreadStatus }) {
  const { tone, icon } = THREAD_PILL[status];
  return (
    <LargeOrderTonePill tone={tone} icon={icon}>
      {THREAD_STATUS_LABELS[status]}
    </LargeOrderTonePill>
  );
}

const TASK_PILL: Record<TaskStatus, { tone: "sky" | "emerald" | "zinc"; icon: typeof Lock }> = {
  open: { tone: "sky", icon: CircleDot },
  done: { tone: "emerald", icon: CircleCheck },
  cancelled: { tone: "zinc", icon: XCircle },
};

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  const { tone, icon } = TASK_PILL[status];
  return (
    <LargeOrderTonePill tone={tone} icon={icon}>
      {TASK_STATUS_LABELS[status]}
    </LargeOrderTonePill>
  );
}

interface ActionOutcome {
  ok: boolean;
  error?: string;
}

// Wywołanie akcji serwerowej z błędem pod ręką i odświeżeniem ekranu po sukcesie.
export function useRunAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<R extends ActionOutcome>(action: () => Promise<R>, onOk?: (result: R) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać zmiany.");
        return;
      }
      onOk?.(result);
      router.refresh();
    });
  }

  return { run, isPending, error, setError };
}

export function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-body text-status-blocked">
      {error}
    </p>
  );
}
