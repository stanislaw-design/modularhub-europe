import type { Producer } from "../types";

// Illustrative reputation numbers (rating/reviewCount/modelsCount), same
// Facade spirit as StatsBar's old static stats (spec 0015 AC-9). id must
// always match an existing Project.producerId — referential integrity is a
// spec invariant, not a coincidence.
export const producers: Producer[] = [
  {
    id: "prod-modulor",
    name: "Modulor Systems Sp. z o.o.",
    countryCode: "PL",
    rating: 4.9,
    reviewCount: 312,
    modelsCount: 18,
    sizeRangeM2Min: 45,
    sizeRangeM2Max: 140,
    deliveryCountries: ["PL", "DE", "NL"],
    featuredPhotoUrl: "/images/houses/golden-hour/modulor-family-90.webp",
    verified: true,
  },
  {
    id: "prod-baltyk",
    name: "Baltyk Modular Sp. z o.o.",
    countryCode: "PL",
    rating: 4.7,
    reviewCount: 198,
    modelsCount: 12,
    sizeRangeM2Min: 35,
    sizeRangeM2Max: 150,
    deliveryCountries: ["PL", "DE"],
    featuredPhotoUrl: "/images/houses/golden-hour/baltyk-loft-120.webp",
    verified: true,
  },
  {
    id: "prod-karpaty",
    name: "Karpaty Haus Sp. z o.o.",
    countryCode: "PL",
    rating: 4.8,
    reviewCount: 156,
    modelsCount: 9,
    sizeRangeM2Min: 60,
    sizeRangeM2Max: 130,
    deliveryCountries: ["PL", "DE"],
    featuredPhotoUrl: "/images/houses/golden-hour/karpaty-alpine-104.webp",
    verified: true,
  },
];
