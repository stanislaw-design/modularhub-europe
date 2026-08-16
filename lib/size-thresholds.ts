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
