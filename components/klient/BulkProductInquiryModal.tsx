"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, CountryCode } from "@/lib/data/types";
import { submitBulkProductInquiry } from "@/lib/project-request-actions";
import { InquiryAttachmentsAfterSubmit } from "@/components/inquiry-attachments/InquiryAttachmentsAfterSubmit";
import { BulkRequestLimitMessage } from "./BulkRequestLimitMessage";

interface BulkProductInquiryModalProps {
  productId: string;
  countries: Country[];
  // Dane zalogowanego klienta, żeby nie wpisywał ich drugi raz.
  prefill?: { name: string; email: string; phone: string };
}

// AC-15/AC-16: pierwsza, uproszczona wersja "zapytaj o model", nie prawdziwy
// konfigurator (spec 0038 Follow-up) — woła wprost już przetestowaną
// submitBulkProductInquiry (spec 0037), ten sam wzorzec useTransition/isPending
// i błędu limitu co ProjectRequestFlow, bez opuszczania /project/[id].
export function BulkProductInquiryModal({ productId, countries, prefill }: BulkProductInquiryModalProps) {
  const t = useTranslations("BulkProductInquiryModal");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [contactName, setContactName] = useState(prefill?.name ?? "");
  const [contactEmail, setContactEmail] = useState(prefill?.email ?? "");
  const [contactPhone, setContactPhone] = useState(prefill?.phone ?? "");
  const [unitCount, setUnitCount] = useState("");
  const [deliveryCountryCode, setDeliveryCountryCode] = useState<CountryCode | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  // Spec 0070 AC-29: po zapisie zapytania pokazujemy krok plików; token żyje tylko tu.
  const [created, setCreated] = useState<{ id: string; uploadToken?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const unitCountValue = Number(unitCount);
  const unitCountValid = unitCount.trim().length > 0 && Number.isInteger(unitCountValue) && unitCountValue >= 3;
  const canSubmit =
    contactName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    unitCountValid &&
    deliveryCountryCode !== null &&
    !isPending;

  function openModal() {
    setError(null);
    setPhase("form");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || deliveryCountryCode === null) return;
    setError(null);

    startTransition(async () => {
      const result = await submitBulkProductInquiry({
        productId,
        locale,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() ? contactPhone.trim() : undefined,
        unitCount: unitCountValue,
        deliveryCountryCode,
        note: note.trim() ? note.trim() : undefined,
      });
      if (!result.ok) {
        setLimitReached(result.errorCode === "email_limit");
        setError(result.error ?? t("genericSendError"));
        return;
      }
      setCreated(result.id ? { id: result.id, uploadToken: result.uploadToken } : null);
      setPhase("sent");
    });
  }

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <>
      <Button type="button" variant="secondary" surface="v5" onClick={openModal}>
        {t("triggerLabel")}
      </Button>
      <Dialog open={open} onClose={() => !isPending && setOpen(false)} transition className="relative z-20">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-night/60 transition duration-150 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-brand-2">
          <DialogPanel
            transition
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4 shadow-lg transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 sm:p-brand-5"
          >
            {phase === "sent" ? (
              <Stack gap={4}>
                <DialogTitle
                  as="h2"
                  className="font-display text-h3 font-semibold text-brand-v5-ink outline-none"
                >
                  {t("sentHeading")}
                </DialogTitle>
                <Text tone="muted" surface="v5">
                  {t("sentBody")}
                </Text>
                {created && <InquiryAttachmentsAfterSubmit kind="product" inquiryId={created.id} uploadToken={created.uploadToken} />}
                <Button type="button" surface="v5" onClick={() => setOpen(false)} className="w-fit">
                  {t("close")}
                </Button>
              </Stack>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-brand-4">
                <DialogTitle
                  as="h2"
                  className="font-display text-h3 font-semibold text-brand-v5-ink outline-none"
                >
                  {t("heading")}
                </DialogTitle>
                <Stack gap={1}>
                  <Label htmlFor="bulk-inquiry-name" required surface="v5">
                    {t("nameLabel")}
                  </Label>
                  <Input
                    id="bulk-inquiry-name"
                    autoComplete="name"
                    required
                    surface="v5"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="bulk-inquiry-email" required surface="v5">
                    E-mail
                  </Label>
                  <Input
                    id="bulk-inquiry-email"
                    type="email"
                    autoComplete="email"
                    required
                    surface="v5"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="bulk-inquiry-phone" surface="v5">
                    {t("phoneLabel")}
                  </Label>
                  <Input
                    id="bulk-inquiry-phone"
                    type="tel"
                    autoComplete="tel"
                    surface="v5"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="bulk-inquiry-unit-count" required surface="v5">
                    {t("unitCountLabel")}
                  </Label>
                  <Input
                    id="bulk-inquiry-unit-count"
                    type="number"
                    min={3}
                    step={1}
                    required
                    surface="v5"
                    value={unitCount}
                    onChange={(event) => setUnitCount(event.target.value)}
                  />
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("unitCountHint")}
                  </Text>
                  {unitCount.trim().length > 0 && !unitCountValid && (
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("unitCountSmallHint")}{" "}
                      <Link href={`/${locale}/results`} className="underline">
                        {t("unitCountSmallHintLink")}
                      </Link>
                    </Text>
                  )}
                </Stack>
                <Stack gap={1}>
                  <Label id="bulk-inquiry-country-label" required surface="v5">
                    {t("deliveryCountryLabel")}
                  </Label>
                  <Select
                    value={deliveryCountryCode}
                    onChange={setDeliveryCountryCode}
                    options={countryOptions}
                    aria-labelledby="bulk-inquiry-country-label"
                    surface="v5"
                  />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="bulk-inquiry-note" surface="v5">
                    {t("noteLabel")}
                  </Label>
                  <Textarea
                    id="bulk-inquiry-note"
                    surface="v5"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Stack>
                {error && limitReached ? (
                  <BulkRequestLimitMessage locale={locale} contactEmail={contactEmail} />
                ) : (
                  error && (
                    <p className="font-sans text-body text-status-blocked" role="alert">
                      {error}
                    </p>
                  )
                )}
                <div className="flex justify-end gap-brand-2 border-t border-brand-v5-line pt-brand-3">
                  <Button
                    type="button"
                    variant="secondary"
                    surface="v5"
                    disabled={isPending}
                    onClick={() => setOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" surface="v5" disabled={!canSubmit}>
                    {isPending ? t("sendingLabel") : t("sendLabel")}
                  </Button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
