"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

// First shared expandable-list pattern in the project (spec 0002's
// Consequences flagged this as deferred until a screen needed it); built on
// Headless UI Disclosure, same library and data-[open] convention as
// Select.tsx's Listbox, so keyboard support and aria-expanded come free.
export function Accordion({ items, className }: AccordionProps) {
  return (
    <div
      className={`flex flex-col divide-y divide-brand-v5-line rounded-v5-card border border-brand-v5-line bg-brand-v5-surface ${className ?? ""}`}
    >
      {items.map((item) => (
        <Disclosure key={item.id} as="div" className="px-brand-3">
          <DisclosureButton className="group focus-ring flex w-full items-center justify-between gap-brand-3 py-brand-3 text-left text-body-l font-semibold text-brand-v5-ink">
            <span>{item.question}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-brand-v5-muted transition-transform duration-200 group-data-[open]:rotate-180"
            />
          </DisclosureButton>
          <DisclosurePanel
            transition
            className="pb-brand-3 text-body text-brand-v5-muted transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0"
          >
            {item.answer}
          </DisclosurePanel>
        </Disclosure>
      ))}
    </div>
  );
}
