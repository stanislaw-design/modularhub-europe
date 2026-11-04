import "server-only";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bulkProductInquiry, inquiry, producer, product, projectRequest } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { LINK_KINDS, PRODUCER_VERIFICATION_LABELS, type LinkKind } from "./constants";
import { uuidSchema } from "./schemas";

// Linki sprawy i zadania do rekordów platformy (spec 0080 AC-3, AC-18). Notatnik tylko czyta:
// nigdy nie zapisuje do tabel platformy i niczego z nich nie kopiuje do własnych kolumn. Adres
// i bieżący status powstają przy odczycie, a awaria jednego odczytu dotyczy tylko tego linku.

const SEARCH_LIMIT = 15;
const RECENT_LIMIT = 20;

const VERIFICATION_LABELS = PRODUCER_VERIFICATION_LABELS;
const PRODUCT_STATUS_LABELS: Record<string, string> = { draft: "Szkic", published: "Opublikowany" };
const LARGE_ORDER_STATUS_LABELS: Record<string, string> = {
  open: "Otwarte",
  quoted: "Wycenione",
  published: "Oferty opublikowane",
  accepted: "Zaakceptowane",
  closed: "Zamknięte",
};
const CASE_STAGE_LABELS: Record<string, string> = {
  nowe: "Nowe",
  rozmowa: "Rozmowa",
  brief_do_zatwierdzenia: "Brief do zatwierdzenia",
  producenci_odpowiadaja: "Producenci odpowiadają",
  porownanie_w_przygotowaniu: "Porównanie w przygotowaniu",
  porownanie_gotowe: "Porównanie gotowe",
  finalista_wybrany: "Finalista wybrany",
  wspolne_ustalenia: "Wspólne ustalenia",
  zamkniete_bez_wyboru: "Zamknięte bez wyboru",
  legacy_direct: "Zapytanie bezpośrednie",
};

const labelOf = (map: Record<string, string>, value: string) => map[value] ?? value;

function shortDate(value: Date): string {
  return value.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
}

export function isLinkKind(value: string): value is LinkKind {
  return (LINK_KINDS as readonly string[]).includes(value);
}

/** Adres ekranu rekordu w panelu admina (bez prefiksu języka). */
export function platformLinkPath(kind: LinkKind, id: string): string {
  const encoded = encodeURIComponent(id);
  switch (kind) {
    case "producer":
      return `/internal/producers/${encoded}`;
    case "project_request":
      return `/internal/large-orders/${encoded}?kind=request`;
    case "bulk_product_inquiry":
      return `/internal/large-orders/${encoded}?kind=product`;
    case "case":
      return `/internal/cases/${encoded}`;
    case "product":
      return `/internal/products/${encoded}`;
  }
}

// ---------------------------------------------------------------------------
// Wyszukiwanie rekordu do podlinkowania
// ---------------------------------------------------------------------------

export interface PlatformRecordOption {
  id: string;
  label: string;
  detail: string;
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
}

/**
 * Producent i produkt: po nazwie (od 2 znaków). Duże zamówienia i case: lista ostatnich, a wpisany
 * identyfikator (uuid) zawęża ją do jednego rekordu.
 */
export async function searchPlatformRecords(kind: LinkKind, rawQuery: string): Promise<PlatformRecordOption[]> {
  const q = rawQuery.trim().slice(0, 100);
  const idQuery = uuidSchema.safeParse(q).success ? q : null;

  if (kind === "producer") {
    if (q.length < 2) return [];
    const rows = await db
      .select({ id: producer.id, name: producer.name, nip: producer.nip, status: producer.verificationStatus })
      .from(producer)
      .where(and(isNull(producer.deletedAt), or(ilike(producer.name, likePattern(q)), idQuery ? eq(producer.id, idQuery) : undefined)))
      .orderBy(producer.name)
      .limit(SEARCH_LIMIT);
    return rows.map((row) => ({ id: row.id, label: row.name, detail: `NIP ${row.nip} · ${labelOf(VERIFICATION_LABELS, row.status)}` }));
  }

  if (kind === "product") {
    if (q.length < 2) return [];
    const rows = await db
      .select({ id: product.id, name: product.name, status: product.status, producerName: producer.name })
      .from(product)
      .innerJoin(producer, eq(producer.id, product.producerId))
      .where(and(isNull(product.deletedAt), or(ilike(product.name, likePattern(q)), idQuery ? eq(product.id, idQuery) : undefined)))
      .orderBy(product.name)
      .limit(SEARCH_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      label: row.name ?? "Produkt bez nazwy",
      detail: `${row.producerName} · ${labelOf(PRODUCT_STATUS_LABELS, row.status)}`,
    }));
  }

  if (kind === "project_request") {
    const rows = await db
      .select({
        id: projectRequest.id,
        title: projectRequest.title,
        contactName: projectRequest.contactName,
        countryCode: projectRequest.countryCode,
        status: projectRequest.status,
        createdAt: projectRequest.createdAt,
      })
      .from(projectRequest)
      .where(idQuery ? eq(projectRequest.id, idQuery) : undefined)
      .orderBy(desc(projectRequest.createdAt))
      .limit(RECENT_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      label: `${row.title ?? row.contactName} (${row.countryCode})`,
      detail: `${labelOf(LARGE_ORDER_STATUS_LABELS, row.status)} · ${shortDate(row.createdAt)}`,
    }));
  }

  if (kind === "bulk_product_inquiry") {
    const rows = await db
      .select({
        id: bulkProductInquiry.id,
        productName: product.name,
        contactName: bulkProductInquiry.contactName,
        unitCount: bulkProductInquiry.unitCount,
        status: bulkProductInquiry.status,
        createdAt: bulkProductInquiry.createdAt,
      })
      .from(bulkProductInquiry)
      .leftJoin(product, eq(product.id, bulkProductInquiry.productId))
      .where(idQuery ? eq(bulkProductInquiry.id, idQuery) : undefined)
      .orderBy(desc(bulkProductInquiry.createdAt))
      .limit(RECENT_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      label: `${row.productName ?? "Produkt"} × ${row.unitCount} (${row.contactName})`,
      detail: `${labelOf(LARGE_ORDER_STATUS_LABELS, row.status)} · ${shortDate(row.createdAt)}`,
    }));
  }

  const rows = await db
    .select({ id: inquiry.id, name: inquiry.name, stage: inquiry.stage, receivedAt: inquiry.receivedAt })
    .from(inquiry)
    .where(idQuery ? eq(inquiry.id, idQuery) : undefined)
    .orderBy(desc(inquiry.receivedAt))
    .limit(RECENT_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    detail: `${labelOf(CASE_STAGE_LABELS, row.stage)} · ${shortDate(row.receivedAt)}`,
  }));
}

// ---------------------------------------------------------------------------
// Rozwiązywanie zapisanego linku: adres i bieżący status
// ---------------------------------------------------------------------------

export interface ResolvedPlatformLink {
  kind: LinkKind;
  id: string;
  /** Adres ekranu rekordu, bez prefiksu języka. */
  path: string;
  /** `false`: rekord zniknął albo odczyt się nie udał ("rekord niedostępny"). */
  available: boolean;
  label: string | null;
  status: string | null;
}

async function readRecord(kind: LinkKind, id: string): Promise<{ label: string; status: string } | null> {
  // Identyfikatory platformy są uuid; zły format to po prostu brak rekordu, nie błąd zapytania.
  if (!uuidSchema.safeParse(id).success) return null;
  switch (kind) {
    case "producer": {
      const [row] = await db
        .select({ name: producer.name, status: producer.verificationStatus, deletedAt: producer.deletedAt })
        .from(producer)
        .where(eq(producer.id, id))
        .limit(1);
      return row && !row.deletedAt ? { label: row.name, status: labelOf(VERIFICATION_LABELS, row.status) } : null;
    }
    case "product": {
      const [row] = await db
        .select({ name: product.name, status: product.status, deletedAt: product.deletedAt })
        .from(product)
        .where(eq(product.id, id))
        .limit(1);
      return row && !row.deletedAt ? { label: row.name ?? "Produkt bez nazwy", status: labelOf(PRODUCT_STATUS_LABELS, row.status) } : null;
    }
    case "project_request": {
      const [row] = await db
        .select({ title: projectRequest.title, contactName: projectRequest.contactName, status: projectRequest.status })
        .from(projectRequest)
        .where(eq(projectRequest.id, id))
        .limit(1);
      return row ? { label: row.title ?? row.contactName, status: labelOf(LARGE_ORDER_STATUS_LABELS, row.status) } : null;
    }
    case "bulk_product_inquiry": {
      const [row] = await db
        .select({ productName: product.name, unitCount: bulkProductInquiry.unitCount, status: bulkProductInquiry.status })
        .from(bulkProductInquiry)
        .leftJoin(product, eq(product.id, bulkProductInquiry.productId))
        .where(eq(bulkProductInquiry.id, id))
        .limit(1);
      return row
        ? { label: `${row.productName ?? "Produkt"} × ${row.unitCount}`, status: labelOf(LARGE_ORDER_STATUS_LABELS, row.status) }
        : null;
    }
    case "case": {
      const [row] = await db
        .select({ name: inquiry.name, stage: inquiry.stage })
        .from(inquiry)
        .where(eq(inquiry.id, id))
        .limit(1);
      return row ? { label: row.name, status: labelOf(CASE_STAGE_LABELS, row.stage) } : null;
    }
  }
}

/** Nigdy nie rzuca: awaria odczytu daje `available: false` (AC-3, AC-18). Każdy link czytany osobno. */
export async function resolvePlatformLink(link: { kind: LinkKind; id: string }): Promise<ResolvedPlatformLink> {
  const base = { kind: link.kind, id: link.id, path: platformLinkPath(link.kind, link.id) };
  try {
    const record = await readRecord(link.kind, link.id);
    return record ? { ...base, available: true, label: record.label, status: record.status } : { ...base, available: false, label: null, status: null };
  } catch (error) {
    captureError(error, { path: "conversations:resolvePlatformLink" });
    return { ...base, available: false, label: null, status: null };
  }
}

/** Do wyświetlenia w zadaniach: unikalne linki czytane równolegle, każdy niezależnie. */
export async function resolvePlatformLinks(
  links: ({ kind: string | null; id: string | null } | null)[],
): Promise<Map<string, ResolvedPlatformLink>> {
  const unique = new Map<string, { kind: LinkKind; id: string }>();
  for (const link of links) {
    if (link?.kind && link.id && isLinkKind(link.kind)) unique.set(`${link.kind}:${link.id}`, { kind: link.kind, id: link.id });
  }
  const entries = await Promise.all([...unique.entries()].map(async ([key, link]) => [key, await resolvePlatformLink(link)] as const));
  return new Map(entries);
}

