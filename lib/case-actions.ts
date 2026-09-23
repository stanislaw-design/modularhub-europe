"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import type {
  AnswerCardInput,
  AssessReadinessInput,
  CaseMessageDto,
  SendMessageInput,
  SubmitAdvisoryInquiryInput,
  UpsertCaseFieldInput,
} from "@/lib/case-schemas";
import {
  answerCardSchema,
  assessReadinessSchema,
  sendMessageSchema,
  submitAdvisoryInquirySchema,
  upsertCaseFieldSchema,
} from "@/lib/case-schemas";
import { requireCaseAccess } from "@/lib/cases/access";
import { getCaseActor } from "@/lib/cases/actor";
import { answerCard as answerCardData, assessReadiness as assessReadinessData, upsertCaseField as upsertCaseFieldData } from "@/lib/cases/cards";
import { systemClock } from "@/lib/cases/clock";
import { createAdvisoryCase } from "@/lib/cases/create";
import { postMessage, touchChannel } from "@/lib/cases/messaging";
import { notifyAdvisorOfNewCase, notifyMessageRecipient } from "@/lib/cases/notify";
import { getCountries } from "@/lib/data/countries";
import { getPublishedProductIds } from "@/lib/data/projects";
import { db } from "@/lib/db/client";
import { getClientIdForUser } from "@/lib/db/queries";
import { inquiry } from "@/lib/db/schema";
import { routing } from "@/lib/i18n/routing";
import { captureError, trackEvent } from "@/lib/observability";

// Server Actions sprawy doradczej (spec 0048). Każda zaczyna od sesji i
// wspólnej funkcji dostępu, żadna nie ufa identyfikatorowi podanemu przez
// klienta. Zegar to zawsze systemClock: nie jest argumentem akcji, bo
// argumenty Server Action pochodzą z przeglądarki.

export interface SubmitAdvisoryInquiryResult {
  ok: boolean;
  inquiryId?: string;
  error?: "auth" | "invalid" | "no_client" | "unsupported_country" | "generic";
}

function isKnownLocale(locale: string): boolean {
  return (routing.locales as readonly string[]).includes(locale);
}

export async function submitAdvisoryInquiry(input: SubmitAdvisoryInquiryInput): Promise<SubmitAdvisoryInquiryResult> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "auth" };
  }

  const parsed = submitAdvisoryInquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (!isKnownLocale(data.locale)) return { ok: false, error: "invalid" };

  const [countries, knownIds, clientId] = await Promise.all([
    getCountries(),
    getPublishedProductIds(),
    getClientIdForUser(session.user.id),
  ]);
  if (!clientId) return { ok: false, error: "no_client" };

  const countryCode = data.plot.countryCode.toUpperCase();
  if (!countries.some((country) => country.code === countryCode)) return { ok: false, error: "unsupported_country" };

  const projectIds = [...new Set(data.projectIds)];
  if (projectIds.length > 3 || projectIds.some((id) => !knownIds.has(id))) return { ok: false, error: "invalid" };

  try {
    const t = await getTranslations({ locale: data.locale, namespace: "CaseSystem" });
    const result = await createAdvisoryCase(
      {
        clientId,
        contact: {
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          phone: session.user.phone ?? "",
        },
        projectIds,
        plot: { ...data.plot, countryCode },
        message: data.message ? data.message : null,
        idempotencyKey: data.idempotencyKey,
        locale: data.locale,
        systemNoticeBody: t("caseReceived"),
      },
      systemClock,
    );

    if (result.created) {
      trackEvent("case_created", { homeCount: projectIds.length, countryCode }, session.user.id);
      after(() => notifyAdvisorOfNewCase(result.inquiryId));
    }
    return { ok: true, inquiryId: result.inquiryId };
  } catch (error) {
    captureError(error, { path: "submitAdvisoryInquiry", userId: session.user.id });
    return { ok: false, error: "generic" };
  }
}

export interface SendMessageResult {
  ok: boolean;
  message?: CaseMessageDto;
  error?: "invalid" | "forbidden" | "generic";
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success || !isKnownLocale(parsed.data.locale)) return { ok: false, error: "invalid" };

  const actor = await getCaseActor();
  if (!actor) return { ok: false, error: "forbidden" };

  try {
    const result = await postMessage(actor, parsed.data, systemClock);
    if (!result.ok) return { ok: false, error: "forbidden" };

    if (result.created) {
      if (result.firstAdvisorReply) trackEvent("case_first_advisor_reply", {}, actor.userId);
      after(() =>
        notifyMessageRecipient({
          inquiryId: result.inquiryId,
          channelId: parsed.data.channelId,
          authorKind: actor.kind,
          locale: parsed.data.locale,
          clock: systemClock,
        }),
      );
    }
    return { ok: true, message: result.message };
  } catch (error) {
    captureError(error, { path: "sendMessage", userId: actor.userId });
    return { ok: false, error: "generic" };
  }
}

export async function markChannelRead(inquiryId: string, channelId: string): Promise<{ ok: boolean }> {
  const actor = await getCaseActor();
  if (!actor) return { ok: false };
  const access = await requireCaseAccess(actor, inquiryId, channelId);
  if (!access) return { ok: false };
  await touchChannel(channelId, actor.userId, systemClock, { read: true });
  return { ok: true };
}

// Doradca przejmuje sprawę (AC-30: przypisanie doradcy). Zmiana na innego
// doradcę jest osobnym krokiem kolejki (krok 13 planu).
export async function assignAdvisorToSelf(inquiryId: string): Promise<{ ok: boolean }> {
  const actor = await getCaseActor();
  if (!actor || actor.kind !== "advisor") return { ok: false };
  const access = await requireCaseAccess(actor, inquiryId);
  if (!access) return { ok: false };
  await db.update(inquiry).set({ assignedAdvisorId: actor.userId }).where(eq(inquiry.id, inquiryId));
  return { ok: true };
}

export interface AnswerCardResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "generic";
}

// Odpowiedź klienta na kartę, systemową (AC-38) albo od doradcy (AC-7).
export async function answerCard(input: AnswerCardInput): Promise<AnswerCardResult> {
  const parsed = answerCardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const actor = await getCaseActor();
  if (!actor) return { ok: false, error: "forbidden" };

  try {
    const result = await answerCardData(actor, parsed.data, systemClock);
    if (!result.ok) return { ok: false, error: result.reason };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "answerCard", userId: actor.userId });
    return { ok: false, error: "generic" };
  }
}

export interface UpsertCaseFieldResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "generic";
}

// Doradca prowadzi lub poprawia podsumowanie potrzeb (AC-12).
export async function upsertCaseField(input: UpsertCaseFieldInput): Promise<UpsertCaseFieldResult> {
  const parsed = upsertCaseFieldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const actor = await getCaseActor();
  if (!actor) return { ok: false, error: "forbidden" };

  try {
    const result = await upsertCaseFieldData(actor, parsed.data, systemClock);
    if (!result.ok) return { ok: false, error: result.reason };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "upsertCaseField", userId: actor.userId });
    return { ok: false, error: "generic" };
  }
}

export interface AssessReadinessResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "generic";
}

// Ocena gotowości (AC-13): każdy wynik wymaga wiadomości z wyjaśnieniem dla
// klienta, którą ta akcja wysyła w tej samej operacji co zmianę sprawy.
export async function assessReadiness(input: AssessReadinessInput): Promise<AssessReadinessResult> {
  const parsed = assessReadinessSchema.safeParse(input);
  if (!parsed.success || !isKnownLocale(parsed.data.locale)) return { ok: false, error: "invalid" };

  const actor = await getCaseActor();
  if (!actor) return { ok: false, error: "forbidden" };

  try {
    const result = await assessReadinessData(actor, parsed.data, systemClock);
    if (!result.ok) return { ok: false, error: result.reason };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "assessReadiness", userId: actor.userId });
    return { ok: false, error: "generic" };
  }
}
