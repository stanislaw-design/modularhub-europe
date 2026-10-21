"use client";

import { useRouter } from "next/navigation";
import { SearchSegment, type SegmentOption } from "./SearchSegment";

interface FamilyRefineSelectProps {
  label: string;
  ariaLabel: string;
  value: string;
  options: (SegmentOption & { href: string })[];
}

// Drugi poziom FamilyTabs ("Więcej niż dom": Wszystko, Spa, Kontenery, Outdoor
// TV) jako lista rozwijana zamiast rzędu pigułek: w wąskim lewym panelu rząd
// wymagał poziomego paska przewijania. Adresy liczy serwer (FamilyTabs), tu
// tylko nawigacja po wyborze, więc kraj/metraż zostają zachowane jak dotąd.
export function FamilyRefineSelect({ label, ariaLabel, value, options }: FamilyRefineSelectProps) {
  const router = useRouter();

  return (
    <div className="rounded-v5-card border border-brand-v5-line bg-brand-v5-surface">
      <SearchSegment
        label={label}
        value={value}
        onChange={(next) => {
          const target = options.find((option) => option.value === next);
          if (target) router.push(target.href);
        }}
        options={options}
        placeholder={label}
        ariaLabel={ariaLabel}
        surface="v5"
      />
    </div>
  );
}
