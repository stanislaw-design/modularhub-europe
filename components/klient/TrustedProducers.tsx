interface TrustedProducersProps {
  producerNames: string[];
}

// Renders real producerName values from the mock fixtures as stylized text,
// never third-party logos (spec 0014 AC-8 — the reference image shows real,
// existing house-manufacturer brands that must not be reproduced here).
// "Zobacz wszystkich producentów" is disabled: no producer catalog page
// exists yet.
export function TrustedProducers({ producerNames }: TrustedProducersProps) {
  return (
    <section className="full-bleed bg-brand-v4-night py-brand-4">
      <div className="mx-auto flex w-full max-w-brand-max flex-col gap-brand-2 px-[6%] sm:flex-row sm:items-center sm:gap-brand-4">
        <p className="shrink-0 text-body font-semibold text-brand-v4-mist">
          Zaufaj nam wiodący producenci
        </p>
        <ul className="flex min-w-0 flex-1 items-center gap-brand-4 divide-x divide-brand-v4-line-dark overflow-x-auto">
          {producerNames.map((name) => (
            <li
              key={name}
              className="shrink-0 whitespace-nowrap pl-brand-4 font-display text-body-l font-bold uppercase tracking-[0.05em] text-brand-v4-surface first:pl-0"
            >
              {name}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="shrink-0 self-start rounded-v4-pill border border-brand-v4-line-dark px-brand-3 py-brand-1 text-body font-medium text-brand-v4-surface disabled:cursor-default disabled:opacity-60 sm:self-auto"
        >
          Zobacz wszystkich producentów
        </button>
      </div>
    </section>
  );
}
