import { z } from "zod";

// Kondygnacja pomieszczenia (spec 0050 AC-5, AC-8): zastępuje dawne
// isMezzanine (boolean), trzy możliwe wartości.
export const FLOOR_LEVELS = ["parter", "pietro", "poddasze"] as const;
export type FloorLevel = (typeof FLOOR_LEVELS)[number];

// Uklad pomieszczen (product.room_layout, spec 0042 Feature design). Walidacja
// Zod na granicy aplikacji byla otwartym Follow-up spec 0042, domknieta tu
// (spec 0045 AC-5). Kazdy wiersz niesie stabilny, generowany po stronie
// klienta `id` (pole w jsonb, nie kolumna bazy), zeby reorder albo usuniecie
// wiersza nigdy nie gubily dopasowania z tlumaczeniem (product_translation.room_layout,
// AC-10), ktore dopasowuje wpisy po tym samym `id`, nie po indeksie.
//
// floorLevel zastępuje isMezzanine (spec 0050 AC-8): schemat akceptuje na
// wejściu obie postacie (isMezzanine dla wierszy zapisanych przed tą zmianą),
// ale zawsze zwraca floorLevel, migrując jednorazowo, na granicy aplikacji,
// dokładnie tu (nie migracją bazy, bo room_layout jest jsonb). isMezzanine
// nigdy nie trafia z powrotem do zapisu: `RoomLayoutRow` (typ wyjściowy) go
// nie ma.
//
// `function` (dawne pole "Funkcja") usunięte z kreatora: w praktyce niemal
// zawsze dublowało `name` ("Salon" / funkcja "Dzienna"), bez własnego miejsca
// na karcie klienta (ProjectRoomLayout.tsx nigdy go nie wyświetlał). Ten sam
// wzorzec co isMezzanine wyżej — schemat wciąż akceptuje `function` na
// wejściu (produkty opublikowane przed tą zmianą mają je w swoim jsonb), ale
// zawsze go odrzuca w transformacji; `RoomLayoutRow` go nie ma.
const roomLayoutRowInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    areaM2: z.number().positive(),
    function: z.string().optional(),
    floorLevel: z.enum(FLOOR_LEVELS).optional(),
    isMezzanine: z.boolean().optional(),
  })
  .strict();

export const roomLayoutRowSchema = roomLayoutRowInputSchema.transform(({ id, name, areaM2, isMezzanine, floorLevel }) => ({
  id,
  name,
  areaM2,
  floorLevel: floorLevel ?? (isMezzanine ? "poddasze" : "parter"),
}));
export type RoomLayoutRow = z.infer<typeof roomLayoutRowSchema>;

export const roomLayoutSchema = z.array(roomLayoutRowSchema);
export type RoomLayout = z.infer<typeof roomLayoutSchema>;

// Tlumaczenie EN/NL (product_translation.room_layout, AC-10): dopasowane po
// `id` z roomLayoutSchema powyzej. Tylko `name` jest tlumaczony — areaM2 i
// floorLevel nie sa jezykozalezne. Tablica moze byc krotsza niz polska
// wersja (tlumaczenie czesciowe); brakujacy wpis renderuje sie jako polski
// tekst (AC-10), rozwiazywane po stronie odczytu, nie tutaj.
export const roomLayoutTranslationRowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export type RoomLayoutTranslationRow = z.infer<typeof roomLayoutTranslationRowSchema>;

export const roomLayoutTranslationSchema = z.array(roomLayoutTranslationRowSchema);
export type RoomLayoutTranslation = z.infer<typeof roomLayoutTranslationSchema>;
