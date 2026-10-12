"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Input, Label, Stack } from "@/components/ui";
import { submitClientB2bDetails } from "@/lib/project-quote-actions";

interface ClientB2bDetailsFormProps {
  initialNip: string;
  initialCompanyName: string;
  status: "not_submitted" | "pending" | "approved" | "rejected";
}

// Sekcja danych firmy (spec 0070 część A, AC-6): NIP lub numer VAT UE i nazwa
// firmy. Zapis ustawia b2bVerificationStatus na pending (submitClientB2bDetails),
// również przy poprawce po odrzuceniu. Teksty w czterech językach (AC-26).
export function ClientB2bDetailsForm({ initialNip, initialCompanyName, status }: ClientB2bDetailsFormProps) {
  const t = useTranslations("ClientB2bDetailsForm");
  const router = useRouter();
  const [nip, setNip] = useState(initialNip);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await submitClientB2bDetails({ nip, companyName });
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate aria-labelledby="b2b-details-heading">
      <h2 id="b2b-details-heading" className="font-sans text-h3 font-semibold">
        {t("heading")}
      </h2>
      <p className="font-sans text-body text-brand-technical-graphite">{t("intro")}</p>
      <p className="font-sans text-body font-medium" role="status">
        {t(`status.${status}`)}
      </p>
      <Stack gap={1}>
        <Label htmlFor="b2b-company" required surface="v5">
          {t("companyLabel")}
        </Label>
        <Input
          id="b2b-company"
          name="companyName"
          type="text"
          autoComplete="organization"
          required
          surface="v5"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
        />
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="b2b-nip" required surface="v5">
          {t("nipLabel")}
        </Label>
        <Input
          id="b2b-nip"
          name="nip"
          type="text"
          required
          surface="v5"
          value={nip}
          onChange={(event) => setNip(event.target.value)}
        />
        <p className="font-sans text-body text-brand-technical-graphite">{t("nipHelp")}</p>
      </Stack>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="font-sans text-body text-status-approved" role="status">
          {t("saved")}
        </p>
      )}
      <div>
        <Button type="submit" surface="v5" disabled={isPending}>
          {isPending ? t("saving") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
