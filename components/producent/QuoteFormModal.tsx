"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { QuoteForm, type QuoteFormProps } from "./QuoteForm";

// Przycisk "Złóż ofertę" otwiera kreator oferty w oknie, zamiast wstawiać cały
// formularz w wąską kolumnę obok szczegółów zapytania (długi formularz rozciągał
// stronę i zostawiał pustą przestrzeń pod danymi zapytania). Po zapisie oferty
// zamknięcie okna odświeża stronę serwerową, żeby status oferty był aktualny.
// Spec 0077: `triggerLabel` i `compact` pozwalają użyć modala jako małego przycisku "Popraw" przy wariancie.
export function QuoteFormModal({
  triggerLabel,
  compact = false,
  ...props
}: QuoteFormProps & { triggerLabel?: string; compact?: boolean }) {
  const t = useTranslations("QuoteForm");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function close() {
    setOpen(false);
    if (submitted) {
      setSubmitted(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? undefined : "w-full"}
        variant={compact ? "secondary" : undefined}
        size={compact ? "sm" : undefined}
      >
        {triggerLabel ?? (props.isRevision ? t("openRevision") : t("open"))}
      </Button>
      <Dialog open={open} onClose={close} transition className="relative z-30">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-foundation-navy/60 transition duration-150 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-brand-2">
          <DialogPanel
            transition
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-card shadow-lg transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="focus-ring absolute right-brand-2 top-brand-2 z-10 rounded-data p-1 text-brand-technical-graphite hover:text-brand-foundation-navy"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <QuoteForm {...props} onSubmitted={() => setSubmitted(true)} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
