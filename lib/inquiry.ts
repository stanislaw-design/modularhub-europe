export interface InquiryContact {
  name: string;
  email: string;
  phone: string;
}

const MAX_PROJECTS = 3;

// Dedupes, drops ids not present in knownIds, and accepts only when 1 to 3 remain;
// spec 0005 AC-5 — an invalid or missing selection is a soft redirect, never an error.
export function parseInquiryProjectIds(
  raw: string | string[] | undefined,
  knownIds: Set<string>
): string[] | null {
  if (typeof raw !== "string" || raw.length === 0) return null;

  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const id of raw.split(",")) {
    if (!knownIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    cleaned.push(id);
  }

  if (cleaned.length === 0 || cleaned.length > MAX_PROJECTS) return null;
  return cleaned;
}
