export interface MohoRoomSource {
  name: string;
  areaM2: number;
}

export interface MohoProjectSource {
  id: string;
  name: string;
  builtUpAreaM2: number;
  floorAreaM2: number;
  heightCm: number;
  externalDimensionsM: [lengthM: string, widthM: string, heightM: string];
  roofType: string;
  category: "caloroczny";
  simplifiedPermitEligible: boolean | null;
  bedrooms: number;
  description: string;
  rooms: MohoRoomSource[];
  coverPhoto: string;
  galleryPhotos: string[];
  floorPlan: string;
  catalogPages: string;
}

const PHOTO_DIR = "tmp/moho-catalog/photos";
const PLAN_DIR = "tmp/moho-catalog/plans";

export const MOHO_PROJECTS: MohoProjectSource[] = [
  {
    id: "e0010000-0000-4000-8000-000000000001",
    name: "MOHO Gotland 35m²",
    builtUpAreaM2: 35,
    floorAreaM2: 27,
    heightCm: 340,
    externalDimensionsM: ["3,50", "10,00", "3,40"],
    roofType: "Dwuspadowy, 22°, 40%",
    category: "caloroczny",
    simplifiedPermitEligible: true,
    bedrooms: 1,
    description:
      "Smukła i elegancka bryła domu Gotland to symetryczna architektura wzbogacona dyskretnymi detalami. Drewno naturalne, szkło i metal nadają budynkowi charakter, a zbliżenie do natury i wkomponowanie w otoczenie są jego głównym celem. Dom o powierzchni zabudowy 35 m² i użytkowej 27 m², z jedną sypialnią, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    rooms: [
      { name: "Sypialnia", areaM2: 8.07 },
      { name: "Łazienka", areaM2: 2.96 },
      { name: "Korytarz", areaM2: 2.3 },
      { name: "Salon", areaM2: 14.78 },
    ],
    coverPhoto: `${PHOTO_DIR}/p4-000.jpg`,
    galleryPhotos: [`${PHOTO_DIR}/p4-001.jpg`],
    floorPlan: `${PLAN_DIR}/p5-05.png`,
    catalogPages: "4–5",
  },
  {
    id: "e0010000-0000-4000-8000-000000000002",
    name: "MOHO Fjord 35m² (1 sypialnia)",
    builtUpAreaM2: 35,
    floorAreaM2: 27,
    heightCm: 400,
    externalDimensionsM: ["3,48", "10,00", "4,00"],
    roofType: "Dwuspadowy, 35°, 70%",
    category: "caloroczny",
    simplifiedPermitEligible: true,
    bedrooms: 1,
    description:
      "Dom FJORD 35 m² to mobilny dom całoroczny na konstrukcji stalowej, który w pełni wykorzystuje powierzchnię zabudowy. Układ wnętrz bazuje na japońskim minimalizmie, a dom można ustawić w dowolnym miejscu na zgłoszenie. Wariant z jedną sypialnią, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    rooms: [
      { name: "Sypialnia", areaM2: 7.53 },
      { name: "Łazienka", areaM2: 3.19 },
      { name: "Korytarz", areaM2: 1.48 },
      { name: "Salon", areaM2: 14.53 },
    ],
    coverPhoto: `${PHOTO_DIR}/p6-001.jpg`,
    galleryPhotos: [`${PHOTO_DIR}/p6-000.jpg`],
    floorPlan: `${PLAN_DIR}/p7-07.png`,
    catalogPages: "6–7",
  },
  {
    id: "e0010000-0000-4000-8000-000000000003",
    name: "MOHO Fjord 35m² (2 sypialnie)",
    builtUpAreaM2: 35,
    floorAreaM2: 27,
    heightCm: 400,
    externalDimensionsM: ["3,48", "10,00", "4,00"],
    roofType: "Dwuspadowy, 35°, 70%",
    category: "caloroczny",
    simplifiedPermitEligible: true,
    bedrooms: 2,
    description:
      "Dom FJORD 35 m² to mobilny dom całoroczny na konstrukcji stalowej, który w pełni wykorzystuje powierzchnię zabudowy. Układ wnętrz bazuje na japońskim minimalizmie, a dom można ustawić w dowolnym miejscu na zgłoszenie. Wariant z dwiema sypialniami, dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych.",
    rooms: [
      { name: "Sypialnia 1", areaM2: 8 },
      { name: "Sypialnia 2", areaM2: 3.21 },
      { name: "Łazienka", areaM2: 3.18 },
      { name: "Korytarz", areaM2: 2.67 },
      { name: "Salon", areaM2: 9.37 },
    ],
    coverPhoto: `${PHOTO_DIR}/p6-001.jpg`,
    galleryPhotos: [`${PHOTO_DIR}/p6-000.jpg`],
    floorPlan: `${PLAN_DIR}/p8-08.png`,
    catalogPages: "6–8",
  },
  {
    id: "e0010000-0000-4000-8000-000000000004",
    name: "MOHO Fjord 48m²",
    builtUpAreaM2: 48,
    floorAreaM2: 38.9,
    heightCm: 400,
    externalDimensionsM: ["3,98", "11,98", "4,00"],
    roofType: "Dwuspadowy, 31,4°, 61%; pokrycie blachą na rąbek",
    category: "caloroczny",
    simplifiedPermitEligible: null,
    bedrooms: 2,
    description:
      "Nowoczesny dom FJORD o powierzchni zabudowy 48 m² z dużymi przeszkleniami, które wpuszczają do wnętrza dużo światła dziennego. Bryła w stylu nowoczesnej stodoły z dwuspadowym dachem pokrytym blachą na rąbek. Przestrzeń dostosowana do potrzeb rodzin, z dwiema sypialniami, pozwala na wygodne korzystanie z domu przez cały rok.",
    rooms: [
      { name: "Sypialnia 1", areaM2: 9.28 },
      { name: "Sypialnia 2", areaM2: 4.63 },
      { name: "Łazienka", areaM2: 4.26 },
      { name: "Korytarz", areaM2: 3.88 },
      { name: "Salon", areaM2: 15.55 },
    ],
    coverPhoto: `${PHOTO_DIR}/p10-000.jpg`,
    galleryPhotos: [`${PHOTO_DIR}/p10-001.jpg`],
    floorPlan: `${PLAN_DIR}/p11-11.png`,
    catalogPages: "10–11",
  },
  {
    id: "e0010000-0000-4000-8000-000000000005",
    name: "MOHO Fjord 56m²",
    builtUpAreaM2: 56,
    floorAreaM2: 46.24,
    heightCm: 400,
    externalDimensionsM: ["3,98", "13,98", "4,00"],
    roofType: "Dwuspadowy, 31,4°, 61%; pokrycie blachą na rąbek",
    category: "caloroczny",
    simplifiedPermitEligible: null,
    bedrooms: 2,
    description:
      "Przestronny dom FJORD 56 m² nawiązuje prostotą do kształtu barnhouse. Przeszklona ściana szczytowa i otwarta forma wnętrza sprawiają, że dom jest wypełniony dziennym światłem. Strefa dzienna z otwartą kuchnią, łazienka i dwie sypialnie; salon można powiększyć o taras połączony z wnętrzem dużymi przesuwnymi oknami.",
    rooms: [
      { name: "Sypialnia 1", areaM2: 9.95 },
      { name: "Sypialnia 2", areaM2: 5.96 },
      { name: "Łazienka", areaM2: 4.46 },
      { name: "Korytarz", areaM2: 4.91 },
      { name: "Salon", areaM2: 19.12 },
    ],
    coverPhoto: `${PHOTO_DIR}/p12-000.jpg`,
    galleryPhotos: [`${PHOTO_DIR}/p12-001.jpg`],
    floorPlan: `${PLAN_DIR}/p13-13.png`,
    catalogPages: "12–13",
  },
];
