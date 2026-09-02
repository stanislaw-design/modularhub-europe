"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
  const prefersReducedMotion = useReducedMotion();

  return (
    <Listbox value={value as string} onChange={onChange}>
      {({ open }) => (
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
          {/* ListboxOptions' own `transition` prop only animated the open
              direction — on close, Headless UI unmounted the element
              instantly with no exit transition at all. `static` hands mount
              control to us, so AnimatePresence can hold it mounted long
              enough to play the exit animation too.
              Height (not scale) so the panel reads as unfurling out of the
              field it belongs to, not a separate card popping in on top of
              it — same idea as SearchCard's own grid-rows expand. The outer
              motion.div owns the height animation and clips it
              (overflow-hidden); the inner ListboxOptions keeps its own
              max-h-60/overflow-auto for scrolling once fully open, so a long
              option list doesn't fight the collapse animation. */}
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 z-10 mt-1 w-full min-w-40 overflow-hidden rounded-card border-x border-b border-brand-steel bg-brand-warm-white shadow-md"
              >
                <ListboxOptions
                  static
                  className="max-h-60 overflow-auto py-1 focus:outline-none [scrollbar-color:var(--color-brand-technical-graphite)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-technical-graphite/30 [&::-webkit-scrollbar-thumb:hover]:bg-brand-technical-graphite/50 [&::-webkit-scrollbar-track]:bg-transparent"
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
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </Listbox>
  );
}
