"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import {
  ALL_PROJECT_TRANSLATION_LOCALES,
  generateProjectItemTranslations,
  type ProductTranslationLocale,
  type ProjectTranslationItem,
} from "@/lib/ai/product-translation";
import { db } from "@/lib/db/client";
import { getProducerIdForUser } from "@/lib/db/queries";
import { product } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { clientRequirementsSchema } from "@/lib/product-client-requirements";
import { faqSchema } from "@/lib/product-faq";
import { roomLayoutSchema } from "@/lib/product-room-layout";

// Etap "Tłumaczenia" (spec 0050 AC-28 do AC-30, AC-34): jedno synchroniczne
// wywołanie Azure OpenAI tłumaczące zatwierdzoną, już zapisaną treść produktu
// (description, roomLayout, faq, własne pozycje "Co musi zapewnić klient") na
// wybrane języki naraz. Zawsze czyta z bazy przez productId (ten sam wzorzec
// co recognizeRoomLayout/extractStandardsFromMaterial), nigdy z lokalnego
// stanu formularza przeglądarki — do tego kroku producent dociera dopiero po
// zapisaniu wcześniejszych kroków (WIZARD_STEPS kolejność, każdy "Dalej"
// zapisuje). Wynik nigdy nie zapisuje się sam z siebie (Kluczowe niezmienniki
// spec 0050): zwraca tylko propozycję do przeglądu, zapis idzie normalną
// ścieżką kroku (buildProducerSavePayload dla
// description/roomLayout/faq/clientRequirements). Warianty (scopeSummary/
// excludedScope) usunięte z zakresu tego kroku (spec 0051 AC-10): co wchodzi
// w cenę tłumaczy się dziś przez niezależny słownik
// cost_line_item_label_translation, nie przez ten mechanizm.

const DENIED_ERROR = "Nie masz uprawnień do tego produktu.";
const PRODUCT_NOT_FOUND_ERROR = "Nie znaleziono produktu.";
const GENERATION_ERROR = "Generowanie tłumaczeń nie powiodło się. Spróbuj ponownie albo popraw tłumaczenia ręcznie.";

interface TranslationActor {
  userId: string;
  role: "admin" | "producer";
}

async function requireTranslationActor(): Promise<TranslationActor | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "admin" && session.user.role !== "producer") return null;
  return { userId: session.user.id, role: session.user.role };
}

type ProductOwnership = "ok" | "not_found" | "denied";

// Mirror lib/producer-room-layout-actions.ts#resolveProductOwnership (nie
// eksportowana stamtąd, więc duplikat tego samego, krótkiego wzorca — patrz
// spec 0050 Kluczowe niezmienniki).
async function resolveProductOwnership(actor: TranslationActor, productId: string): Promise<ProductOwnership> {
  const [row] = await db.select({ id: product.id, producerId: product.producerId }).from(product).where(eq(product.id, productId));
  if (!row) return "not_found";
  if (actor.role === "admin") return "ok";
  const producerId = await getProducerIdForUser(actor.userId);
  return producerId === row.producerId ? "ok" : "denied";
}

type LocaleText = Partial<Record<ProductTranslationLocale, string>>;

export interface ProjectTranslationRoomDraft {
  id: string;
  sourceName: string;
  name: LocaleText;
}

export interface ProjectTranslationFaqDraft {
  id: string;
  sourceQuestion: string;
  sourceAnswer: string;
  question: LocaleText;
  answer: LocaleText;
}

export interface ProjectTranslationRequirementDraft {
  id: string;
  sourceLabel: string;
  label: LocaleText;
}

export interface ProjectTranslationDraft {
  locales: ProductTranslationLocale[];
  sourceDescription: string;
  description: LocaleText;
  roomLayout: ProjectTranslationRoomDraft[];
  faq: ProjectTranslationFaqDraft[];
  clientRequirements: ProjectTranslationRequirementDraft[];
}

export interface GenerateProjectTranslationsResult {
  ok: boolean;
  draft?: ProjectTranslationDraft;
  error?: string;
}

// AC-34: locales domyślnie wszystkie trzy; wywołujący może poprosić o jeden
// (regeneracja pojedynczego języka bez powtarzania całego etapu) — wynik dla
// pominiętych języków po prostu nie jest w draft, UI scala go z tym, co już
// miał lokalnie dla pozostałych.
export async function generateProjectTranslations(
  productId: string,
  locales: readonly ProductTranslationLocale[] = ALL_PROJECT_TRANSLATION_LOCALES,
): Promise<GenerateProjectTranslationsResult> {
  const actor = await requireTranslationActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };
  if (locales.length === 0) return { ok: false, error: "Wybierz co najmniej jeden język." };

  const [productRow] = await db
    .select({
      description: product.description,
      roomLayout: product.roomLayout,
      faq: product.faq,
      clientRequirements: product.clientRequirements,
    })
    .from(product)
    .where(eq(product.id, productId));
  if (!productRow) return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };

  const roomLayoutResult = roomLayoutSchema.safeParse(productRow.roomLayout ?? []);
  const roomLayout = roomLayoutResult.success ? roomLayoutResult.data : [];
  const faqResult = faqSchema.safeParse(productRow.faq ?? []);
  const faq = faqResult.success ? faqResult.data : [];
  const clientRequirementsResult = clientRequirementsSchema.safeParse(productRow.clientRequirements ?? []);
  // AC-28: tylko własne pozycje (custom: true) — katalogowe tłumaczą się z
  // katalogu opcji, nigdy stąd (patrz lib/product-client-requirements.ts).
  const customRequirements = (clientRequirementsResult.success ? clientRequirementsResult.data : []).filter(
    (row) => row.custom,
  );
  const description = productRow.description?.trim() ?? "";

  const items: ProjectTranslationItem[] = [];
  if (description) items.push({ id: "description", text: description });
  for (const room of roomLayout) items.push({ id: `room:${room.id}`, text: room.name });
  for (const entry of faq) {
    items.push({ id: `faq:${entry.id}:question`, text: entry.question });
    items.push({ id: `faq:${entry.id}:answer`, text: entry.answer });
  }
  for (const requirement of customRequirements) items.push({ id: `requirement:${requirement.id}`, text: requirement.label });

  let result: Awaited<ReturnType<typeof generateProjectItemTranslations>> = {};
  if (items.length > 0) {
    try {
      result = await generateProjectItemTranslations(items, locales);
    } catch (error) {
      captureError(error, { path: "generateProjectTranslations" });
      return { ok: false, error: GENERATION_ERROR };
    }
  }

  function pick(id: string): LocaleText {
    return result[id] ?? {};
  }

  const draft: ProjectTranslationDraft = {
    locales: [...locales],
    sourceDescription: description,
    description: description ? pick("description") : {},
    roomLayout: roomLayout.map((room) => ({ id: room.id, sourceName: room.name, name: pick(`room:${room.id}`) })),
    faq: faq.map((entry) => ({
      id: entry.id,
      sourceQuestion: entry.question,
      sourceAnswer: entry.answer,
      question: pick(`faq:${entry.id}:question`),
      answer: pick(`faq:${entry.id}:answer`),
    })),
    clientRequirements: customRequirements.map((requirement) => ({
      id: requirement.id,
      sourceLabel: requirement.label,
      label: pick(`requirement:${requirement.id}`),
    })),
  };

  return { ok: true, draft };
}
