import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getInteriorStylesForProduct, getProductOptionGroups } from "@/lib/db/queries";
import { product, productVariant } from "@/lib/db/schema";

// Migawka konfiguracji produktu w zapytaniu (spec 0081 AC-12). Powstaje wyłącznie na serwerze z identyfikatorów:
// nazwy i ceny pochodzą z bazy, nigdy z tekstu od klienta. Nieznane, usunięte lub niepasujące do produktu
// identyfikatory są pomijane, a funkcja nigdy nie rzuca z powodu złych id. Stylistyka nie zmienia ceny.
export interface ConfigurationSnapshotOption {
  optionId: string;
  groupName: string;
  label: string;
  priceCents: number | null;
  priceOnRequest: boolean;
}

export interface ConfigurationSnapshot {
  variantId: string | null;
  variantLabel: string | null;
  options: ConfigurationSnapshotOption[];
  style: { styleId: string; name: string } | null;
  // Suma wariantu i opcji z ceną. null, gdy wariant nie ma ceny (wycena indywidualna) albo go nie wybrano.
  totalPriceCents: number | null;
  // true, gdy któraś opcja ma "cenę na zapytanie": suma jest wtedy dolną granicą ("od").
  totalIsFrom: boolean;
  currency: string;
  capturedAt: string;
}

export interface SnapshotVariant {
  id: string;
  label: string;
  priceMinCents: number | null;
  priceOnRequest: boolean;
}

export interface SnapshotOptionGroup {
  name: string;
  options: { id: string; label: string; priceCents: number | null; priceOnRequest: boolean; isDefault: boolean }[];
}

export interface SnapshotInput {
  variants: SnapshotVariant[];
  groups: SnapshotOptionGroup[];
  styles: { id: string; name: string }[];
  currency: string;
  now: Date;
}

export interface SnapshotSelection {
  variantId?: string | null;
  optionIds?: string[] | null;
  styleId?: string | null;
}

const COMPLETION_LABELS: Record<string, string> = {
  "surowy-zamkniety": "Stan surowy zamknięty",
  deweloperski: "Stan deweloperski",
  "pod-klucz": "Pod klucz",
  katalogowy: "Katalogowy",
};

// Czysta część: z danych produktu i wybranych id składa migawkę. Zwraca null, gdy po odfiltrowaniu nie zostało nic
// do pokazania producentowi (ani wariant, ani opcja, ani stylistyka).
export function composeConfigurationSnapshot(input: SnapshotInput, selection: SnapshotSelection): ConfigurationSnapshot | null {
  const variant = input.variants.find((candidate) => candidate.id === selection.variantId) ?? null;
  const wanted = new Set(selection.optionIds ?? []);
  const options: ConfigurationSnapshotOption[] = [];
  for (const group of input.groups) {
    for (const option of group.options) {
      // Domyślna opcja grupy (standard) nie jest wyborem klienta, a link niesie pełny rozwiązany wybór.
      if (!wanted.has(option.id) || option.isDefault) continue;
      options.push({ optionId: option.id, groupName: group.name, label: option.label, priceCents: option.priceCents, priceOnRequest: option.priceOnRequest });
    }
  }
  const style = input.styles.find((candidate) => candidate.id === selection.styleId) ?? null;
  if (!variant && options.length === 0 && !style) return null;

  const base = variant && !variant.priceOnRequest ? variant.priceMinCents : null;
  const totalIsFrom = options.some((option) => option.priceOnRequest);
  const optionsTotal = options.reduce((sum, option) => sum + (option.priceOnRequest ? 0 : (option.priceCents ?? 0)), 0);

  return {
    variantId: variant?.id ?? null,
    variantLabel: variant?.label ?? null,
    options,
    style: style ? { styleId: style.id, name: style.name } : null,
    totalPriceCents: base === null || base === undefined ? null : base + optionsTotal,
    totalIsFrom,
    currency: input.currency,
    capturedAt: input.now.toISOString(),
  };
}

export async function buildConfigurationSnapshot(
  productId: string,
  variantId: string | null | undefined,
  optionIds: string[] | null | undefined,
  styleId: string | null | undefined,
  now: Date = new Date(),
): Promise<ConfigurationSnapshot | null> {
  try {
    const [[productRow], variantRows, groups, styles] = await Promise.all([
      db.select({ currency: product.currency }).from(product).where(eq(product.id, productId)),
      db
        .select()
        .from(productVariant)
        .where(and(eq(productVariant.productId, productId), isNull(productVariant.deletedAt))),
      getProductOptionGroups(productId, "pl"),
      getInteriorStylesForProduct(productId, "pl"),
    ]);
    if (!productRow) return null;
    return composeConfigurationSnapshot(
      {
        variants: variantRows.map((row) => ({
          id: row.id,
          label: row.variantLabel ?? COMPLETION_LABELS[row.completionStandard] ?? row.completionStandard,
          priceMinCents: row.priceMinCents,
          priceOnRequest: row.priceOnRequest,
        })),
        groups: groups.map((group) => ({ name: group.name, options: group.options.map((option) => ({ id: option.id, label: option.label, priceCents: option.priceCents, priceOnRequest: option.priceOnRequest, isDefault: option.isDefault })) })),
        styles: styles.map((style) => ({ id: style.id, name: style.name })),
        currency: productRow.currency ?? "EUR",
        now,
      },
      { variantId, optionIds, styleId },
    );
  } catch {
    // Migawka jest dodatkiem do zapytania: błąd odczytu nie może zablokować wysyłki.
    return null;
  }
}
