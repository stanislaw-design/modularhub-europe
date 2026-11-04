"use server";

import { auth } from "@/auth";
import {
  confirmEntryAttachment as confirmEntryAttachmentDomain,
  deleteEntryAttachment as deleteEntryAttachmentDomain,
  requestEntryAttachmentUpload as requestEntryAttachmentUploadDomain,
} from "@/lib/conversations/attachments";
import {
  archivePartner as archivePartnerDomain,
  closeThread as closeThreadDomain,
  createContact as createContactDomain,
  createEntry as createEntryDomain,
  createPartner as createPartnerDomain,
  createQuickEntry as createQuickEntryDomain,
  createTask as createTaskDomain,
  createThread as createThreadDomain,
  deleteContact as deleteContactDomain,
  findSimilarPartners as findSimilarPartnersDomain,
  isActiveAdmin,
  linkPartnerProducer as linkPartnerProducerDomain,
  unlinkPartnerProducer as unlinkPartnerProducerDomain,
  reopenThread as reopenThreadDomain,
  restorePartner as restorePartnerDomain,
  setTaskStatus as setTaskStatusDomain,
  deleteEntry as deleteEntryDomain,
  updateContact as updateContactDomain,
  updateEntry as updateEntryDomain,
  updateThread as updateThreadDomain,
  updatePartner as updatePartnerDomain,
  updateTask as updateTaskDomain,
  type Actor,
  type Result,
  type SimilarPartner,
} from "@/lib/conversations/mutations";
import { isLinkKind, searchPlatformRecords, type PlatformRecordOption } from "@/lib/conversations/platform-links";
import { suggestProducersForPartner, type ProducerSuggestion } from "@/lib/conversations/queries";
import type { TaskStatus } from "@/lib/conversations/constants";
import type {
  AttachmentDeclaration,
  CloseThreadDecisions,
  ContactInput,
  EntryInput,
  PartnerInput,
  QuickEntryInput,
  TaskInput,
  ThreadInput,
} from "@/lib/conversations/schemas";
import { captureError } from "@/lib/observability";

// Cienka warstwa akcji notatnika rozmów (spec 0080 AC-1, AC-21): bramka roli `admin`, autor z sesji,
// wywołanie funkcji domenowej z lib/conversations. Żadnej logiki biznesowej tutaj. Dane z formularza
// przychodzą jako surowe wartości; walidacja Zod odbywa się w funkcji domenowej, więc rzutowanie
// na typ wyjściowy schematu jest bezpieczne.

const DENIED: Result = { ok: false, error: "Musisz być zalogowany jako administrator." };
const GENERIC: Result = { ok: false, error: "Nie udało się zapisać zmiany. Spróbuj ponownie." };

async function adminActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  // Rola w sesji mogła zostać cofnięta, a sesja jeszcze nie wygasła.
  if (!(await isActiveAdmin(session.user.id))) return null;
  return { userId: session.user.id, source: "web" };
}

async function run<T extends object>(
  path: string,
  fn: (actor: Actor) => Promise<Result<T>>,
): Promise<Result<T>> {
  const actor = await adminActor();
  if (!actor) return DENIED as Result<T>;
  try {
    return await fn(actor);
  } catch (error) {
    captureError(error, { path: `conversations:${path}` });
    return GENERIC as Result<T>;
  }
}

export async function findSimilarPartnersAction(name: string): Promise<Result<{ similar: SimilarPartner[] }>> {
  return run("findSimilarPartners", async () => ({ ok: true as const, similar: await findSimilarPartnersDomain(String(name ?? ""), undefined) }));
}

export async function createPartnerAction(input: PartnerInput) {
  return run("createPartner", (actor) => createPartnerDomain(actor, input));
}

export async function updatePartnerAction(partnerId: string, input: PartnerInput) {
  return run("updatePartner", (actor) => updatePartnerDomain(actor, partnerId, input));
}

export async function archivePartnerAction(partnerId: string) {
  return run("archivePartner", (actor) => archivePartnerDomain(actor, partnerId));
}

export async function restorePartnerAction(partnerId: string) {
  return run("restorePartner", (actor) => restorePartnerDomain(actor, partnerId));
}

export async function createContactAction(partnerId: string, input: ContactInput) {
  return run("createContact", (actor) => createContactDomain(actor, partnerId, input));
}

export async function updateContactAction(partnerId: string, contactId: string, input: ContactInput) {
  return run("updateContact", (actor) => updateContactDomain(actor, partnerId, contactId, input));
}

export async function deleteContactAction(partnerId: string, contactId: string) {
  return run("deleteContact", (actor) => deleteContactDomain(actor, partnerId, contactId));
}

export async function createThreadAction(partnerId: string, input: ThreadInput) {
  return run("createThread", (actor) => createThreadDomain(actor, partnerId, input));
}

export async function closeThreadAction(threadId: string, decisions: CloseThreadDecisions) {
  return run("closeThread", (actor) => closeThreadDomain(actor, threadId, decisions));
}

export async function reopenThreadAction(threadId: string) {
  return run("reopenThread", (actor) => reopenThreadDomain(actor, threadId));
}

export async function createEntryAction(partnerId: string, input: EntryInput) {
  return run("createEntry", (actor) => createEntryDomain(actor, partnerId, input));
}

export async function updateEntryAction(entryId: string, input: EntryInput) {
  return run("updateEntry", (actor) => updateEntryDomain(actor, entryId, input));
}

export async function deleteEntryAction(entryId: string) {
  return run("deleteEntry", (actor) => deleteEntryDomain(actor, entryId));
}

export async function updateThreadAction(threadId: string, input: Pick<ThreadInput, "title" | "ownerUserId" | "link">) {
  return run("updateThread", (actor) => updateThreadDomain(actor, threadId, input));
}

export async function createTaskAction(partnerId: string, input: TaskInput) {
  return run("createTask", (actor) => createTaskDomain(actor, partnerId, input));
}

export async function updateTaskAction(taskId: string, input: Omit<TaskInput, "threadId">) {
  return run("updateTask", (actor) => updateTaskDomain(actor, taskId, input));
}

export async function setTaskStatusAction(taskId: string, status: TaskStatus) {
  return run("setTaskStatus", (actor) => setTaskStatusDomain(actor, taskId, status));
}

export async function createQuickEntryAction(input: QuickEntryInput) {
  return run("createQuickEntry", (actor) => createQuickEntryDomain(actor, input));
}

export async function requestEntryAttachmentUploadAction(entryId: string, declaration: AttachmentDeclaration) {
  return run("requestEntryAttachmentUpload", (actor) => requestEntryAttachmentUploadDomain(actor, entryId, declaration));
}

export async function confirmEntryAttachmentAction(entryId: string, key: string, declaration: AttachmentDeclaration) {
  return run("confirmEntryAttachment", (actor) => confirmEntryAttachmentDomain(actor, entryId, key, declaration));
}

export async function deleteEntryAttachmentAction(attachmentId: string) {
  return run("deleteEntryAttachment", (actor) => deleteEntryAttachmentDomain(actor, attachmentId));
}

// Wyszukiwanie rekordu platformy do podlinkowania (AC-18). Tylko odczyt.
export async function searchPlatformRecordsAction(kind: string, query: string): Promise<Result<{ options: PlatformRecordOption[] }>> {
  return run("searchPlatformRecords", async (): Promise<Result<{ options: PlatformRecordOption[] }>> => {
    const requested = String(kind);
    if (!isLinkKind(requested)) return { ok: false, error: "Nieznany rodzaj rekordu" };
    return { ok: true, options: await searchPlatformRecords(requested, String(query ?? "")) };
  });
}

export async function suggestProducersAction(partnerId: string, query: string): Promise<Result<{ suggestions: ProducerSuggestion[] }>> {
  return run("suggestProducers", async () => ({
    ok: true as const,
    suggestions: await suggestProducersForPartner(String(partnerId), String(query ?? "")),
  }));
}

export async function linkPartnerProducerAction(partnerId: string, producerId: string) {
  return run("linkPartnerProducer", (actor) => linkPartnerProducerDomain(actor, partnerId, producerId));
}

export async function unlinkPartnerProducerAction(partnerId: string) {
  return run("unlinkPartnerProducer", (actor) => unlinkPartnerProducerDomain(actor, partnerId));
}
