interface BrandLogoProps {
  className?: string;
  tone?: "dark" | "light";
}

export function BrandLogo({ className = "", tone = "dark" }: BrandLogoProps) {
  const foreground = tone === "light" ? "text-brand-v4-surface" : "text-brand-v5-ink";
  const supporting = tone === "light" ? "text-brand-v4-surface/75" : "text-brand-technical-graphite";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-[0.62em] ${foreground} ${className}`}
    >
      <svg viewBox="0 0 120 100" className="h-[2.8em] w-auto shrink-0" focusable="false">
        <path d="M10 28 58 3v14L22 37Z" fill="currentColor" />
        <path d="M8 34 34 50l24-20v66l-14-8V58L34 68 21 57v31L8 80Z" fill="currentColor" />
        <path d="m63 3 49 26v16L63 17Z" fill="var(--brand-orange)" />
        <path
          d="m63 23 16 9v23l17 8V38l16 9v35l-16 8V70l-17-8v34H63Z"
          fill="currentColor"
          className={supporting}
        />
        <path d="m84 69 9 4v18l-9 4Z" fill="var(--brand-orange)" />
      </svg>
      <span className="flex flex-col justify-center whitespace-nowrap uppercase">
        <span className="text-[1.38em] font-extrabold leading-[0.86] tracking-[-0.045em]">
          Modular <span className="text-brand-orange">Hub</span>{" "}
          <span className={supporting}>Europe</span>
        </span>
        <span
          className={`mt-[0.5em] pl-[0.15em] text-[0.34em] font-medium leading-none tracking-[0.46em] ${supporting}`}
        >
          Build a brighter tomorrow together
        </span>
      </span>
    </span>
  );
}
