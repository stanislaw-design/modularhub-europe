"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ModularProjectModel3DLabels } from "./ModularProjectModel3D";

const placeholderClass = "aspect-[4/3] rounded-v5-panel bg-brand-v5-line sm:aspect-video";

// three.js (około 150 KB po kompresji) ładuje się dopiero na stronie wpisu z modelem i tylko w przeglądarce.
const ModularProjectModel3D = dynamic(() => import("./ModularProjectModel3D"), {
  ssr: false,
  loading: () => <div className={`${placeholderClass} animate-pulse`} aria-hidden="true" />,
});

// Model (budowa sceny, tekstury, kompilacja shaderów) montuje się dopiero, gdy do jego miejsca zostaje
// niecały ekran przewijania, więc nie opóźnia pierwszego wyświetlenia strony.
export function ModularProjectModelLoader({ labels }: { labels: ModularProjectModel3DLabels }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return near ? (
    <ModularProjectModel3D labels={labels} />
  ) : (
    <div ref={ref} className={placeholderClass} aria-hidden="true" />
  );
}
