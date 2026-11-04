import { addDaysToDate } from "./time";

// Szablony spraw (spec 0080): stałe w kodzie, nowy szablon to zmiana pliku i wdrożenie.
// `side: "us"` trafia do właściciela sprawy, `"external"` to zadanie strony zewnętrznej.

export interface CaseTemplateTask {
  title: string;
  dueOffsetDays: number;
  side: "us" | "external";
}

export interface CaseTemplate {
  key: string;
  name: string;
  tasks: CaseTemplateTask[];
}

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    key: "rfq",
    name: "Zapytanie ofertowe",
    tasks: [
      { title: "Wysłać zapytanie", dueOffsetDays: 0, side: "us" },
      { title: "Odpowiedź z wyceną", dueOffsetDays: 5, side: "external" },
      { title: "Sprawdzić odpowiedź i wrócić z pytaniami", dueOffsetDays: 7, side: "us" },
    ],
  },
  {
    key: "catalog-import",
    name: "Import katalogu producenta",
    tasks: [
      { title: "Materiały i specyfikacje od producenta", dueOffsetDays: 7, side: "external" },
      { title: "Potwierdzić prawa do zdjęć", dueOffsetDays: 7, side: "us" },
      { title: "Zaimportować do bazy deweloperskiej", dueOffsetDays: 10, side: "us" },
      { title: "Producent sprawdza dane", dueOffsetDays: 14, side: "external" },
      { title: "Publikacja na produkcji", dueOffsetDays: 16, side: "us" },
    ],
  },
  {
    key: "terms",
    name: "Umowa i warunki",
    tasks: [
      { title: "Przygotować warunki", dueOffsetDays: 0, side: "us" },
      { title: "Akceptacja producenta", dueOffsetDays: 7, side: "external" },
      { title: "Podpisanie", dueOffsetDays: 10, side: "us" },
    ],
  },
];

export function getCaseTemplate(key: string): CaseTemplate | null {
  return CASE_TEMPLATES.find((template) => template.key === key) ?? null;
}

export interface TemplateTaskDraft {
  title: string;
  dueDate: string;
  assigneeKind: "user" | "external";
  assigneeUserId: string | null;
}

/** Zadania z szablonu z terminami liczonymi od dnia utworzenia sprawy (`today` w Europe/Warsaw). */
export function buildTemplateTasks(template: CaseTemplate, today: string, ownerUserId: string): TemplateTaskDraft[] {
  return template.tasks.map((task) => ({
    title: task.title,
    dueDate: addDaysToDate(today, task.dueOffsetDays),
    assigneeKind: task.side === "us" ? "user" : "external",
    assigneeUserId: task.side === "us" ? ownerUserId : null,
  }));
}
