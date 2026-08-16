import {
  Accessibility,
  Building2,
  Flower2,
  Home,
  Layers,
  Mountain,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Warehouse,
  Waves,
  Wind,
  Zap,
} from "lucide-react";

// Decorative for now — no filter data model backs these yet (spec 0003 doesn't
// define home attributes as a filterable facet). Visual placeholder matching
// the reference layout; wiring real filtering is a future decision.
const categories = [
  { icon: Home, label: "Parterowy" },
  { icon: Building2, label: "Piętrowy" },
  { icon: Thermometer, label: "Pompa ciepła" },
  { icon: Sun, label: "Fotowoltaika" },
  { icon: Wind, label: "Rekuperacja" },
  { icon: Layers, label: "Konstrukcja CLT" },
  { icon: Mountain, label: "Tereny górskie" },
  { icon: Waves, label: "Nad wodą" },
  { icon: Flower2, label: "Ogród" },
  { icon: Warehouse, label: "Garaż" },
  { icon: Accessibility, label: "Bez barier" },
  { icon: Zap, label: "Klasa A+" },
];

export function CategoryFilterBar() {
  return (
    <div className="flex items-center gap-brand-4 overflow-x-auto border-b border-brand-steel py-brand-2">
      <div className="flex flex-1 items-center gap-brand-4">
        {categories.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex shrink-0 flex-col items-center gap-1 text-brand-technical-graphite disabled:cursor-default"
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs">{label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled
        className="flex shrink-0 items-center gap-2 rounded-full border border-brand-steel px-brand-2 py-brand-1 text-body text-brand-foundation-navy disabled:cursor-default"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtry
      </button>
    </div>
  );
}
