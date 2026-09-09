import type { FulfillmentOrder } from "../types";

// One row per Project.id that has an accepted binding offer (1:1, optional —
// see spec 0007 Key invariants). Not every project has a row: getFulfillmentOrder
// returning null means "no accepted offer yet", handled by a redirect to
// /oferta, never an error. Includes one entry on the last stage (gwarancja)
// to exercise the completion banner scenario (spec 0007 AC-7).
export const fulfillmentOrders: FulfillmentOrder[] = [
  {
    projectId: "prj-budman-familia-90",
    currentStage: "montaz",
    stages: [
      {
        name: "produkcja",
        reachedAt: "2026-05-04",
        documents: [
          { name: "Protokół zejścia z linii produkcyjnej.pdf", type: "pdf" },
          { name: "Zdjęcia modułów przed transportem.jpg", type: "image" },
        ],
      },
      {
        name: "transport",
        reachedAt: "2026-06-01",
        documents: [{ name: "List przewozowy CMR.pdf", type: "pdf" }],
      },
      {
        name: "montaz",
        reachedAt: "2026-06-08",
        documents: [{ name: "Harmonogram prac montażowych.pdf", type: "pdf" }],
      },
      { name: "odbior", reachedAt: null, documents: [] },
      { name: "gwarancja", reachedAt: null, documents: [] },
    ],
  },
  {
    projectId: "prj-steelhouse-loft-120",
    currentStage: "produkcja",
    stages: [
      {
        name: "produkcja",
        reachedAt: "2026-07-21",
        documents: [{ name: "Potwierdzenie rozpoczęcia produkcji.pdf", type: "pdf" }],
      },
      { name: "transport", reachedAt: null, documents: [] },
      { name: "montaz", reachedAt: null, documents: [] },
      { name: "odbior", reachedAt: null, documents: [] },
      { name: "gwarancja", reachedAt: null, documents: [] },
    ],
  },
  {
    projectId: "prj-steelhouse-alpine-104",
    currentStage: "gwarancja",
    stages: [
      {
        name: "produkcja",
        reachedAt: "2026-02-10",
        documents: [{ name: "Protokół zejścia z linii produkcyjnej.pdf", type: "pdf" }],
      },
      {
        name: "transport",
        reachedAt: "2026-03-02",
        documents: [{ name: "List przewozowy CMR.pdf", type: "pdf" }],
      },
      {
        name: "montaz",
        reachedAt: "2026-03-18",
        documents: [{ name: "Protokół montażu.pdf", type: "pdf" }],
      },
      {
        name: "odbior",
        reachedAt: "2026-03-25",
        documents: [
          { name: "Protokół odbioru końcowego.pdf", type: "pdf" },
          { name: "Zdjęcia gotowego domu.jpg", type: "image" },
        ],
      },
      {
        name: "gwarancja",
        reachedAt: "2026-03-25",
        documents: [{ name: "Karta gwarancyjna.pdf", type: "pdf" }],
      },
    ],
  },
];
