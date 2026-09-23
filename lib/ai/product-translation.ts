import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getAzureAiConfig } from "@/lib/ai/azure-config";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import { createAzureOpenAiClient } from "@/lib/ai/openai";

// Jedno wywołanie Azure OpenAI tłumaczące nazwę/opis produktu na wybrane
// języki naraz (spec 0028 AC-11, Feature design, Build plan zadanie 21),
// reużywające dokładnie ten sam klient/wzorzec strukturyzowanego wyjścia co
// lib/ai/house-project-extraction.ts. Orkiestracja (kiedy wołać, co zapisać,
// reguła własności per pole) żyje w lib/producer-product-actions.ts, nie tu —
// ten moduł nie zna nic o product_translation ani o bazie danych.

export type ProductTranslationLocale = "en" | "nl" | "de";
export type ProductTranslationField = "name" | "description";

// Żyje tu (nie w lib/producer-project-translation-actions.ts) bo plik
// "use server" może eksportować tylko async funkcje — stała eksportowana
// stamtąd wysadza wszystkie server actions w module (Next.js "A 'use server'
// file can only export async functions").
export const ALL_PROJECT_TRANSLATION_LOCALES: readonly ProductTranslationLocale[] = ["en", "nl", "de"];

const LOCALE_LABELS: Record<ProductTranslationLocale, string> = {
  en: "English",
  nl: "Dutch (formal register: u/uw, not je/jouw)",
  de: "German (formal register: Sie/Ihr, not du/dein)",
};

export interface GenerateProductTranslationsInput {
  // Polski tekst źródłowy (product.name/description). null gdy pole jest
  // jeszcze puste w kreatorze — wywołujący (orkiestracja) nie powinien wtedy
  // w ogóle prosić o to pole, patrz komentarz przy fields niżej.
  name: string | null;
  description: string | null;
  locales: readonly ProductTranslationLocale[];
  // Tylko pola, dla których name/description faktycznie ma treść do
  // przetłumaczenia — wywołujący filtruje to przed wywołaniem tej funkcji.
  fields: readonly ProductTranslationField[];
}

export type ProductTranslationResult = Partial<
  Record<ProductTranslationField, Partial<Record<ProductTranslationLocale, string>>>
>;

function buildResponseSchema(
  locales: readonly ProductTranslationLocale[],
  fields: readonly ProductTranslationField[],
) {
  const localeShape = Object.fromEntries(
    locales.map((locale) => [locale, z.string().min(1)]),
  ) as Record<ProductTranslationLocale, z.ZodString>;
  const fieldShape = Object.fromEntries(
    fields.map((field) => [field, z.object(localeShape).strict()]),
  ) as Record<ProductTranslationField, z.ZodObject<Record<ProductTranslationLocale, z.ZodString>>>;
  return z.object(fieldShape).strict();
}

function translationInstructions(
  locales: readonly ProductTranslationLocale[],
  fields: readonly ProductTranslationField[],
): string {
  const localeList = locales.map((locale) => `${locale} (${LOCALE_LABELS[locale]})`).join(", ");
  const fieldList = fields
    .map((field) => (field === "name" ? "the product name" : "the product description"))
    .join(" and ");
  return [
    "You translate marketing copy for prefabricated/modular house listings from Polish into the requested languages.",
    `Translate ${fieldList} into: ${localeList}.`,
    "Keep the same meaning, tone, and level of technical detail as the Polish source; do not invent facts, dimensions, or claims that are not in the source text.",
    "Use plain text only, no markdown, no quotation marks around the whole value.",
    "For Dutch and German, use the formal register consistently (u/uw for Dutch, Sie/Ihr for German), matching this platform's established brand tone.",
    "Return every requested field/language combination; never leave one empty.",
  ].join(" ");
}

function translationInput(input: GenerateProductTranslationsInput, fields: readonly ProductTranslationField[]): string {
  const parts: string[] = [];
  if (fields.includes("name") && input.name) parts.push(`Product name (Polish source):\n${input.name}`);
  if (fields.includes("description") && input.description) {
    parts.push(`Product description (Polish source):\n${input.description}`);
  }
  return parts.join("\n\n");
}

// Etap "Tłumaczenia" (spec 0050 AC-28 do AC-34): jedno wywołanie tłumaczy
// dowolny worek pozycji tekstowych naraz (opis, nazwy pomieszczeń, pytania i
// odpowiedzi FAQ, własne pozycje "Co musi zapewnić klient", opis/wyłączenia
// wariantu) — w odróżnieniu od generateProductTranslations wyżej (stałe pola
// "name"/"description", zawsze polskie źródło), tu źródło może już być w
// dowolnym z czterech języków (np. nazwa pomieszczenia wydobyta z rzutu innym
// niż polski, AC-9/Kontekst) i jest wykrywane per pozycja, nie zakładane z
// góry. Orkiestracja (co wysłać, gdzie zapisać wynik, kiedy nadpisać) żyje w
// lib/producer-project-translation-actions.ts, nie tu.
export interface ProjectTranslationItem {
  // Stabilny klucz pozycji w tym wywołaniu (np. "description",
  // "room:<id>", "faq:<id>:question", "requirement:<id>", "variant:<id>:scopeSummary") —
  // wywołujący dopasowuje wynik z powrotem po tym samym kluczu.
  id: string;
  text: string;
}

export type ProjectTranslationResult = Record<string, Partial<Record<ProductTranslationLocale, string>>>;

const PROJECT_TRANSLATION_INSTRUCTIONS = [
  "You translate short marketing and technical copy for prefabricated/modular house listings, one item at a time.",
  "Each item's source text may already be written in Polish, English, German, or Dutch — detect the actual language of each item independently; do not assume Polish.",
  "Translate every item into every requested target language. If an item's detected source language already equals a requested target language, return that item's original text unchanged for that language.",
  "Keep the same meaning, tone, and level of technical detail as the source; do not invent facts, dimensions, or claims that are not in the source text.",
  "Use plain text only, no markdown, no quotation marks around the whole value.",
  "For Dutch and German, use the formal register consistently (u/uw for Dutch, Sie/Ihr for German), matching this platform's established brand tone.",
  "Return every requested item id and every requested target language for it; never omit one.",
].join(" ");

function buildProjectTranslationResponseSchema(
  items: readonly ProjectTranslationItem[],
  locales: readonly ProductTranslationLocale[],
) {
  const localeShape = Object.fromEntries(locales.map((locale) => [locale, z.string().min(1)])) as Record<
    ProductTranslationLocale,
    z.ZodString
  >;
  const itemShape = Object.fromEntries(items.map((item) => [item.id, z.object(localeShape).strict()]));
  return z.object(itemShape).strict();
}

// max_output_tokens skaluje się z liczbą pozycji × języków (jak przy stałych
// polach wyżej, tylko tu worek jest dynamiczny) — dolny/górny limit chronią
// przed zerowym/absurdalnie wysokim budżetem przy skrajnie małym/dużym worku.
function estimateProjectTranslationMaxOutputTokens(
  items: readonly ProjectTranslationItem[],
  locales: readonly ProductTranslationLocale[],
): number {
  return Math.min(16_000, Math.max(2_000, items.length * locales.length * 150));
}

// AC-29: synchroniczne, jak generateProductTranslations wyżej — wywołujący
// (server action) czeka w tym samym żądaniu, bez sesji/kolejki/workera.
export async function generateProjectItemTranslations(
  items: readonly ProjectTranslationItem[],
  locales: readonly ProductTranslationLocale[],
  options: { client?: OpenAI } = {},
): Promise<ProjectTranslationResult> {
  if (items.length === 0 || locales.length === 0) return {};

  const client = options.client ?? createAzureOpenAiClient();
  const retryingClient = client.withOptions({ maxRetries: 2 });
  const { openAiDeployment } = getAzureAiConfig();
  const schema = buildProjectTranslationResponseSchema(items, locales);

  try {
    const response = await retryingClient.responses.parse({
      model: openAiDeployment,
      instructions: PROJECT_TRANSLATION_INSTRUCTIONS,
      input: items.map((item) => `[${item.id}]\n${item.text}`).join("\n\n"),
      reasoning: { effort: "minimal" },
      text: { format: zodTextFormat(schema, "project_translation"), verbosity: "low" },
      max_output_tokens: estimateProjectTranslationMaxOutputTokens(items, locales),
      store: false,
    });

    if (!response.output_parsed) {
      throw new AzureAiProviderError("AZURE_OPENAI_RESPONSE_INVALID", false, undefined, {
        providerCode: response.incomplete_details?.reason
          ? `OUTPUT_NOT_PARSED:${response.incomplete_details.reason}`
          : `OUTPUT_NOT_PARSED:${response.status}`,
      });
    }

    return response.output_parsed as ProjectTranslationResult;
  } catch (error) {
    if (error instanceof AzureAiProviderError) throw error;
    const statusCode = error instanceof OpenAI.APIError ? error.status : undefined;
    const retryable = statusCode === undefined || [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
    throw new AzureAiProviderError("AZURE_OPENAI_REQUEST_FAILED", retryable, statusCode, {
      cause: error,
      providerCode: error instanceof OpenAI.APIError ? (error.code ?? error.type) : undefined,
    });
  }
}

export async function generateProductTranslations(
  input: GenerateProductTranslationsInput,
  options: { client?: OpenAI } = {},
): Promise<ProductTranslationResult> {
  if (input.locales.length === 0 || input.fields.length === 0) return {};

  const client = options.client ?? createAzureOpenAiClient();
  const retryingClient = client.withOptions({ maxRetries: 2 });
  const { openAiDeployment } = getAzureAiConfig();
  const schema = buildResponseSchema(input.locales, input.fields);

  try {
    const response = await retryingClient.responses.parse({
      model: openAiDeployment,
      instructions: translationInstructions(input.locales, input.fields),
      input: translationInput(input, input.fields),
      reasoning: { effort: "minimal" },
      text: { format: zodTextFormat(schema, "product_translation"), verbosity: "low" },
      max_output_tokens: 2_000,
      store: false,
    });

    if (!response.output_parsed) {
      throw new AzureAiProviderError("AZURE_OPENAI_RESPONSE_INVALID", false, undefined, {
        providerCode: response.incomplete_details?.reason
          ? `OUTPUT_NOT_PARSED:${response.incomplete_details.reason}`
          : `OUTPUT_NOT_PARSED:${response.status}`,
      });
    }

    return response.output_parsed as ProductTranslationResult;
  } catch (error) {
    if (error instanceof AzureAiProviderError) throw error;
    const statusCode = error instanceof OpenAI.APIError ? error.status : undefined;
    const retryable = statusCode === undefined || [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
    throw new AzureAiProviderError("AZURE_OPENAI_REQUEST_FAILED", retryable, statusCode, {
      cause: error,
      providerCode: error instanceof OpenAI.APIError ? (error.code ?? error.type) : undefined,
    });
  }
}
