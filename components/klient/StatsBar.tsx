import { Globe, Home, Smile, Star, Users } from "lucide-react";
import { Container } from "@/components/ui";

// Static marketing content, deliberately not computed from the mock fixtures
// (today: 6 projects, 3 countries) — spec 0014 AC-5 treats this the same as
// any other illustrative content at this prototype stage.
const stats = [
  { icon: Users, value: "250+", label: "Zweryfikowanych producentów" },
  { icon: Home, value: "1 000+", label: "Projektów domów" },
  { icon: Smile, value: "15 000+", label: "Zadowolonych klientów" },
  { icon: Globe, value: "25+", label: "Krajów w Europie" },
];

export function StatsBar() {
  return (
    <section className="full-bleed bg-brand-v4-night py-brand-4">
      <Container className="grid grid-cols-2 gap-brand-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-start gap-brand-1">
            <Icon className="size-5 text-brand-v4-amber" aria-hidden="true" />
            <span className="font-mono text-h3 font-semibold tabular-nums text-brand-v4-surface">
              {value}
            </span>
            <span className="text-body text-brand-v4-mist">{label}</span>
          </div>
        ))}
        <div className="flex flex-col items-start gap-brand-1">
          <div className="flex items-center gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="size-4 fill-brand-v4-amber text-brand-v4-amber" />
            ))}
          </div>
          <span className="font-mono text-h3 font-semibold tabular-nums text-brand-v4-surface">
            4,8/5
          </span>
          <span className="text-body text-brand-v4-mist">Na podstawie 1 200+ opinii</span>
        </div>
      </Container>
    </section>
  );
}
