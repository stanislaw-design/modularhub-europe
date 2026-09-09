import type { ProducerInquiry } from "../types";

// One row per incoming client inquiry (feature 15). Not tied to the client's
// own zapytanie flow (lib/inquiry.ts persists nothing across screens in this
// Facade stage), same standalone mock convention as export-readiness/gap
// closure fixtures.
export const producerInquiries: ProducerInquiry[] = [
  {
    id: "inq-001",
    projectId: "prj-budman-familia-90",
    clientName: "Anna Kowalska",
    clientEmail: "anna.kowalska@example.com",
    clientPhone: "+48 601 234 567",
    deliveryCountry: "PL",
    receivedAt: "2026-07-28",
  },
  {
    id: "inq-002",
    projectId: "prj-steelhouse-loft-120",
    clientName: "Jonas Becker",
    clientEmail: "jonas.becker@example.de",
    clientPhone: "+49 151 2233 4455",
    deliveryCountry: "DE",
    receivedAt: "2026-08-02",
  },
  {
    id: "inq-003",
    projectId: "prj-budman-ridge-72",
    clientName: "Sanne de Vries",
    clientEmail: "sanne.devries@example.nl",
    clientPhone: "+31 6 1234 5678",
    deliveryCountry: "NL",
    receivedAt: "2026-08-09",
  },
  {
    id: "inq-004",
    projectId: "prj-budman-kompakt-56",
    clientName: "Piotr Zieliński",
    clientEmail: "piotr.zielinski@example.com",
    clientPhone: "+48 602 345 678",
    deliveryCountry: "PL",
    receivedAt: "2026-08-12",
  },
];
