"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { tv } from "@/lib/tv";

const button = tv({
  base: "focus-ring flex h-11 w-full items-center justify-between gap-brand-1 rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy disabled:cursor-not-allowed disabled:opacity-50 data-[open]:border-brand-passage-blue",
  variants: {
    invalid: {
      true: "border-status-blocked",
    },
    surface: {
      v3: "",
      v5: "border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink data-[open]:border-brand-v5-amber-strong",
    },
  },
  compoundVariants: [
    {
      invalid: true,
      surface: "v5",
      class: "border-status-blocked",
    },
  ],
  defaultVariants: {
    surface: "v3",
  },
});

const panel = tv({
  base: "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-data border border-brand-steel bg-brand-warm-white py-1 shadow-md focus:outline-none data-[closed]:opacity-0 data-[closed]:scale-95 transition duration-100 ease-out",
  variants: {
    surface: {
      v3: "",
      v5: "border-brand-v5-line bg-brand-v5-surface",
    },
  },
  defaultVariants: {
    surface: "v3",
  },
});

const option = tv({
  base: "flex cursor-default items-center justify-between gap-brand-1 px-brand-2 py-brand-1 text-body text-brand-foundation-navy data-[focus]:bg-brand-passage-blue/10",
  variants: {
    surface: {
      v3: "",
      v5: "text-brand-v5-ink data-[focus]:bg-brand-v5-amber/10",
    },
  },
  defaultVariants: {
    surface: "v3",
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
  surface?: "v3" | "v5";
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
  surface,
  ...aria
}: SelectProps<T>) {
  const selectedOption = options.find((item) => item.value === value) ?? null;

  // `value as T`: Headless UI infers TType as T from `onChange`/`ListboxOption`, but the real
  // value is T | null before a selection is made. Passing it through (rather than the previous
  // `value ?? undefined`) keeps the Listbox controlled from the first render — coercing to
  // undefined when unselected made it flip from uncontrolled to controlled on the first pick,
  // which React flags as a bug.
  return (
    <Listbox value={value as T} onChange={onChange} disabled={disabled} name={name}>
      <div className="relative">
        <ListboxButton
          className={button({ invalid, surface })}
          aria-invalid={invalid || undefined}
          {...aria}
        >
          <span
            className={
              selectedOption ? "" : surface === "v5" ? "text-brand-v5-muted/70" : "text-brand-technical-graphite/60"
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 ${surface === "v5" ? "text-brand-v5-muted" : "text-brand-technical-graphite"}`}
            aria-hidden="true"
          />
        </ListboxButton>
        <ListboxOptions transition className={panel({ surface })}>
          {options.map((item) => (
            <ListboxOption key={item.value} value={item.value} className={option({ surface })}>
              {({ selected: isSelected }) => (
                <>
                  <span>{item.label}</span>
                  {isSelected && (
                    <Check
                      className={`size-4 shrink-0 ${surface === "v5" ? "text-brand-v5-amber-strong" : "text-brand-passage-blue"}`}
                      aria-hidden="true"
                    />
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
