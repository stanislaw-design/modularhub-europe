import Link from "next/link";
import { ProjectVariantSelect } from "./ProjectVariantSelect";
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
// nawigację Next.js, ten sam wzorzec co SubcategoryFilterBar. Renderuje
// dokładnie tyle zakładek, ile projekt ma prawdziwych wariantów, nigdy
// syntetyczny placeholder za standard bez wiersza w bazie (spec 0054 AC-1,
// AC-2). Gdy jest dokładnie jeden wariant, ta jedna zakładka nadal się
// renderuje jako widoczna, niekliklana "bieżąca" pozycja, dla spójności
// układu z projektami mającymi dwa albo trzy warianty (spec 0054 AC-3).
export function ProjectVariantPicker({
  variants,
  selectedVariantId,
  hrefFor,
  standardLabel,
  ariaLabel,
}: ProjectVariantPickerProps) {
  if (variants.length === 0) return null;

  const singleVariant = variants.length === 1;
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const selectOptions = variants.map((variant) => ({
    value: variant.completionStandard,
    label: variant.variantLabel ?? standardLabel[variant.completionStandard],
    href: singleVariant ? "" : hrefFor(variant.completionStandard),
    disabled: singleVariant,
  }));

  return (
    <>
      {/* Mobile: rozwijana lista zamiast rzędu pigułek — ten sam rząd przy
          dłuższych etykietach standardu wychodził poza szerokość ekranu. */}
      <div className="lg:hidden">
        <ProjectVariantSelect
          options={selectOptions}
          selectedValue={selectedVariant?.completionStandard ?? selectOptions[0].value}
          ariaLabel={ariaLabel}
        />
      </div>

      <nav aria-label={ariaLabel} className="hidden flex-nowrap items-center gap-brand-1 lg:flex">
        {variants.map((variant) => {
          const active = variant.id === selectedVariantId;
          const label = variant.variantLabel ?? standardLabel[variant.completionStandard];

          if (singleVariant) {
            return (
              <span
                key={variant.id}
                aria-current="true"
                className="flex-1 cursor-default whitespace-nowrap rounded-full border border-brand-v5-amber-strong bg-brand-v5-amber/10 px-brand-2 py-1 text-center text-data font-medium text-brand-v5-ink"
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
    </>
  );
}
