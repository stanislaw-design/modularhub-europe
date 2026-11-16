import type { ProductFamily } from "@/lib/data/types";

// Spec 0084 AC-2: rodzina zapytania to "dom", gdy którakolwiek pozycja jest
// domem, w przeciwnym razie rodzina pierwszego produktu z listy. Czysta funkcja
// (bez bazy), ta sama reguła w przeglądarce i na serwerze.
export function resolveInquiryFamily(families: readonly ProductFamily[]): ProductFamily {
  if (families.includes("dom")) return "dom";
  return families[0] ?? "dom";
}
