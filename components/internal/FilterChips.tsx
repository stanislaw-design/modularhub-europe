import Link from "next/link";
import type { ReactNode } from "react";

// Grupa filtra jako podpisana linia przycisków: etykieta mówi, co zawęża,
// a wybrana opcja jest wypełniona kolorem tekstu (odwraca się w ciemnym motywie).
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={`Filtr: ${label}`} className="flex flex-wrap items-center gap-brand-2">
      <span className="text-label font-medium uppercase tracking-[0.08em] text-brand-technical-graphite">{label}</span>
      <div className="flex flex-wrap gap-brand-1">{children}</div>
    </nav>
  );
}

export function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-ring inline-flex h-8 items-center rounded-data border px-brand-3 text-data font-medium no-underline ${
        active
          ? "border-brand-foundation-navy bg-brand-foundation-navy text-brand-warm-white"
          : "border-brand-steel text-brand-technical-graphite hover:bg-brand-steel/30 hover:text-brand-foundation-navy"
      }`}
    >
      {label}
    </Link>
  );
}
