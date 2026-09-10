interface BrandLogoProps {
  className?: string;
  tone?: "dark" | "light";
}

export function BrandLogo({ className = "", tone = "dark" }: BrandLogoProps) {
  const foreground = tone === "light" ? "text-brand-v4-surface" : "text-brand-v5-ink";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-[0.55em] ${foreground} ${className}`}
    >
      <svg viewBox="0 0 100 100" className="h-[2.35em] w-auto shrink-0" focusable="false">
        <defs>
          <mask id="brand-passage-cutout">
            <rect width="100" height="100" fill="white" />
            <path d="M34 39 61 56v13L34 85Z" fill="black" />
          </mask>
        </defs>
        <g fill="currentColor" mask="url(#brand-passage-cutout)">
          <rect x="8" y="10" width="26" height="80" rx="10" />
          <rect x="70" y="10" width="22" height="80" rx="10" />
          <path d="M32 20q0-7 7-3l35 23v42q0 8-8 8H55V57L32 42Z" />
        </g>
        <path d="M37 48q0-5 5-2l15 10v12L42 78q-5 3-5-3Z" fill="#FCA311" />
      </svg>
      <span className="flex flex-col justify-center whitespace-nowrap">
        <span className="text-[1.55em] font-extrabold leading-[0.82] tracking-[-0.065em]">
          ModularHub
        </span>
        <span className="mt-[0.42em] pl-[0.18em] text-[0.46em] font-bold leading-none tracking-[0.58em]">
          EUROPE
        </span>
      </span>
    </span>
  );
}
