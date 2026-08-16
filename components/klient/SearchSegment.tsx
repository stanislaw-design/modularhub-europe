"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

export interface SegmentOption {
  value: string;
  label: string;
}

interface SearchSegmentProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: SegmentOption[];
  placeholder: string;
  ariaLabel: string;
}

export function SearchSegment({ label, value, onChange, options, placeholder, ariaLabel }: SearchSegmentProps) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Listbox value={value as string} onChange={onChange}>
      <div className="relative flex-1">
        <ListboxButton
          aria-label={ariaLabel}
          className="focus-ring flex w-full flex-col items-start gap-0.5 px-brand-3 py-brand-2 text-left"
        >
          <span className="text-label font-semibold text-brand-foundation-navy">{label}</span>
          <span
            className={
              selected
                ? "text-body text-brand-foundation-navy"
                : "text-body text-brand-technical-graphite/60"
            }
          >
            {selected ? selected.label : placeholder}
          </span>
        </ListboxButton>
        <ListboxOptions
          transition
          className="absolute left-0 z-10 mt-1 max-h-60 w-full min-w-40 overflow-auto rounded-card border border-brand-steel bg-brand-warm-white py-1 shadow-md transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="cursor-default px-brand-2 py-brand-1 text-body text-brand-foundation-navy data-[focus]:bg-brand-passage-blue/10"
            >
              {option.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
