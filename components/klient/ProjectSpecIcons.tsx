import type { SVGProps } from "react";

// Rysunek techniczny (blueprint), nie ikony ogólnego przeznaczenia — każdy kształt
// odwzorowuje realny symbol z rzutu architektonicznego (linia wymiarowa, skrzydło
// drzwi w rozwarciu, rzut łóżka z góry, przekrój elewacji...), żeby wizualnie mówić
// o czym jest dany parametr, zamiast być zamiennym glifem z biblioteki ikon.
export type SpecIconProps = SVGProps<SVGSVGElement>;
type IconProps = SpecIconProps;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function FloorAreaIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="9.5" width="17" height="11" />
      <path d="M3.5 5.5h17" />
      <path d="M3.5 4v3M20.5 4v3" />
      <path d="M3.5 5.5l2.2-1.8M20.5 5.5l-2.2-1.8" />
    </svg>
  );
}

export function RoomsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3v18" />
      <path d="M6 20h13" />
      <path d="M6 6v13" />
      <path d="M6 6A13 13 0 0 1 19 20" strokeDasharray="1.2 2.6" />
    </svg>
  );
}

export function BedroomsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="6" width="16" height="14" rx="1" />
      <rect x="6" y="8.2" width="4.6" height="3.6" rx="0.6" />
      <rect x="13.4" y="8.2" width="4.6" height="3.6" rx="0.6" />
      <path d="M4 15.4h16" />
    </svg>
  );
}

export function BathroomsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="7" width="16" height="12.5" rx="6" />
      <circle cx="12" cy="13.2" r="1.3" />
      <path d="M9.5 7V4.8M14.5 7V4.8" />
    </svg>
  );
}

export function StoreysIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 21h17" />
      <path d="M5.5 21V6l6.5-3.5L18.5 6v15" />
      <path d="M5.5 16h13M5.5 11h13" />
    </svg>
  );
}

export function CompletionStandardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="12" height="5.2" rx="2" transform="rotate(-18 9 6.6)" />
      <path d="M10.6 10.6 6 20" />
      <rect x="4.3" y="19" width="6" height="2.6" rx="0.5" />
    </svg>
  );
}

export function WarrantyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 19.5 6v6c0 5-3.4 7.8-7.5 9-4.1-1.2-7.5-4-7.5-9V6Z" />
      <path d="M8.7 12.2 11 14.6l4.6-5" />
    </svg>
  );
}

export function ProductionTimeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4h14" />
      <path d="M5 20h14" />
      <path d="M5 4c0 4 3.2 6.6 3.2 8S5 16 5 20" />
      <path d="M19 4c0 4-3.2 6.6-3.2 8s3.2 4 3.2 8" />
      <rect x="10" y="10.4" width="4" height="3.2" rx="0.5" />
    </svg>
  );
}

export function AssemblyTimeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21h9" />
      <path d="M6.2 21V4M6.2 5l11 2.6" />
      <path d="M16.4 8v5.6" />
      <rect x="13.4" y="13.6" width="6" height="5" rx="0.6" />
      <path d="M13.4 13.6 16.4 10.6 19.4 13.6" />
    </svg>
  );
}

export function ConstructionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3v18M18 3v18" />
      <path d="M6 6.5 10 10.5M6 12.5 10 16.5M14 6.5 18 10.5M14 12.5 18 16.5" />
    </svg>
  );
}

export function EnergyEfficiencyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 3v18M19 3v18" />
      <path d="M5 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M5 14c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" />
    </svg>
  );
}

export function SafetyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 19.5 6v6c0 5-3.4 7.8-7.5 9-4.1-1.2-7.5-4-7.5-9V6Z" />
      <path d="M12 7.8c1.2 1.5 1.7 2.5 1.7 3.5a1.7 1.7 0 1 1-3.4 0c0-1 .5-2 1.7-3.5Z" />
      <path d="M8.6 15.8c1.1-.9 2.3-.9 3.4 0s2.3.9 3.4 0" />
    </svg>
  );
}
