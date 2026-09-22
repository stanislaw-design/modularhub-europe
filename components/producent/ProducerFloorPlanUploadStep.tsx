"use client";

import Image from "next/image";
import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Label, Select, Text } from "@/components/ui";
import { deleteFloorPlan, uploadFloorPlan } from "@/lib/product-photo-actions";

export interface ProducerFloorPlan {
  id: string;
  url: string;
  filename: string;
  variantId: string | null;
}

export interface ProducerFloorPlanVariantOption {
  id: string;
  label: string;
}

interface ProducerFloorPlanUploadStepProps {
  productId: string;
  floorPlans: ProducerFloorPlan[];
  showValidation: boolean;
  // Puste dla nowo tworzonego projektu (spec 0045 Build plan zadanie 8): krok
  // "pliki" trafia przed krokiem "warianty" w dzisiejszej kolejności, więc
  // przy nowym produkcie nie ma jeszcze żadnego wariantu do wybrania —
  // wgrywane rzuty domyślnie "dotyczą wszystkich wariantów" (AC-7).
  // ProductEditWizard (produkt już istniejący) podaje realną listę.
  variants: ProducerFloorPlanVariantOption[];
  onFloorPlansChange: (floorPlans: ProducerFloorPlan[]) => void;
}

// AC-7: prawdziwe wgrywanie rzutów architektonicznych, ten sam mechanizm
// wgrywania na wybór co ProducerProductPhotosStep, rozszerzony o wybór
// wariantu, do którego dany rzut się odnosi (domyślnie: wszystkie warianty).
export function ProducerFloorPlanUploadStep({
  productId,
  floorPlans,
  showValidation,
  variants,
  onFloorPlansChange,
}: ProducerFloorPlanUploadStepProps) {
  const t = useTranslations("ProducerFloorPlanUploadStep");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // "" reprezentuje "wszystkie warianty" (Select<T extends string> nie
  // przyjmuje null jako wartość opcji), zamieniane na null przy wywołaniu akcji.
  const [nextVariantId, setNextVariantId] = useState<string>("");
  const invalid = showValidation && floorPlans.length === 0;

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    event.target.value = "";
    setError(null);
    const variantId = nextVariantId || null;
    startTransition(async () => {
      let next = floorPlans;
      for (const file of selected) {
        const result = await uploadFloorPlan(productId, file, variantId);
        if (!result.ok || !result.documentId || !result.url) {
          setError(result.error ?? t("uploadError"));
          onFloorPlansChange(next);
          return;
        }
        next = [...next, { id: result.documentId, url: result.url, filename: file.name, variantId }];
      }
      onFloorPlansChange(next);
    });
  }

  function handleDelete(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteFloorPlan(documentId);
      if (!result.ok) {
        setError(result.error ?? t("deleteError"));
        return;
      }
      onFloorPlansChange(floorPlans.filter((plan) => plan.id !== documentId));
    });
  }

  function variantLabel(variantId: string | null): string {
    if (variantId === null) return t("allVariants");
    return variants.find((variant) => variant.id === variantId)?.label ?? t("allVariants");
  }

  // Rzuty akceptują teraz obraz albo PDF (spec 0050 AC-3): rozpoznanie po
  // rozszerzeniu wystarcza tylko do wyboru miniatury kontra ikona pliku w tej
  // liście, prawdziwa walidacja typu jest po sygnaturze bajtowej na serwerze
  // (validateFloorPlanFile, lib/product-photo-actions.ts).
  function isPdfFilename(filename: string): boolean {
    return filename.toLowerCase().endsWith(".pdf");
  }

  return (
    <div className="flex flex-col gap-brand-2">
      <Label htmlFor="wizard-floor-plans" required>
        {t("label")}
      </Label>
      {variants.length > 0 && (
        <div className="flex max-w-64 flex-col gap-1">
          <Label id="wizard-floor-plan-variant-label">{t("variantLabel")}</Label>
          <Select
            value={nextVariantId}
            onChange={setNextVariantId}
            options={[{ value: "", label: t("allVariants") }, ...variants.map((variant) => ({ value: variant.id, label: variant.label }))]}
            aria-labelledby="wizard-floor-plan-variant-label"
          />
        </div>
      )}
      <div className="flex items-center gap-brand-2">
        <input
          ref={inputRef}
          id="wizard-floor-plans"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleUpload}
          className="sr-only"
          disabled={isPending}
        />
        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {t("chooseFiles")}
        </Button>
        <Text as="span" variant="label" tone="muted">
          {t("hint")}
        </Text>
      </div>

      {error && (
        <p role="alert" className="rounded-data bg-status-blocked/10 px-brand-2 py-1 text-body text-status-blocked">
          {error}
        </p>
      )}
      {invalid && <p className="font-sans text-body text-status-blocked">{t("requiredError")}</p>}

      {floorPlans.length === 0 ? (
        <Text tone="muted">{t("noFloorPlans")}</Text>
      ) : (
        <ul className="flex flex-col gap-brand-2">
          {floorPlans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center gap-brand-2 rounded-data border border-brand-steel px-brand-2 py-brand-1"
            >
              {isPdfFilename(plan.filename) ? (
                <FileText className="size-16 shrink-0 rounded-data p-2 text-brand-technical-graphite" aria-hidden="true" />
              ) : (
                <Image
                  src={plan.url}
                  alt={plan.filename}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-data object-cover"
                  unoptimized
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <Text as="span" className="truncate">
                  {plan.filename}
                </Text>
                <Text as="span" variant="label" tone="muted">
                  {variantLabel(plan.variantId)}
                </Text>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(plan.id)}
                disabled={isPending}
                aria-label={t("removeFloorPlan", { name: plan.filename })}
                className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
