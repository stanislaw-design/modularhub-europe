const STORAGE_KEY = "producent:weryfikacja-firmy:zlozone";

// Świadomie globalny (bez NIP producenta) — ten sam precedens co lib/gap-closure.ts.
function loadSubmittedProjectIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function isVerificationSubmitted(projectId: string): boolean {
  return loadSubmittedProjectIds().includes(projectId);
}

export function markVerificationSubmitted(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    const submitted = loadSubmittedProjectIds();
    if (submitted.includes(projectId)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...submitted, projectId]));
  } catch {
    // fail soft — pomiń tę jedną aktualizację
  }
}
