"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminProducerProductRow } from "@/lib/db/queries";
import {
  createProductComplianceAssessment,
  deleteProductComplianceAssessment,
  setProductComplianceAssessmentConfirmation,
  updateProductComplianceAssessment,
} from "@/lib/producer-certification-admin-actions";

type Status = "approved" | "conditional" | "blocked";

const statusLabel: Record<Status, string> = {
  approved: "Zgodny z przepisami",
  conditional: "Wymaga dodatkowych dokumentów",
  blocked: "Niedostępny w tym kraju",
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

interface Draft {
  status: Status;
  reason: string;
}

const EMPTY_DRAFT: Draft = { status: "approved", reason: "" };

// Spec 0065 AC-10: administrator dodaje, zmienia i usuwa ocenę produktu
// (kraj, przepis, status, powód) i potwierdza ją albo cofa potwierdzenie.
// Kraj i przepis wpisu są stałe, więc zmiana oznacza usunięcie i dodanie.
export function ProductComplianceAdminSection({ product }: { product: AdminProducerProductRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [newCountry, setNewCountry] = useState<"PL" | "DE" | "NL">("NL");
  const [newRule, setNewRule] = useState("bbl");
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Nie udało się zapisać zmian.");
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  function startEdit(assessment: AdminProducerProductRow["assessments"][number]) {
    setEditingId(assessment.id);
    setDraft({ status: assessment.status, reason: assessment.reason });
    setError(null);
  }

  return (
    <section aria-labelledby={`product-compliance-${product.id}`} className="flex flex-col gap-brand-3 rounded-data border border-brand-steel p-brand-3">
      <h3 id={`product-compliance-${product.id}`} className="text-body-l font-semibold">
        {product.name ?? "Produkt bez nazwy"}
        <span className="ml-brand-2 text-body font-normal text-brand-technical-graphite">
          {product.status === "published" ? "opublikowany" : product.status}
        </span>
      </h3>

      {product.assessments.length === 0 ? (
        <p className="text-body text-brand-technical-graphite">Brak ocen zgodności dla tego produktu.</p>
      ) : (
        <ul className="flex flex-col gap-brand-3">
          {product.assessments.map((assessment) => (
            <li key={assessment.id} className="flex flex-col gap-1 border-b border-brand-steel/50 pb-brand-2">
              <span className="font-medium">
                {assessment.countryCode} · {assessment.rule.toUpperCase()} · {statusLabel[assessment.status]}
              </span>
              <span className="text-body text-brand-technical-graphite">{assessment.reason}</span>
              <span className="text-body text-brand-technical-graphite">
                {assessment.confirmed && assessment.confirmedAt
                  ? `Potwierdzone przez platformę, ${dateFormatter.format(assessment.confirmedAt)}`
                  : "Niepotwierdzone przez platformę"}
              </span>

              {editingId === assessment.id ? (
                <form
                  className="flex flex-col gap-brand-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () => updateProductComplianceAssessment(assessment.id, { status: draft.status, reason: draft.reason }, assessment.version),
                      () => setEditingId(null),
                    );
                  }}
                >
                  <StatusSelect id={`edit-status-${assessment.id}`} value={draft.status} onChange={(status) => setDraft({ ...draft, status })} />
                  <ReasonField id={`edit-reason-${assessment.id}`} value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
                  <div className="flex gap-brand-2">
                    <button type="submit" disabled={isPending} className="focus-ring h-10 rounded-data bg-brand-passage-blue px-brand-3 text-body font-medium text-white disabled:opacity-50">
                      Zapisz ocenę
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="focus-ring rounded-data px-brand-2 text-brand-passage-blue underline">
                      Anuluj
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-brand-3">
                  {assessment.confirmed ? (
                    <button type="button" disabled={isPending} onClick={() => run(() => setProductComplianceAssessmentConfirmation(assessment.id, "self_reported", assessment.version))} className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50">
                      Cofnij potwierdzenie
                    </button>
                  ) : (
                    <button type="button" disabled={isPending} onClick={() => run(() => setProductComplianceAssessmentConfirmation(assessment.id, "platform_confirmed", assessment.version))} className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50">
                      Potwierdź ocenę
                    </button>
                  )}
                  <button type="button" disabled={isPending} onClick={() => startEdit(assessment)} className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50">
                    Edytuj
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm(`Usunąć ocenę ${assessment.countryCode} · ${assessment.rule.toUpperCase()}?`)) return;
                      run(() => deleteProductComplianceAssessment(assessment.id, assessment.version));
                    }}
                    className="focus-ring rounded-data text-brand-passage-blue underline disabled:opacity-50"
                  >
                    Usuń
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => createProductComplianceAssessment(product.id, { countryCode: newCountry, rule: newRule, status: newDraft.status, reason: newDraft.reason }),
            () => setNewDraft(EMPTY_DRAFT),
          );
        }}
      >
        <span className="font-medium">Dodaj ocenę</span>
        <div className="flex flex-wrap gap-brand-2">
          <label className="flex flex-col gap-1 text-body">
            Kraj
            <select value={newCountry} onChange={(event) => setNewCountry(event.target.value as "PL" | "DE" | "NL")} className="focus-ring h-10 rounded-data border border-brand-steel px-brand-2">
              <option value="PL">Polska</option>
              <option value="DE">Niemcy</option>
              <option value="NL">Holandia</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-body">
            Przepis
            <input value={newRule} maxLength={50} onChange={(event) => setNewRule(event.target.value)} className="focus-ring h-10 rounded-data border border-brand-steel px-brand-2" />
          </label>
        </div>
        <StatusSelect id={`new-status-${product.id}`} value={newDraft.status} onChange={(status) => setNewDraft({ ...newDraft, status })} />
        <ReasonField id={`new-reason-${product.id}`} value={newDraft.reason} onChange={(reason) => setNewDraft({ ...newDraft, reason })} />
        <button type="submit" disabled={isPending} className="focus-ring h-10 w-fit rounded-data bg-brand-passage-blue px-brand-3 text-body font-medium text-white disabled:opacity-50">
          Dodaj ocenę
        </button>
      </form>

      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
    </section>
  );
}

function StatusSelect({ id, value, onChange }: { id: string; value: Status; onChange: (status: Status) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-body">
      Status
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as Status)} className="focus-ring h-10 rounded-data border border-brand-steel px-brand-2">
        <option value="approved">{statusLabel.approved}</option>
        <option value="conditional">{statusLabel.conditional}</option>
        <option value="blocked">{statusLabel.blocked}</option>
      </select>
    </label>
  );
}

function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (reason: string) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-body">
      Powód
      <textarea id={id} value={value} maxLength={500} rows={2} required onChange={(event) => onChange(event.target.value)} className="focus-ring rounded-data border border-brand-steel p-brand-2" />
    </label>
  );
}
