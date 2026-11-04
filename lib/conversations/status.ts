import type { ThreadStatus } from "./constants";

// Status sprawy nie jest zapisany, tylko wyliczany przy odczycie (spec 0080 AC-11).
// Pierwszeństwo: zamknięta, czekamy na nas, czekamy na nich, otwarta.

export interface ThreadStatusInput {
  closedAt: Date | string | null;
  openUserTasks: number;
  openExternalTasks: number;
}

export function computeThreadStatus(input: ThreadStatusInput): ThreadStatus {
  if (input.closedAt) return "closed";
  if (input.openUserTasks > 0) return "waiting_us";
  if (input.openExternalTasks > 0) return "waiting_them";
  return "open";
}

export interface DigestTaskLike {
  assigneeKind: "user" | "external";
  assigneeUserId: string | null;
  threadOwnerUserId: string | null;
  createdBy: string;
}

/**
 * Do kogo należy zadanie według reguły "moje" (AC-15): zadanie administratora do osoby
 * przypisanej, zadanie zewnętrzne do właściciela sprawy, a bez sprawy do jego autora.
 */
export function taskOwnerUserId(task: DigestTaskLike): string {
  if (task.assigneeKind === "user") return task.assigneeUserId ?? task.createdBy;
  return task.threadOwnerUserId ?? task.createdBy;
}

export type TodaySection = "toDo" | "waitingThem" | "noDueDate";

export interface TodayTaskLike {
  assigneeKind: "user" | "external";
  dueDate: string | null;
}

/** Pierwsza pasująca sekcja ekranu "Najbliższe" (AC-15), albo null, gdy zadanie nie pasuje do żadnej. */
export function classifyTodayTask(task: TodayTaskLike): TodaySection | null {
  if (task.assigneeKind === "user" && task.dueDate !== null) return "toDo";
  if (task.assigneeKind === "external" && task.dueDate !== null) return "waitingThem";
  if (task.dueDate === null) return "noDueDate";
  return null;
}

/** Normalizacja nazwy do porównań duplikatów (AC-5): wielkość liter i spacje. */
export function normalizePartnerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

const MIN_CONTAINS_LENGTH = 4;

export function partnerNamesSimilar(a: string, b: string): boolean {
  const left = normalizePartnerName(a);
  const right = normalizePartnerName(b);
  if (left === right) return true;
  if (left.length < MIN_CONTAINS_LENGTH || right.length < MIN_CONTAINS_LENGTH) return false;
  return left.includes(right) || right.includes(left);
}
