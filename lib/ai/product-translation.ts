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
