const MIN_PRODUCTS = 2;
const MAX_PRODUCTS = 3;

// Only extracts and shape-validates ids from the URL (2 to 3, deduped);
// deliberately does NOT check publish status or family here (unlike
// lib/inquiry.ts's parseInquiryProjectIds), because an id that later turns
// out unpublished/removed must still render as an explicit "unavailable"
// column (spec 0044 AC-10), never trigger a silent drop or a redirect once
// the URL itself was well-formed.
export function parseCompareProjectIds(raw: string | string[] | undefined): string[] | null {
  if (typeof raw !== "string" || raw.length === 0) return null;

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const id of raw.split(",")) {
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    cleaned.push(id);
  }

  if (cleaned.length < MIN_PRODUCTS || cleaned.length > MAX_PRODUCTS) return null;
  return cleaned;
}
