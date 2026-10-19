"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown, Plus } from "lucide-react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  // "ruled": no card, hairline rules between rows, numbered, plus/minus
  // marker, first row open (used by the home FAQ). "card" is the default.
  variant?: "card" | "ruled";
}

// First shared expandable-list pattern in the project (spec 0002's
// Consequences flagged this as deferred until a screen needed it); built on
// Headless UI Disclosure, same library and data-[open] convention as
// Select.tsx's Listbox, so keyboard support and aria-expanded come free.
export function Accordion({ items, className, variant = "card" }: AccordionProps) {
  if (variant === "ruled") {
    return (
      <div
        className={`flex flex-col border-t border-brand-v5-ink ${className ?? ""}`}
      >
        {items.map((item, index) => (
          <Disclosure
            key={item.id}
            as="div"
            defaultOpen={index === 0}
            className="border-b border-brand-v5-line"
          >
            {({ open }) => (
              <>
                <DisclosureButton className="group focus-ring flex w-full items-baseline gap-brand-3 py-brand-3 text-left">
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 font-mono text-label tabular-nums text-brand-v5-muted"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-body-l font-semibold text-brand-v5-ink transition-colors duration-200 group-hover:text-brand-v5-amber-strong motion-reduce:transition-none">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden="true"
                    className="size-5 shrink-0 translate-y-1 self-start text-brand-v5-muted transition-[transform,color] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none group-data-[open]:rotate-45 group-data-[open]:text-brand-v5-ink"
                  />
                </DisclosureButton>
                {/* Always mounted so the row height can ease between 0fr and
                    1fr; unmounting on close (Headless default) made it jump. */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <DisclosurePanel
                      static
                      inert={!open}
                      className={`pb-brand-3 pl-[calc(1.5rem+var(--spacing-brand-3))] pr-brand-6 text-body text-brand-v5-muted transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                        open ? "opacity-100 delay-75" : "opacity-0"
                      }`}
                    >
                      {item.answer}
                    </DisclosurePanel>
                  </div>
                </div>
              </>
            )}
          </Disclosure>
        ))}
      </div>
    );
  }

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
