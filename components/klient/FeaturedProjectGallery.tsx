"use client";

import Image from "next/image";
import { useState } from "react";

export interface FeaturedProjectGalleryImage {
  src: string;
  alt: string;
}

interface FeaturedProjectGalleryProps {
  images: FeaturedProjectGalleryImage[];
  label: string;
  showImageLabel: string;
  statusLabel: string;
}

export function FeaturedProjectGallery({ images, label, showImageLabel, statusLabel }: FeaturedProjectGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-2 bg-brand-v5-night p-2" role="group" aria-label={label}>
      <div className="relative aspect-video overflow-hidden rounded-v5-card">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority={active === 0}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="absolute left-brand-3 top-brand-3 inline-flex items-center gap-2 rounded-v5-pill bg-brand-v5-night/85 px-brand-3 py-1.5 text-data font-semibold text-brand-v5-paper">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {images.map((image, index) => (
          <li key={image.src} className="min-w-0">
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${showImageLabel}: ${image.alt}`}
              aria-pressed={index === active}
              className={`focus-ring relative block aspect-video w-full overflow-hidden rounded-md transition-opacity ${
                index === active ? "opacity-100 ring-2 ring-brand-v5-amber" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={image.src} alt="" fill sizes="12vw" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
