"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Button, Heading, Stack, Text } from "@/components/ui";

interface DeleteProductDialogProps {
  productName: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Pierwszy modal potwierdzenia w projekcie (spec 0016): Headless UI Dialog, ten sam
// pakiet i wzorzec data-[closed] co Select.tsx/Accordion.tsx, focus trap i zamknięcie
// na Esc gotowe bez dodatkowego kodu.
export function DeleteProductDialog({ productName, open, onCancel, onConfirm }: DeleteProductDialogProps) {
  const t = useTranslations("DeleteProductDialog");
  return (
    <Dialog open={open} onClose={onCancel} transition className="relative z-20">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-brand-foundation-navy/40 transition duration-150 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-brand-2">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-card border border-brand-steel bg-brand-warm-white p-brand-4 shadow-lg transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <DialogTitle as="div">
            <Heading level="h3">{t("heading")}</Heading>
          </DialogTitle>
          <Stack gap={4} className="mt-brand-3">
            <Text tone="muted">{t("body", { name: productName })}</Text>
            <Stack direction="row" gap={2} className="justify-end">
              <Button type="button" variant="secondary" onClick={onCancel}>
                {t("cancel")}
              </Button>
              <Button type="button" variant="primary" onClick={onConfirm}>
                {t("confirm")}
              </Button>
            </Stack>
          </Stack>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
