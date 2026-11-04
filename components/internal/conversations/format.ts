import { CRM_TIME_ZONE } from "@/lib/conversations/constants";

const dateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: CRM_TIME_ZONE });
const dateOnly = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "UTC" });

export function formatDateTime(value: Date | string): string {
  return dateTime.format(new Date(value));
}

/** Termin zadania to zwykła data `YYYY-MM-DD`, bez przeliczania strefy. */
export function formatDueDate(value: string): string {
  return dateOnly.format(new Date(`${value}T00:00:00Z`));
}
