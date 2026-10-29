import { and, asc, eq, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { producer, producerCapacityProfile, projectRequest, projectRequestProducerOverride } from "./schema";

// Kolumny zapytania zewnętrznego (`project_request`) nazwane wprost z nazwą
// tabeli, a nie przez obiekty drizzle: w zapytaniu z jedną tabelą drizzle pomija
// kwalifikator, a nazwa bez niego trafiłaby do podzapytania (np. `country_code`
// zamiast `project_request.country_code`) i warunek byłby zawsze prawdziwy.
const request = {
  id: sql.raw('"project_request"."id"'),
  country_code: sql.raw('"project_request"."country_code"'),
  families: sql.raw('"project_request"."families"'),
  completion_standard: sql.raw('"project_request"."completion_standard"'),
  unit_count: sql.raw('"project_request"."unit_count"'),
  is_platform_owned: sql.raw('"project_request"."is_platform_owned"'),
} as const;

// Spec 0070 AC-10: jedna reguła dopasowania producenta do zapytania wolnego
// (project_request). Ta sama funkcja steruje listą i szczegółem tablicy, walidacją
// w submitProjectQuote oraz odwrotnym odczytem dla admina i maili, więc żadna z tych
// ścieżek nie może się rozjechać z pozostałymi.
//
// To fragment SQL, nie osobne zapytanie: czyta kolumny `project_request` z
// zapytania zewnętrznego (to zapytanie musi mieć tę tabelę w FROM), a producenta
// bierze z podanego wyrażenia (parametr albo kolumna `producer.id`).
//
// Zapytanie klienta:
//   1. profil zdolności zatwierdzony wolumenowo, producent i jego członkowie nie
//      są usunięci ani zablokowani (blokada leży na użytkownikach, patrz
//      lib/producer-block-actions.ts), oraz
//   2. brak wyjątku `exclude`, oraz
//   3. wyjątek `include`, albo wszystkie trzy warunki: rodzina opublikowanego
//      produktu, standard wykończenia, moc (brak wartości w profilu nie wyklucza).
//
// Projekt własny ModularHub (spec 0077 AC-9): tylko warunki 1 bez weryfikacji
// wolumenowej (producent i członkowie nie usunięci ani zablokowani), 2, oraz
// wymagany wiersz `include`. Reguły rodziny, standardu, mocy i weryfikacji
// wolumenowej nie obowiązują.
//
// Kraj dostawy NIE jest warunkiem: producent, który nie dowozi do kraju zapytania,
// nadal je widzi i może złożyć ofertę, tylko dostaje znacznik (patrz
// producerDeliversToRequestCountrySql).
export function producerMatchesProjectRequestSql(producerId: SQL | string): SQL {
  return sql`(
    exists (select 1 from producer m_p where m_p.id = ${producerId} and m_p.deleted_at is null)
    and not exists (
      select 1 from producer_member m_pm
      join users m_u on m_u.id = m_pm.user_id
      where m_pm.producer_id = ${producerId} and (m_u.blocked_at is not null or m_u.deleted_at is not null)
    )
    and not exists (
      select 1 from project_request_producer_override m_ox
      where m_ox.project_request_id = ${request.id} and m_ox.producer_id = ${producerId} and m_ox.mode = 'exclude'
    )
    and (
      (
        ${request.is_platform_owned}
        and exists (
          select 1 from project_request_producer_override m_pi
          where m_pi.project_request_id = ${request.id} and m_pi.producer_id = ${producerId} and m_pi.mode = 'include'
        )
      )
      or (
      not ${request.is_platform_owned}
      and exists (
        select 1 from producer_capacity_profile m_cp
        where m_cp.producer_id = ${producerId} and m_cp.volume_verification_status = 'approved'
      )
      and (
      exists (
        select 1 from project_request_producer_override m_oi
        where m_oi.project_request_id = ${request.id} and m_oi.producer_id = ${producerId} and m_oi.mode = 'include'
      )
      or (
        exists (
          select 1 from product m_pd
          where m_pd.producer_id = ${producerId} and m_pd.status = 'published' and m_pd.deleted_at is null
            and exists (
              select 1 from jsonb_array_elements_text(${request.families}) m_f where m_f = m_pd.family::text
            )
        )
        and exists (
          select 1 from producer_capacity_profile m_cs
          where m_cs.producer_id = ${producerId}
            and (
              ${request.completion_standard} is null
              or jsonb_array_length(m_cs.completion_standards_supported) = 0
              or m_cs.completion_standards_supported @> to_jsonb(${request.completion_standard}::text)
            )
            and (m_cs.units_per_month is null or m_cs.units_per_month * 12 >= ${request.unit_count})
        )
      )
      )
      )
    )
  )`;
}

// Czy producent ma kraj zapytania na liście krajów dostawy. Nie wpływa na
// dopasowanie, służy tylko do znacznika "nie dowozisz do tego kraju" na tablicy.
export function producerDeliversToRequestCountrySql(producerId: SQL | string): SQL {
  return sql`exists (
    select 1 from producer_delivery_country d_dc
    where d_dc.producer_id = ${producerId} and d_dc.country_code = ${request.country_code}
  )`;
}

// Wariant dla jednego producenta i jednego zapytania: używany w submitProjectQuote.
export async function doesProducerMatchProjectRequest(producerId: string, projectRequestId: string): Promise<boolean> {
  const [row] = await db
    .select({ matches: producerMatchesProjectRequestSql(producerId) })
    .from(projectRequest)
    .where(eq(projectRequest.id, projectRequestId));
  return row?.matches === true;
}

export interface MatchedProducer {
  producerId: string;
  name: string;
}

// Odwrotna funkcja dopasowania: producenci, którzy widzą dane zapytanie. Służy
// adminowi (ekran wyjątków), alertowi o zerze dopasowanych i mailom.
export async function getMatchedProducersForRequest(projectRequestId: string): Promise<MatchedProducer[]> {
  return db
    .select({ producerId: producer.id, name: producer.name })
    .from(producer)
    .innerJoin(projectRequest, eq(projectRequest.id, projectRequestId))
    .where(producerMatchesProjectRequestSql(sql`${producer.id}`))
    .orderBy(asc(producer.name));
}

export type ProducerOverrideMode = (typeof projectRequestProducerOverride.$inferSelect)["mode"];

export interface ProducerMatchForAdmin {
  producerId: string;
  name: string;
  countryCode: string;
  // Czy producent widzi zapytanie (wynik tej samej reguły, z wyjątkami).
  matched: boolean;
  override: ProducerOverrideMode | null;
}

// Ekran wyjątków w szczegółach admina (AC-2, AC-10): producenci zatwierdzeni
// wolumenowo (tylko im wyjątek `include` coś daje, patrz warunek 1), każdy ze
// stanem dopasowania i ewentualnym wyjątkiem. Wyjątek `exclude` zostaje widoczny
// także u producenta zablokowanego, żeby admin mógł go zdjąć.
export async function getProducerMatchesForAdmin(projectRequestId: string): Promise<ProducerMatchForAdmin[]> {
  const rows = await db
    .select({
      producerId: producer.id,
      name: producer.name,
      countryCode: producer.countryCode,
      matched: producerMatchesProjectRequestSql(sql`${producer.id}`),
      override: projectRequestProducerOverride.mode,
    })
    .from(producer)
    .innerJoin(projectRequest, eq(projectRequest.id, projectRequestId))
    .leftJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .leftJoin(
      projectRequestProducerOverride,
      and(
        eq(projectRequestProducerOverride.projectRequestId, projectRequestId),
        eq(projectRequestProducerOverride.producerId, producer.id),
      ),
    )
    .where(
      and(
        isNull(producer.deletedAt),
        // Projekt własny (spec 0077 AC-9): producent bez profilu wolumenowego też jest na liście.
        or(
          eq(projectRequest.isPlatformOwned, true),
          eq(producerCapacityProfile.volumeVerificationStatus, "approved"),
          isNotNull(projectRequestProducerOverride.mode),
        ),
      ),
    )
    .orderBy(asc(producer.name));
  return rows.map((row) => ({ ...row, matched: row.matched === true }));
}
