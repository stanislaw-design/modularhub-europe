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

// Ściana szkieletowa w elewacji (słupy między górną i dolną płatwą) — ten sam
// symbol co na rysunku konstrukcyjnym ściany ryglowej, więc czytelny od razu
// dla kogokolwiek, kto widział choć jeden przekrój budowlany, zamiast
// abstrakcyjnego wzoru bez odniesienia w realnym rysunku technicznym.
export function ConstructionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="0.5" />
      <path d="M3.5 8h17M3.5 16h17" />
      <path d="M8 3.5v17M12 3.5v17M16 3.5v17" />
    </svg>
  );
}

// Ta sama rama co ConstructionIcon (spójny język "przekroju"), wypełniona
// zygzakiem waty izolacyjnej — to jest realny symbol materiału izolacyjnego z
// rysunków budowlanych (nie ozdobna fala), więc grupa czyta się jako "co jest
// w ścianie/oknie", nie jako abstrakcyjny wzór dźwięku czy sygnału.
export function EnergyEfficiencyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="0.5" />
      <path d="M7.2 6.5c1.5 1.4 1.5 2.7 0 4.1s-1.5 2.7 0 4.1 1.5 2.7 0 4.1" />
      <path d="M12 6.5c1.5 1.4 1.5 2.7 0 4.1s-1.5 2.7 0 4.1 1.5 2.7 0 4.1" />
      <path d="M16.8 6.5c1.5 1.4 1.5 2.7 0 4.1s-1.5 2.7 0 4.1 1.5 2.7 0 4.1" />
    </svg>
  );
}

// Trójkąt połaci dachu z linią pionową od kalenicy i łukiem kąta między nimi —
// ten sam symbol kąta nachylenia, jaki widać na przekroju architektonicznym
// dachu, więc odpowiada wprost na pytanie "jaki jest kąt nachylenia dachu?".
export function RoofPitchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 15 12 5 20.5 15" />
      <path d="M3.5 15h17" />
      <path d="M12 5v6.4" />
      <path d="M9.3 9.8a3.6 3.6 0 0 0 2.7-4.4" />
    </svg>
  );
}

// Rzut pomieszczenia z przestawną (przerywaną) ścianką działową i strzałkami
// w obie strony — symbol przekładalności układu, nie ozdobna strzałka, żeby
// mówić wprost "ten układ da się dopasować pod siebie".
export function CustomizationIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4" width="17" height="16" rx="0.5" />
      <path d="M12 4v16" strokeDasharray="1.4 2.2" />
      <path d="M9.4 12H7M7 12l1.4-1.4M7 12l1.4 1.4" />
      <path d="M14.6 12h2.4M17 12l-1.4-1.4M17 12l1.4 1.4" />
    </svg>
  );
}

// Podwójna rama okna: zewnętrzna linia to ościeżnica, wewnętrzna przerywana
// to szczelina uszczelki — ten sam sposób rysowania szczelności stolarki co
// na przekrojach okiennych, więc odpowiada na "jak szczelne są okna i drzwi?".
export function WindowSealIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3.5" width="16" height="16" rx="0.5" />
      <rect x="6.4" y="5.9" width="11.2" height="11.2" rx="0.3" strokeDasharray="0.1 2.6" />
      <path d="M12 5.9v11.2M6.4 11.5h11.2" />
    </svg>
  );
}

// Kratka wentylacyjna (żaluzje) z zawijasem przepływu powietrza nad nią — ten
// sam symbol nawiewu co na rzutach instalacyjnych, odpowiadający na "czy
// latem będzie duszno?".
export function VentilationIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="6.5" width="16" height="13" rx="1" />
      <path d="M7 10h10M7 13.2h10M7 16.4h10" />
      <path d="M14.8 3c1.9.9 1.9 2.1 0 3" />
    </svg>
  );
}

// Grzejnik (żeberka) — realny symbol źródła ciepła z rzutów instalacyjnych,
// odpowiadający na "czym dom jest ogrzewany?".
export function HeatSourceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <path d="M7.5 6v12M11 6v12M14.5 6v12M18 6v12" />
    </svg>
  );
}

// Tarcza (ten sam kształt co WarrantyIcon — spójna wizualna rodzina "ochrony")
// z czytelnym płomieniem w środku zamiast poprzedniej abstrakcyjnej kropli:
// odporność ogniowa/wiatrowa i gwarancja konstrukcyjna to ta sama obietnica
// "dom Cię ochroni", więc płomień w tarczy mówi to wprost.
export function SafetyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 19.5 6v6c0 5-3.4 7.8-7.5 9-4.1-1.2-7.5-4-7.5-9V6Z" />
      <path d="M12 8.2c1.6 1.9 2.3 3.1 2.3 4.1a2.3 2.3 0 1 1-4.6 0c0-.6.2-1.2.6-1.8.2.5.5.8.9.8-.1-1 .2-1.9.8-3.1Z" />
    </svg>
  );
}
