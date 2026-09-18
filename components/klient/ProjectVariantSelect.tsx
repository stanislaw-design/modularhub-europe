"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export interface ProjectVariantSelectOption {
  value: string;
  label: string;
  href: string;
  disabled: boolean;
}

interface ProjectVariantSelectProps {
  options: ProjectVariantSelectOption[];
  selectedValue: string;
  ariaLabel: string;
}

// Mobile odpowiednik rzędu pigułek w ProjectVariantPicker (lg+): ten sam
// zestaw wariantów i ta sama nawigacja przez ?wariant=... (żadnego stanu
// klienckiego poza samym otwarciem listy), tylko jako rozwijana lista zamiast
// rzędu, który przy dłuższych etykietach standardu wychodził poza ekran.
export function ProjectVariantSelect({ options, selectedValue, ariaLabel }: ProjectVariantSelectProps) {
  const router = useRouter();
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];

  function handleChange(value: string) {
    const next = options.find((option) => option.value === value);
    if (!next || next.disabled) return;
    router.push(next.href);
  }

  return (
    <Listbox value={selected?.value ?? ""} onChange={handleChange}>
      <div className="relative">
        <ListboxButton
          aria-label={ariaLabel}
          className="focus-ring flex h-11 w-full items-center justify-between gap-brand-2 rounded-data border border-brand-v5-line bg-brand-v5-surface px-brand-3 text-body font-medium text-brand-v5-ink data-[open]:border-brand-v5-amber-strong"
        >
          <span>{selected?.label}</span>
          <ChevronDown className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
        </ListboxButton>
        <ListboxOptions
          transition
          className="absolute z-10 mt-1 w-full overflow-auto rounded-data border border-brand-v5-line bg-brand-v5-surface py-1 shadow-md transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="flex cursor-default items-center justify-between gap-brand-2 px-brand-3 py-brand-2 text-body text-brand-v5-ink data-[disabled]:cursor-not-allowed data-[disabled]:text-brand-v5-muted/60 data-[focus]:bg-brand-v5-amber/10"
            >
              {({ selected: isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && <Check className="size-4 shrink-0 text-brand-v5-amber-strong" aria-hidden="true" />}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
