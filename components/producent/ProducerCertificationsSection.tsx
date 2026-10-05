"use client";

import { BadgeCheck, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Card, Heading, Input, Label, Stack, Text } from "@/components/ui";
import type { ProducerCertificationRow } from "@/lib/db/queries";
import {
  addProducerCertification,
  deleteProducerCertification,
  updateProducerCertification,
} from "@/lib/producer-certification-actions";

interface Draft {
  name: string;
  issuer: string;
}

const EMPTY_DRAFT: Draft = { name: "", issuer: "" };

// Spec 0065 AC-9: producent dodaje, edytuje i usuwa własne certyfikaty. Stanu
// potwierdzenia nie da się tu ustawić, pokazujemy go wyłącznie do odczytu.
export function ProducerCertificationsSection({ certifications }: { certifications: ProducerCertificationRow[] }) {
  const t = useTranslations("ProducerCertificationsSection");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function resetForm() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  function startEdit(row: ProducerCertificationRow) {
    setEditingId(row.id);
    setDraft({ name: row.name, issuer: row.issuer ?? "" });
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name: draft.name, issuer: draft.issuer };
    startTransition(async () => {
      const result = editingId
        ? await updateProducerCertification(editingId, input)
        : await addProducerCertification(input);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function remove(row: ProducerCertificationRow) {
    if (!window.confirm(t("confirmDelete", { name: row.name }))) return;
    startTransition(async () => {
      const result = await deleteProducerCertification(row.id);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      router.refresh();
    });
  }

  function renderForm(formKey: string, submitLabel: string) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-brand-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`cert-name-${formKey}`} required>
            {t("nameLabel")}
          </Label>
          <Input
            id={`cert-name-${formKey}`}
            value={draft.name}
            maxLength={200}
            required
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`cert-issuer-${formKey}`}>{t("issuerLabel")}</Label>
          <Input
            id={`cert-issuer-${formKey}`}
            value={draft.issuer}
            maxLength={200}
            onChange={(event) => setDraft({ ...draft, issuer: event.target.value })}
          />
        </div>
        <Stack direction="row" gap={2}>
          <Button type="submit" size="sm" disabled={isPending}>
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
            {t("cancel")}
          </Button>
        </Stack>
      </form>
    );
  }

  return (
    <Card padding="lg">
      <Stack gap={3}>
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>

        {certifications.length === 0 ? (
          <Text tone="muted">{t("empty")}</Text>
        ) : (
          <ul className="flex flex-col gap-brand-3">
            {certifications.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 border-t border-brand-steel pt-brand-2">
                <Text as="span" className="font-medium">
                  {row.name}
                  {row.issuer ? ` · ${row.issuer}` : null}
                </Text>
                {row.confirmed && row.confirmedAt ? (
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                    <Text as="span" tone="muted" className="text-data">
                      {t("confirmed", { date: dateFormatter.format(row.confirmedAt) })}
                    </Text>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <FileText className="size-4 shrink-0" aria-hidden="true" />
                    <Text as="span" tone="muted" className="text-data">
                      {t("declared")}
                    </Text>
                  </span>
                )}
                {editingId === row.id ? (
                  <>
                    <Text tone="muted" className="text-data">
                      {t("editHint")}
                    </Text>
                    {renderForm(row.id, t("save"))}
                  </>
                ) : (
                  <Stack direction="row" gap={2}>
                    <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => startEdit(row)}>
                      {t("edit")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => remove(row)}>
                      {t("remove")}
                    </Button>
                  </Stack>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-data text-status-blocked">
            {error}
          </p>
        )}

        {editingId === null && (
          <div className="flex flex-col gap-brand-2 border-t border-brand-steel pt-brand-3">
            <Text as="span" className="font-medium">
              {t("add")}
            </Text>
            {renderForm("new", t("add"))}
          </div>
        )}
      </Stack>
    </Card>
  );
}
