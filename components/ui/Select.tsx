"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { tv } from "tailwind-variants";

const button = tv({
  base: "focus-ring flex h-11 w-full items-center justify-between gap-brand-1 rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy disabled:cursor-not-allowed disabled:opacity-50 data-[open]:border-brand-passage-blue",
  variants: {
    invalid: {
      true: "border-status-blocked",
    },
  },
});

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Wybierz…",
  invalid,
  disabled,
  name,
  ...aria
}: SelectProps<T>) {
  const selected = options.find((option) => option.value === value) ?? null;

  // `value as T`: Headless UI infers TType as T from `onChange`/`ListboxOption`, but the real
  // value is T | null before a selection is made. Passing it through (rather than the previous
  // `value ?? undefined`) keeps the Listbox controlled from the first render — coercing to
  // undefined when unselected made it flip from uncontrolled to controlled on the first pick,
  // which React flags as a bug.
  return (
    <Listbox value={value as T} onChange={onChange} disabled={disabled} name={name}>
      <div className="relative">
        <ListboxButton className={button({ invalid })} aria-invalid={invalid || undefined} {...aria}>
          <span className={selected ? "" : "text-brand-technical-graphite/60"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
        </ListboxButton>
        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-data border border-brand-steel bg-brand-warm-white py-1 shadow-md focus:outline-none data-[closed]:opacity-0 data-[closed]:scale-95 transition duration-100 ease-out"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="flex cursor-default items-center justify-between gap-brand-1 px-brand-2 py-brand-1 text-body text-brand-foundation-navy data-[focus]:bg-brand-passage-blue/10"
            >
              {({ selected: isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && (
                    <Check className="size-4 shrink-0 text-brand-passage-blue" aria-hidden="true" />
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
