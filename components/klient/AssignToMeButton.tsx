"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { assignAdvisorToSelf } from "@/lib/case-actions";

// Ekran wewnętrzny doradcy jest po polsku (jak reszta /internal/*), więc
// etykiety są tu wprost, nie w katalogu tłumaczeń.
export function AssignToMeButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await assignAdvisorToSelf(inquiryId);
          router.refresh();
        })
      }
    >
      {isPending ? "Przypisywanie…" : "Przypisz do mnie"}
    </Button>
  );
}
