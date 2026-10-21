"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Card, Heading, Input, Label, Select, Stack } from "@/components/ui";
import { updateProducerCompany } from "@/lib/producer-company-actions";
import { PRODUCER_TECHNOLOGIES, type ProducerTechnology } from "@/lib/producer-technologies";

interface ProducerCompanyFormProps {
  initialName: string;
  initialTechnology: ProducerTechnology | null;
}

// Formularz nazwy i technologii firmy w Ustawieniach (spec 0074 AC-11). Walidacja jest
// po stronie serwera (updateProducerCompany); maxLength i required tylko ułatwiają wpisywanie.
export function ProducerCompanyForm({ initialName, initialTechnology }: ProducerCompanyFormProps) {
  const t = useTranslations("ProducerSettingsPage");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [technology, setTechnology] = useState<ProducerTechnology | null>(initialTechnology);
  const [nameError, setNameError] = useState<string | null>(null);
  const [technologyError, setTechnologyError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setTechnologyError(null);
    setFormError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProducerCompany({ name, technology });
      if (result.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      setNameError(result.fieldErrors?.name ?? null);
      setTechnologyError(result.fieldErrors?.technology ?? null);
      if (!result.fieldErrors) setFormError(result.error ?? t("saveError"));
    });
  }

  return (
    <Card padding="lg">
      <form onSubmit={submit} className="flex flex-col gap-brand-3" noValidate>
        <Heading level="h2">{t("editHeading")}</Heading>
        <div className="flex flex-col gap-1">
          <Label htmlFor="company-name" required>
            {t("companyNameLabel")}
          </Label>
          <Input
            id="company-name"
            value={name}
            maxLength={120}
            invalid={nameError !== null}
            aria-describedby={nameError ? "company-name-error" : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          {nameError && (
            <p id="company-name-error" role="alert" className="text-data text-status-blocked">
              {nameError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span id="company-technology-label" className="text-label text-brand-technical-graphite">
            {t("technologyLabel")}
          </span>
          <Select
            aria-labelledby="company-technology-label"
            value={technology}
            onChange={setTechnology}
            placeholder={t("technologyPlaceholder")}
            invalid={technologyError !== null}
            options={PRODUCER_TECHNOLOGIES.map((option) => ({ value: option.value, label: option.label }))}
          />
          {technologyError && (
            <p role="alert" className="text-data text-status-blocked">
              {technologyError}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="text-data text-status-blocked">
            {formError}
          </p>
        )}
        <Stack direction="row" gap={3} align="center">
          <Button type="submit" size="md" disabled={isPending}>
            {t("save")}
          </Button>
          {saved && (
            <p role="status" className="text-data text-status-approved">
              {t("saved")}
            </p>
          )}
        </Stack>
      </form>
    </Card>
  );
}
