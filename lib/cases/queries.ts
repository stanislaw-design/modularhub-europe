import { and, desc, eq, ne } from "drizzle-orm";
import type { CaseMessageDto } from "@/lib/case-schemas";
import { db } from "@/lib/db/client";
import { channel, inquiry, inquiryItem, product, users } from "@/lib/db/schema";
import { requireCaseAccess, type CaseActor } from "./access";
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

  const [productRows, messages] = await Promise.all([
    db
      .select({ name: product.name })
      .from(inquiryItem)
      .innerJoin(product, eq(product.id, inquiryItem.productId))
      .where(eq(inquiryItem.inquiryId, inquiryId)),
    listMessages(channelRow.id, null),
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
  };
}
