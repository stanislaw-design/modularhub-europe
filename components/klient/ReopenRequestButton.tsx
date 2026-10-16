"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { reopenRequest } from "@/lib/project-request-actions";

interface ReopenRequestButtonProps {
  id: string;
  kind: "request" | "product";
}

// Spec 0070 AC-19: klient wznawia zamknięte zapytanie przez 30 dni od zamknięcia. Wznowienie
// ustawia nowy termin plus 14 dni i podlega limitowi trzech aktywnych zapytań (AC-38):
// przy limicie akcja zwraca errorCode "email_limit" i klient dostaje wskazówkę, co zamknąć.
export function ReopenRequestButton({ id, kind }: ReopenRequestButtonProps) {
  const t = useTranslations("ReopenRequestButton");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReopen() {
    setError(null);
    startTransition(async () => {
      const result = await reopenRequest(id, kind);
      if (!result.ok) {
        setError(
          result.errorCode === "email_limit"
            ? t("emailLimit")
            : result.errorCode === "not_reopenable"
              ? t("notReopenable")
              : result.errorCode === "not_found"
                ? t("notFound")
                : t("genericError"),
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-brand-1">
      <Button type="button" variant="secondary" surface="v5" size="sm" onClick={handleReopen} disabled={isPending}>
        {isPending ? t("reopening") : t("trigger")}
      </Button>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
