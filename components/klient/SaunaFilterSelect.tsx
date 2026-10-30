"use client";

import { useRouter } from "next/navigation";
import { SearchSegment } from "./SearchSegment";

export interface SaunaFilterSelectOption {
  value: string;
  label: string;
  href: string;
}

interface SaunaFilterSelectProps {
  label: string;
  // Wartość "" to opcja „wszystkie", czyści ten wymiar filtra.
  value: string;
  options: SaunaFilterSelectOption[];
}

// Jedna lista rozwijana filtra /sauna (spec 0068): stan filtra zostaje w URL,
// więc wybór opcji to nawigacja pod href policzony po stronie serwera przez
// buildSaunaHref, a nie lokalny stan.
export function SaunaFilterSelect({ label, value, options }: SaunaFilterSelectProps) {
  const router = useRouter();

  const allLabel = options.find((item) => item.value === "")?.label ?? label;

  return (
    <SearchSegment
      label={label}
      value={value}
      options={options}
      placeholder={allLabel}
      ariaLabel={label}
      surface="v5"
      onChange={(next) => {
        const target = options.find((item) => item.value === next);
        if (target && target.value !== value) router.push(target.href, { scroll: false });
      }}
    />
  );
}
