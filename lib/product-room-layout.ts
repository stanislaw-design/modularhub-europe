import { z } from "zod";

// Uklad pomieszczen (product.room_layout, spec 0042 Feature design). Walidacja
// Zod na granicy aplikacji byla otwartym Follow-up spec 0042, domknieta tu
// (spec 0045 AC-5). Kazdy wiersz niesie stabilny, generowany po stronie
// klienta `id` (pole w jsonb, nie kolumna bazy), zeby reorder albo usuniecie
// wiersza nigdy nie gubily dopasowania z tlumaczeniem (product_translation.room_layout,
// AC-10), ktore dopasowuje wpisy po tym samym `id`, nie po indeksie.
export const roomLayoutRowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    areaM2: z.number().positive(),
    function: z.string().min(1),
    isMezzanine: z.boolean(),
  })
  .strict();
export type RoomLayoutRow = z.infer<typeof roomLayoutRowSchema>;

export const roomLayoutSchema = z.array(roomLayoutRowSchema);
export type RoomLayout = z.infer<typeof roomLayoutSchema>;

// Tlumaczenie EN/NL (product_translation.room_layout, AC-10): dopasowane po
// `id` z roomLayoutSchema powyzej. Tylko `name` jest tlumaczony — areaM2,
// function i isMezzanine nie sa jezykozalezne. Tablica moze byc krotsza niz
// polska wersja (tlumaczenie czesciowe); brakujacy wpis renderuje sie jako
// polski tekst (AC-10), rozwiazywane po stronie odczytu, nie tutaj.
export const roomLayoutTranslationRowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export type RoomLayoutTranslationRow = z.infer<typeof roomLayoutTranslationRowSchema>;

export const roomLayoutTranslationSchema = z.array(roomLayoutTranslationRowSchema);
export type RoomLayoutTranslation = z.infer<typeof roomLayoutTranslationSchema>;
