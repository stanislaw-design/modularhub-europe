import Link from "next/link";
import type { CompletionStandard, ProjectVariant } from "@/lib/data/types";

interface ProjectVariantPickerProps {
  variants: ProjectVariant[];
  selectedVariantId: string;
  hrefFor: (completionStandard: CompletionStandard) => string;
  standardLabel: Record<CompletionStandard, string>;
  ariaLabel: string;
}

// Serwerowy przełącznik wariantów (spec 0042 AC-1): rząd linków
// `?wariant=...`, żadnego stanu klienckiego — wybór idzie przez zwykłą
// nawigację Next.js, ten sam wzorzec co SubcategoryFilterBar. Zawsze
// pokazuje wszystkie trzy standardy wykończenia (enum zamknięty, spec 0042
// AC-7 komentarz) — standard bez jeszcze wypełnionego `product_variant`
// renderuje się jako wyłączona (disabled) zakładka (isPlaceholder), zamiast
// klikalnego linku, żeby klient widział cały układ, ale nie mógł przełączyć
// się na standard, dla którego producent jeszcze nie podał ceny.
export function ProjectVariantPicker({
  variants,
  selectedVariantId,
  hrefFor,
  standardLabel,
  ariaLabel,
}: ProjectVariantPickerProps) {
  if (variants.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className="flex flex-nowrap items-center gap-brand-1">
      {variants.map((variant) => {
        const active = variant.id === selectedVariantId;
        const label = variant.variantLabel ?? standardLabel[variant.completionStandard];

        if (variant.isPlaceholder) {
          return (
            <span
              key={variant.id}
              aria-disabled="true"
              className="flex-1 cursor-not-allowed whitespace-nowrap rounded-full border border-dashed border-brand-v5-line px-brand-2 py-1 text-center text-data font-medium text-brand-v5-muted/60"
            >
              {label}
            </span>
          );
        }

        return (
          <Link
            key={variant.id}
            href={hrefFor(variant.completionStandard)}
            aria-current={active ? "true" : undefined}
            className={`focus-ring flex-1 whitespace-nowrap rounded-full border px-brand-2 py-1 text-center text-data font-medium transition-colors ${
              active
                ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
                : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
