import { and, asc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { producer, producerGroup, producerGroupMember, product } from "@/lib/db/schema";
import { PRODUCT_FAMILIES, type ProductFamily } from "@/lib/product-technical-specs";

// Spec 0077 część B: grupy producentów (odbiorcy projektu własnego). Własne grupy są w bazie, gotowe
// grupy po rodzinie produktu liczą się na żywo przy każdym wywołaniu (AC-25). Tylko moduł serwerowy
// dla admina: producent nigdy nie widzi grup (AC-28), więc nic stąd nie trafia do widoków producenta.

// Identyfikator gotowej grupy w formularzu: "family:<rodzina>". Własna grupa to goły uuid.
export const READY_GROUP_PREFIX = "family:";

export const READY_GROUP_LABEL: Record<ProductFamily, string> = {
  dom: "Domy",
  "spa-modulowe": "Spa modułowe (sauny, jacuzzi)",
  "kontenery-modulowe": "Kontenery modułowe",
  "outdoor-tv": "Outdoor TV",
};

export interface GroupProducer {
  id: string;
  name: string;
  countryCode: string;
  // Usunięty lub z zablokowanym członkiem: widoczny na liście, ale pomijany przy rozwinięciu (AC-24).
  eligible: boolean;
}

export interface ReadyProducerGroup {
  id: string;
  family: ProductFamily;
  name: string;
  members: GroupProducer[];
}

export interface CustomProducerGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  eligibleCount: number;
}

export interface CustomProducerGroupDetail {
  id: string;
  name: string;
  description: string | null;
  members: GroupProducer[];
}

export interface ExpandedRecipients {
  // Unikalni producenci do użycia, posortowani po nazwie.
  producers: { id: string; name: string }[];
  // Wskazani, ale pominięci (usunięci albo zablokowani), po nazwie.
  skipped: { id: string; name: string }[];
}

// Producent może dostać projekt, gdy nie jest usunięty i żaden jego członek nie jest zablokowany ani usunięty
// (ta sama reguła co w dopasowaniu i w createPlatformProject).
// Kolumny są pisane z kwalifikatorem tabeli ręcznie: drizzle w zapytaniu z jednej tabeli opuszcza kwalifikator,
// a podzapytanie ma własne kolumny id.
const eligibleSql = sql<boolean>`("producer"."deleted_at" is null and not exists (
  select 1 from producer_member pm
  join users u on u.id = pm.user_id
  where pm.producer_id = "producer"."id" and (u.blocked_at is not null or u.deleted_at is not null)
))`;

export function readyGroupId(family: ProductFamily): string {
  return `${READY_GROUP_PREFIX}${family}`;
}

function parseReadyGroupId(id: string): ProductFamily | null {
  if (!id.startsWith(READY_GROUP_PREFIX)) return null;
  const family = id.slice(READY_GROUP_PREFIX.length);
  return (PRODUCT_FAMILIES as readonly string[]).includes(family) ? (family as ProductFamily) : null;
}

async function getFamilyProducers(family: ProductFamily): Promise<GroupProducer[]> {
  const rows = await db
    .selectDistinct({ id: producer.id, name: producer.name, countryCode: producer.countryCode, eligible: eligibleSql })
    .from(producer)
    .innerJoin(product, and(eq(product.producerId, producer.id), eq(product.family, family), eq(product.status, "published")))
    .where(isNull(producer.deletedAt))
    .orderBy(asc(producer.name));
  return rows;
}

// AC-25: jedna gotowa grupa na rodzinę, członkowie to producenci z co najmniej jednym opublikowanym produktem.
export async function getReadyProducerGroups(): Promise<ReadyProducerGroup[]> {
  return Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      id: readyGroupId(family),
      family,
      name: READY_GROUP_LABEL[family],
      members: await getFamilyProducers(family),
    })),
  );
}

export async function getCustomProducerGroups(): Promise<CustomProducerGroup[]> {
  const rows = await db
    .select({
      id: producerGroup.id,
      name: producerGroup.name,
      description: producerGroup.description,
      memberCount: sql<number>`count(${producerGroupMember.producerId})::int`,
      eligibleCount: sql<number>`count(*) filter (where ${eligibleSql})::int`,
    })
    .from(producerGroup)
    .leftJoin(producerGroupMember, eq(producerGroupMember.groupId, producerGroup.id))
    .leftJoin(producer, eq(producer.id, producerGroupMember.producerId))
    .groupBy(producerGroup.id)
    .orderBy(asc(sql`lower(${producerGroup.name})`));
  // count(*) filter liczy też wiersz grupy bez członków (left join), więc przy braku członków zerujemy.
  return rows.map((row) => ({ ...row, eligibleCount: row.memberCount === 0 ? 0 : row.eligibleCount }));
}

export async function getCustomProducerGroup(id: string): Promise<CustomProducerGroupDetail | null> {
  const [group] = await db
    .select({ id: producerGroup.id, name: producerGroup.name, description: producerGroup.description })
    .from(producerGroup)
    .where(eq(producerGroup.id, id));
  if (!group) return null;
  const members = await db
    .select({ id: producer.id, name: producer.name, countryCode: producer.countryCode, eligible: eligibleSql })
    .from(producerGroupMember)
    .innerJoin(producer, eq(producer.id, producerGroupMember.producerId))
    .where(eq(producerGroupMember.groupId, id))
    .orderBy(asc(producer.name));
  return { ...group, members };
}

// AC-24: wyszukiwanie producenta po nazwie do dodania do grupy (bez usuniętych).
export async function searchProducersForGroup(query: string, excludeIds: string[] = []): Promise<{ id: string; name: string; countryCode: string }[]> {
  const needle = query.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
  if (needle.length < 1) return [];
  const rows = await db
    .select({ id: producer.id, name: producer.name, countryCode: producer.countryCode })
    .from(producer)
    .where(and(isNull(producer.deletedAt), ilike(producer.name, `%${needle}%`)))
    .orderBy(asc(producer.name))
    .limit(20);
  const excluded = new Set(excludeIds);
  return rows.filter((row) => !excluded.has(row.id));
}

// Rozwinięcie wyboru z formularza do listy producentów (AC-26). Funkcja stanu bazy w danej chwili:
// grupy własne (uuid) i gotowe ("family:<rodzina>") plus pojedynczy producenci, deduplikacja,
// pominięci to usunięci albo z zablokowanym członkiem. Nieznane identyfikatory grup są ignorowane.
export async function expandRecipients(groupIds: string[], producerIds: string[]): Promise<ExpandedRecipients> {
  const families = new Set<ProductFamily>();
  const customIds: string[] = [];
  for (const id of new Set(groupIds)) {
    const family = parseReadyGroupId(id);
    if (family) families.add(family);
    else if (/^[0-9a-f-]{36}$/i.test(id)) customIds.push(id);
  }

  const candidateIds = new Set(producerIds);
  if (customIds.length > 0) {
    const rows = await db
      .select({ producerId: producerGroupMember.producerId })
      .from(producerGroupMember)
      .where(inArray(producerGroupMember.groupId, customIds));
    for (const row of rows) candidateIds.add(row.producerId);
  }
  if (families.size > 0) {
    const rows = await db
      .selectDistinct({ producerId: product.producerId })
      .from(product)
      .where(and(inArray(product.family, [...families]), eq(product.status, "published")));
    for (const row of rows) candidateIds.add(row.producerId);
  }
  if (candidateIds.size === 0) return { producers: [], skipped: [] };

  const rows = await db
    .select({ id: producer.id, name: producer.name, eligible: eligibleSql })
    .from(producer)
    .where(inArray(producer.id, [...candidateIds]))
    .orderBy(asc(producer.name));
  return {
    producers: rows.filter((row) => row.eligible).map(({ id, name }) => ({ id, name })),
    skipped: rows.filter((row) => !row.eligible).map(({ id, name }) => ({ id, name })),
  };
}
