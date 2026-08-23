import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

// Read only display, no interaction. Filled vs outline stars carry the
// rating visually (never color alone, brand-guidelines-v3.md section 7); the
// numeric value in the accessible name is the real source of truth for
// assistive tech, matching StatusPill's icon-plus-text convention.
export function StarRating({ rating, reviewCount, className }: StarRatingProps) {
  const filledCount = Math.round(rating);
  const label =
    reviewCount !== undefined
      ? `Ocena ${rating.toFixed(1)} na 5 gwiazdek, na podstawie ${reviewCount} opinii`
      : `Ocena ${rating.toFixed(1)} na 5 gwiazdek`;

  return (
    <div className={`flex items-center gap-brand-1 ${className ?? ""}`}>
      <div className="flex items-center gap-0.5" role="img" aria-label={label}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={
              index < filledCount
                ? "size-4 shrink-0 fill-brand-v5-amber text-brand-v5-amber"
                : "size-4 shrink-0 text-brand-v5-line"
            }
          />
        ))}
      </div>
      <span className="font-mono text-data tabular-nums text-brand-v5-ink">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-data text-brand-v5-muted">({reviewCount})</span>
      )}
    </div>
  );
}
