// Shared 50 m² step thresholds used by the hero selector (od/do fields) and by
// the featured-home rounding rule (spec 0003, "Reguła zaokrąglania dla AC-6").
export const SIZE_THRESHOLDS = [50, 100, 150, 200] as const;

export type SizeThreshold = (typeof SIZE_THRESHOLDS)[number];

interface SizeRange {
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

// sizeMax = smallest threshold >= floorAreaM2 (absent = no upper bound, floorAreaM2 > 200).
// sizeMin = largest threshold <= floorAreaM2 (absent = no lower bound, floorAreaM2 < 50).
export function roundedSizeRangeFor(floorAreaM2: number): SizeRange {
  const sizeMax = SIZE_THRESHOLDS.find((threshold) => threshold >= floorAreaM2);
  const sizeMin = [...SIZE_THRESHOLDS].reverse().find((threshold) => threshold <= floorAreaM2);
  return { sizeMin, sizeMax };
}

export interface SizeRangeOption extends SizeRange {
  value: string;
  label: string;
}

// The six ranges the home page's single "Powierzchnia" field offers (spec
// 0014, Feature design), built from SIZE_THRESHOLDS only — no new values.
// Replaces the old two-field "od"/"do" pair from spec 0003; a value in the
// middle (e.g. exactly 100 m²) still matches two adjacent ranges, the same
// closed-interval consequence the two-field version already had.
export const SIZE_RANGE_OPTIONS: SizeRangeOption[] = [
  { value: "any", label: "Dowolna" },
  { value: "upTo50", label: "do 50 m²", sizeMax: 50 },
  { value: "50to100", label: "50–100 m²", sizeMin: 50, sizeMax: 100 },
  { value: "100to150", label: "100–150 m²", sizeMin: 100, sizeMax: 150 },
  { value: "150to200", label: "150–200 m²", sizeMin: 150, sizeMax: 200 },
  { value: "over200", label: "powyżej 200 m²", sizeMin: 200 },
];
