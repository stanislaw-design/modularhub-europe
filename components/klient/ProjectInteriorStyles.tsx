import Image from "next/image";
import Link from "next/link";
import { Heading, Text } from "@/components/ui";
import type { InteriorStyle } from "@/lib/db/queries";

interface ProjectInteriorStylesProps {
  styles: InteriorStyle[];
  // Stylistyka pokazana w podglądzie: wybrana przez klienta albo pierwsza wg sort_order, gdy w adresie nie ma wyboru.
  activeStyleId: string;
  // Tylko wybór klienta z adresu (`stylistyka`); null oznacza podgląd, który nie jest uznany za wybór (spec 0081 AC-8).
  chosenStyleId: string | null;
  // Adres po kliknięciu stylistyki; dla już wybranej odznacza wybór.
  hrefFor: (styleId: string) => string;
  heading: string;
  intro: string;
  previewNote: string;
  chosenLabel: string;
  materialsHeading: string;
  ariaLabel: string;
  zoneLabels: Record<string, string>;
  imageLabels: [string, string, string];
}

const ZONE_ORDER = ["walls_ceilings", "flooring", "built_in_furniture", "bathroom", "kitchen", "beds_textiles"];

// Sekcja "Wykończenie wnętrza" (spec 0081 AC-8, AC-9). Serwerowa, wybór idzie linkiem `?stylistyka=` jak opcje
// konfiguratora (spec 0059), nie zmienia ceny. Kafelki próbników to małe pliki WebP z R2 renderowane zwykłym <img>,
// bez next/image i optymalizacji Vercela, i to wyłącznie dla aktualnie otwartej stylistyki (AC-9).
export function ProjectInteriorStyles({
  styles,
  activeStyleId,
  chosenStyleId,
  hrefFor,
  heading,
  intro,
  previewNote,
  chosenLabel,
  materialsHeading,
  ariaLabel,
  zoneLabels,
  imageLabels,
}: ProjectInteriorStylesProps) {
  const active = styles.find((style) => style.id === activeStyleId) ?? styles[0];
  if (!active) return null;
  const zones = ZONE_ORDER.map((zone) => ({ zone, materials: active.materials.filter((material) => material.zone === zone) })).filter(
    (entry) => entry.materials.length > 0,
  );

  return (
    <section className="flex flex-col gap-brand-3" aria-label={ariaLabel}>
      <div className="flex flex-col gap-brand-1">
        <Heading level="h2" surface="v5" className="text-h3">
          {heading}
        </Heading>
        <Text tone="muted" surface="v5">
          {intro}
        </Text>
      </div>

      <nav aria-label={ariaLabel} className="flex flex-wrap gap-brand-1">
        {styles.map((style) => {
          const isActive = style.id === active.id;
          return (
            <Link
              key={style.id}
              href={hrefFor(style.id)}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={`rounded-v5-card border px-brand-3 py-brand-1 text-body-m font-semibold transition-colors ${
                isActive
                  ? "border-brand-v5-ink bg-brand-v5-ink text-brand-v5-surface"
                  : "border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink hover:border-brand-v5-ink"
              }`}
            >
              {style.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-brand-2">
        <div className="flex flex-wrap items-center gap-brand-2">
          <Heading level="h3" surface="v5" className="text-h4">
            {active.name}
          </Heading>
          {chosenStyleId === active.id && (
            <span className="rounded-full bg-brand-v5-ink px-brand-2 py-0.5 text-body-s font-semibold text-brand-v5-surface">{chosenLabel}</span>
          )}
        </div>
        {active.description && (
          <Text tone="muted" surface="v5">
            {active.description}
          </Text>
        )}
        {chosenStyleId === null && (
          <Text variant="label" tone="muted" surface="v5">
            {previewNote}
          </Text>
        )}
      </div>

      {active.images.length > 0 && (
        <ul className="grid gap-brand-2 sm:grid-cols-3">
          {active.images.map((image, index) => (
            <li key={image.id} className="relative aspect-[3/2] overflow-hidden rounded-v5-card bg-brand-v5-ink/5">
              <Image
                src={image.url}
                alt={image.alt ?? `${active.name}, ${imageLabels[index] ?? ""}`.replace(/, $/, "")}
                fill
                // Pliki są już małymi JPEG-ami z R2; bez optymalizacji nie obciążają limitu Vercela, który już raz się wyczerpał.
                unoptimized
                sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, 100vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-brand-3">
        <Heading level="h3" surface="v5" className="text-h4">
          {materialsHeading}
        </Heading>
        <dl className="grid gap-brand-3 sm:grid-cols-2">
          {zones.map(({ zone, materials }) => (
            <div key={zone} className="flex flex-col gap-brand-1">
              <dt>
                <Text variant="label" tone="muted" surface="v5">
                  {zoneLabels[zone] ?? zone}
                </Text>
              </dt>
              <dd>
                <ul className="flex flex-wrap gap-brand-2">
                  {materials.map((material) => (
                    <li key={material.id} className="flex w-20 flex-col items-center gap-1 text-center">
                      {material.swatchUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- małe kafelki z R2 bez optymalizacji Vercela (spec 0081 AC-9)
                        <img
                          src={material.swatchUrl}
                          alt=""
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          className="size-12 rounded-md border border-brand-v5-line object-cover"
                        />
                      ) : (
                        <span aria-hidden className="size-12 rounded-md border border-brand-v5-line bg-brand-v5-ink/5" />
                      )}
                      <span className="text-body-s font-semibold leading-tight">{material.name}</span>
                      {material.code && <span className="text-body-s leading-tight text-brand-v5-ink/60">{material.code}</span>}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
