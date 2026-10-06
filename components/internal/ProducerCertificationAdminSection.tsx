"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminProducerCertificationRow } from "@/lib/db/queries";
import { setProducerCertificationConfirmation } from "@/lib/producer-certification-admin-actions";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Spec 0065 AC-10, AC-11: potwierdzenie albo cofnięcie wysyła wersję, którą
// administrator widział, więc zmiana wpisu od odczytu daje błąd zamiast cichego nadpisania.
export function ProducerCertificationAdminSection({ certifications }: { certifications: AdminProducerCertificationRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(row: AdminProducerCertificationRow, status: "self_reported" | "platform_confirmed") {
    setError(null);
    startTransition(async () => {
      const result = await setProducerCertificationConfirmation(row.id, status, row.version);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zmienić potwierdzenia.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="producer-certifications-heading" className="flex flex-col gap-brand-3">
      <h2 id="producer-certifications-heading" className="text-h3 font-semibold">
        Certyfikaty firmy
      </h2>
      {certifications.length === 0 ? (
        <p className="text-body text-brand-technical-graphite">Producent nie dodał jeszcze certyfikatów.</p>
      ) : (
        <ul className="flex flex-col gap-brand-2">
          {certifications.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-brand-2 border-b border-brand-steel/50 pb-brand-2">
              <div className="flex flex-col">
                <span className="font-medium">
                  {row.name}
                  {row.issuer ? ` · ${row.issuer}` : null}
                </span>
                <span className="text-body text-brand-technical-graphite">
                  {row.confirmed && row.confirmedAt
                    ? `Potwierdzone przez platformę, ${dateFormatter.format(row.confirmedAt)}`
                    : "Deklaracja producenta, niepotwierdzona"}
                </span>
              </div>
              {row.confirmed ? (
                <button
                  type="button"
                  onClick={() => setStatus(row, "self_reported")}
                  disabled={isPending}
                  className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50"
                >
                  Cofnij potwierdzenie
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus(row, "platform_confirmed")}
                  disabled={isPending}
                  className="focus-ring h-10 rounded-data bg-brand-passage-blue px-brand-3 text-body font-medium text-white disabled:opacity-50"
                >
                  Potwierdź certyfikat
                </button>
              )}
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
