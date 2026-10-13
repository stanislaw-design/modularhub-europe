"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import { cancelRequest } from "@/lib/project-request-actions";

interface CancelRequestButtonProps {
  id: string;
  kind: "request" | "product";
}

// Spec 0070 AC-37: klient zamyka własne zapytanie. Okno potwierdzenia z opisem skutków,
// bez pola powodu (powód jest stały, client_cancelled). Po sukcesie odświeża listę.
export function CancelRequestButton({ id, kind }: CancelRequestButtonProps) {
  const t = useTranslations("CancelRequestDialog");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelRequest(id, kind);
      if (!result.ok) {
        setError(result.errorCode === "not_cancellable" ? t("notCancellable") : result.errorCode === "not_found" ? t("notFound") : t("genericError"));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        surface="v5"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t("trigger")}
      </Button>
      <Dialog open={open} onClose={() => !isPending && setOpen(false)} transition className="relative z-20">
        <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition duration-150 ease-out data-[closed]:opacity-0" />
        <div className="fixed inset-0 flex items-center justify-center p-brand-3">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4 shadow-lg transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <DialogTitle as="h2" className="font-sans text-lg font-semibold text-brand-v5-ink">
              {t("title")}
            </DialogTitle>
            <Text surface="v5" tone="muted" className="mt-brand-2">
              {t("description")}
            </Text>
            {error && (
              <p className="mt-brand-2 font-sans text-body text-status-blocked" role="alert">
                {error}
              </p>
            )}
            <div className="mt-brand-4 flex flex-wrap justify-end gap-brand-2">
              <Button type="button" variant="secondary" surface="v5" onClick={() => setOpen(false)} disabled={isPending}>
                {t("keep")}
              </Button>
              <Button type="button" surface="v5" onClick={handleConfirm} disabled={isPending}>
                {isPending ? t("closing") : t("confirm")}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
