"use client";

import { Ban, CircleCheck, CircleDashed, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProducerOverride } from "@/lib/large-order-admin-actions";
import { LargeOrderTonePill } from "./LargeOrderPills";

interface ProducerOverridesAdminSectionProps {
  projectRequestId: string;
  producers: {
    producerId: string;
    name: string;
    countryCode: string;
    matched: boolean;
    override: "include" | "exclude" | null;
  }[];
}

type Mode = "include" | "exclude" | "none";

// Spec 0070 AC-2, AC-10: producenci, którzy widzą zapytanie (reguła dopasowania z
// wyjątkami), z podziałem na dopasowanych i wyjątki. Administrator dodaje
// producenta wyjątkiem, wyklucza go albo zdejmuje wyjątek. router.refresh() po
// zapisie zamiast stanu optymistycznego, jak w ProducerBlockControl.
export function ProducerOverridesAdminSection({ projectRequestId, producers }: ProducerOverridesAdminSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(producerId: string, mode: Mode) {
    setError(null);
    startTransition(async () => {
      const result = await setProducerOverride(projectRequestId, producerId, mode);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać wyjątku.");
        return;
      }
      router.refresh();
    });
  }

  const visibleCount = producers.filter((item) => item.matched).length;

  return (
    <section aria-labelledby="order-producers-heading" className="flex flex-col gap-brand-3">
      <div>
        <h2 id="order-producers-heading" className="text-h3 font-semibold">
          Producenci widzący zapytanie
        </h2>
        <p className="text-data text-brand-technical-graphite">
          {visibleCount === 0
            ? "Nikt nie widzi tego zapytania. Dodaj producenta wyjątkiem albo sprawdź profile producentów (rodziny, standardy, moc)."
            : `${visibleCount} z ${producers.length} zatwierdzonych producentów widzi to zapytanie.`}
        </p>
      </div>
      {producers.length === 0 ? (
        <div className="rounded-card border border-dashed border-brand-steel p-brand-4 text-body text-brand-technical-graphite">
          Brak producentów zatwierdzonych wolumenowo.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-brand-steel rounded-card border border-brand-steel">
          {producers.map((item) => (
            <li key={item.producerId} className="flex flex-wrap items-center justify-between gap-x-brand-3 gap-y-brand-2 p-brand-3">
              <div className="flex min-w-0 flex-wrap items-center gap-brand-2">
                <span className="font-medium">{item.name}</span>
                <span className="text-data text-brand-technical-graphite">{item.countryCode}</span>
                {item.matched ? (
                  <LargeOrderTonePill tone="emerald" icon={CircleCheck}>
                    Widzi zapytanie
                  </LargeOrderTonePill>
                ) : (
                  <LargeOrderTonePill tone="zinc" icon={CircleDashed}>
                    Nie widzi
                  </LargeOrderTonePill>
                )}
                {item.override === "include" && (
                  <LargeOrderTonePill tone="teal" icon={Plus}>
                    Dodany wyjątkiem
                  </LargeOrderTonePill>
                )}
                {item.override === "exclude" && (
                  <LargeOrderTonePill tone="amber" icon={Ban}>
                    Wykluczony wyjątkiem
                  </LargeOrderTonePill>
                )}
              </div>
              <div className="flex gap-brand-3 text-data">
                {item.override ? (
                  <OverrideButton disabled={isPending} onClick={() => apply(item.producerId, "none")}>
                    Zdejmij wyjątek
                  </OverrideButton>
                ) : item.matched ? (
                  <OverrideButton disabled={isPending} onClick={() => apply(item.producerId, "exclude")}>
                    Wyklucz
                  </OverrideButton>
                ) : (
                  <OverrideButton disabled={isPending} onClick={() => apply(item.producerId, "include")}>
                    Dodaj wyjątkiem
                  </OverrideButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
    </section>
  );
}

function OverrideButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring rounded-data font-medium text-brand-passage-blue underline disabled:opacity-50"
    >
      {children}
    </button>
  );
}
