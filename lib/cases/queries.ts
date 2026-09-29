import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { CaseMessageDto } from "@/lib/case-schemas";
import { db } from "@/lib/db/client";
import { channel, inquiry, inquiryItem, product, users } from "@/lib/db/schema";
import { requireCaseAccess, type CaseActor } from "./access";
import { getCaseFields, type CaseFieldsByKey } from "./cards";
import { listMessages } from "./messaging";

// Odczyty sprawy doradczej dla ekranów klienta i doradcy (spec 0048). Dostęp
// zawsze przez requireCaseAccess. Widok klienta nie dostaje danych, których
// klient nie powinien widzieć (na razie: brak innych kanałów niż własny).

type CaseStage = (typeof inquiry.$inferSelect)["stage"];
type CaseWaitingOn = NonNullable<(typeof inquiry.$inferSelect)["waitingOn"]>;

export interface CaseSummary {
  id: string;
  stage: CaseStage;
  waitingOn: CaseWaitingOn | null;
  productNames: string[];
  receivedAt: Date;
  lastClientActivityAt: Date | null;
  lastAdvisorActivityAt: Date | null;
  advisorName: string | null;
  clientName: string;
}

export interface CaseView {
  id: string;
  stage: CaseStage;
  waitingOn: CaseWaitingOn | null;
  productNames: string[];
  receivedAt: Date;
  plot: { street: string | null; postalCode: string | null; city: string | null; countryCode: string };
  clientMessage: string | null;
  clientName: string;
  advisorId: string | null;
  advisorName: string | null;
  channelId: string;
  messages: CaseMessageDto[];
  // Stan kart startowych i innych pól podsumowania (AC-43): interfejs
  // wylicza z tego, która karta jest odpowiedziana, bez osobnej flagi na
  // wiadomości.
  caseFields: CaseFieldsByKey;
}

const summaryColumns = {
  id: inquiry.id,
  stage: inquiry.stage,
  waitingOn: inquiry.waitingOn,
  receivedAt: inquiry.receivedAt,
  lastClientActivityAt: inquiry.lastClientActivityAt,
  lastAdvisorActivityAt: inquiry.lastAdvisorActivityAt,
  clientName: inquiry.name,
  advisorName: users.name,
  productName: product.name,
};

function groupSummaries(rows: Array<{ id: string; productName: string | null } & Omit<CaseSummary, "productNames">>): CaseSummary[] {
  const byId = new Map<string, CaseSummary>();
  for (const { productName, ...row } of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = { ...row, productNames: [] };
      byId.set(row.id, entry);
    }
    if (productName) entry.productNames.push(productName);
  }
  return [...byId.values()];
}

export async function listCasesForClient(clientId: string): Promise<CaseSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(inquiry)
    .leftJoin(users, eq(users.id, inquiry.assignedAdvisorId))
    .leftJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .leftJoin(product, eq(product.id, inquiryItem.productId))
    .where(and(eq(inquiry.clientId, clientId), ne(inquiry.stage, "legacy_direct")))
    .orderBy(desc(inquiry.receivedAt));
  return groupSummaries(rows);
}

// Tylko dla doradcy (rola admin): wywołujący sprawdza aktora.
export async function listCasesForAdvisor(actor: CaseActor): Promise<CaseSummary[]> {
  if (actor.kind !== "advisor") return [];
  const rows = await db
    .select(summaryColumns)
    .from(inquiry)
    .leftJoin(users, eq(users.id, inquiry.assignedAdvisorId))
    .leftJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .leftJoin(product, eq(product.id, inquiryItem.productId))
    .where(ne(inquiry.stage, "legacy_direct"))
    .orderBy(desc(inquiry.receivedAt));
  return groupSummaries(rows);
}

export const CASES_AND_INQUIRIES_PAGE_SIZE = 30;

export interface CaseOrInquiryRow {
  id: string;
  kind: "case" | "legacy_inquiry";
  stage: CaseStage;
  status: (typeof inquiry.$inferSelect)["status"];
  waitingOn: CaseWaitingOn | null;
  productNames: string[];
  receivedAt: Date;
  advisorName: string | null;
  clientName: string;
}

export interface CasesAndInquiriesPage {
  items: CaseOrInquiryRow[];
  totalCount: number;
}

// Zasila /internal/cases-and-inquiries (spec 0055 AC-14): sprawy (spec 0048)
// i dawne zapytania bezpośrednie (spec 0023) są ten sam wiersz inquiry, więc
// scalenie to po prostu zapytanie bez filtru po stage, nie UNION dwóch tabel.
// Paginacja na poziomie samego inquiry (krok 1) przed dociągnięciem nazw
// produktów (krok 2, fan-out przez inquiryItem) — LIMIT/OFFSET na
// zdenormalizowanym, połączonym z product wynikiem obcinałby wiersze
// pośrodku jednego zapytania mającego kilka produktów.
export async function listCasesAndInquiriesForAdmin(page: number): Promise<CasesAndInquiriesPage> {
  const [countRow, pageRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(inquiry),
    db
      .select({
        id: inquiry.id,
        stage: inquiry.stage,
        status: inquiry.status,
        waitingOn: inquiry.waitingOn,
        receivedAt: inquiry.receivedAt,
        clientName: inquiry.name,
        advisorName: users.name,
      })
      .from(inquiry)
      .leftJoin(users, eq(users.id, inquiry.assignedAdvisorId))
      .orderBy(desc(inquiry.receivedAt))
      .limit(CASES_AND_INQUIRIES_PAGE_SIZE)
      .offset((page - 1) * CASES_AND_INQUIRIES_PAGE_SIZE),
  ]);

  const ids = pageRows.map((row) => row.id);
  const productRows = ids.length
    ? await db
        .select({ inquiryId: inquiryItem.inquiryId, productName: product.name })
        .from(inquiryItem)
        .innerJoin(product, eq(product.id, inquiryItem.productId))
        .where(inArray(inquiryItem.inquiryId, ids))
    : [];
  const productNamesById = new Map<string, string[]>();
  for (const row of productRows) {
    const list = productNamesById.get(row.inquiryId) ?? [];
    if (row.productName) list.push(row.productName);
    productNamesById.set(row.inquiryId, list);
  }

  const items: CaseOrInquiryRow[] = pageRows.map((row) => ({
    ...row,
    kind: row.stage === "legacy_direct" ? "legacy_inquiry" : "case",
    productNames: productNamesById.get(row.id) ?? [],
  }));

  return { items, totalCount: countRow[0]?.count ?? 0 };
}

// Klient i doradca widzą kanał klient_doradca. Zwraca null przy braku dostępu
// i przy braku sprawy tak samo (bez wycieku istnienia).
export async function getCaseView(actor: CaseActor, inquiryId: string): Promise<CaseView | null> {
  if (actor.kind === "producer") return null;
  const access = await requireCaseAccess(actor, inquiryId);
  if (!access) return null;

  const [row] = await db
    .select({
      id: inquiry.id,
      stage: inquiry.stage,
      waitingOn: inquiry.waitingOn,
      receivedAt: inquiry.receivedAt,
      street: inquiry.plotStreet,
      postalCode: inquiry.plotPostalCode,
      city: inquiry.plotCity,
      countryCode: inquiry.deliveryCountryCode,
      clientMessage: inquiry.clientMessage,
      clientName: inquiry.name,
      advisorId: inquiry.assignedAdvisorId,
      advisorName: users.name,
    })
    .from(inquiry)
    .leftJoin(users, eq(users.id, inquiry.assignedAdvisorId))
    .where(eq(inquiry.id, inquiryId));
  if (!row) return null;

  const [channelRow] = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.inquiryId, inquiryId), eq(channel.kind, "klient_doradca")));
  if (!channelRow) return null;

  const [productRows, messages, caseFields] = await Promise.all([
    db
      .select({ name: product.name })
      .from(inquiryItem)
      .innerJoin(product, eq(product.id, inquiryItem.productId))
      .where(eq(inquiryItem.inquiryId, inquiryId)),
    listMessages(channelRow.id, null),
    getCaseFields(inquiryId),
  ]);

  return {
    id: row.id,
    stage: row.stage,
    waitingOn: row.waitingOn,
    productNames: productRows.flatMap((item) => (item.name ? [item.name] : [])),
    receivedAt: row.receivedAt,
    plot: { street: row.street, postalCode: row.postalCode, city: row.city, countryCode: row.countryCode },
    clientMessage: row.clientMessage,
    clientName: row.clientName,
    advisorId: row.advisorId,
    advisorName: row.advisorName,
    channelId: channelRow.id,
    messages,
    caseFields,
  };
}
