-- Spec 0067: kontrola braków tłumaczeń (en, de, nl), tylko odczyt.
-- Odpowiednik npm run check:translations, do wklejenia w Neon SQL Editor (prod lub dev).
-- Wynik pusty (0 wierszy) = zero braków. Każdy wiersz to pole, język i liczba braków.
with locales(locale) as (values ('en'), ('de'), ('nl')),
gaps as (
select 'product_option_group.name' as pole, l.locale, count(*)::int as braki
from (select distinct g.id, g.name from product_option_group_assignment a join product p on p.id = a.product_id join product_option_group g on g.id = a.group_id and g.deleted_at is null where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.name, '')) <> ''
  and not exists (select 1 from product_option_group_translation t where t.group_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.name, '')) <> '')
group by l.locale
union all
select 'product_option.label' as pole, l.locale, count(*)::int as braki
from (select distinct o.id, o.label from product_option_group_assignment a join product p on p.id = a.product_id join product_option_group g on g.id = a.group_id and g.deleted_at is null join product_option o on o.group_id = g.id and o.deleted_at is null where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.label, '')) <> ''
  and not exists (select 1 from product_option_translation t where t.option_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.label, '')) <> '')
group by l.locale
union all
select 'producer.description' as pole, l.locale, count(*)::int as braki
from (select distinct pr.id, pr.description as v from producer pr join product p on p.producer_id = pr.id where pr.deleted_at is null and p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from producer_translation t where t.producer_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.description, '')) <> '')
group by l.locale
union all
select 'producer.showroom_visit_note' as pole, l.locale, count(*)::int as braki
from (select distinct pr.id, pr.showroom_visit_note as v from producer pr join product p on p.producer_id = pr.id where pr.deleted_at is null and p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from producer_translation t where t.producer_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.showroom_visit_note, '')) <> '')
group by l.locale
union all
select 'producer.inquiry_response_time_label' as pole, l.locale, count(*)::int as braki
from (select distinct pr.id, pr.inquiry_response_time_label as v from producer pr join product p on p.producer_id = pr.id where pr.deleted_at is null and p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from producer_translation t where t.producer_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.inquiry_response_time_label, '')) <> '')
group by l.locale
union all
select 'producer_certification.name' as pole, l.locale, count(*)::int as braki
from (select distinct c.id, c.name from producer_certification c join product p on p.producer_id = c.producer_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.name, '')) <> ''
  and not exists (select 1 from producer_certification_translation t where t.certification_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.name, '')) <> '')
group by l.locale
union all
select 'product.description' as pole, l.locale, count(*)::int as braki
from (select p.id, p.description as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.description, '')) <> '')
group by l.locale
union all
select 'product.foundation_options' as pole, l.locale, count(*)::int as braki
from (select p.id, p.foundation_options as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.foundation_options, '')) <> '')
group by l.locale
union all
select 'product.construction_system' as pole, l.locale, count(*)::int as braki
from (select p.id, p.construction_system as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.construction_system, '')) <> '')
group by l.locale
union all
select 'product.roof_type' as pole, l.locale, count(*)::int as braki
from (select p.id, p.roof_type as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.roof_type, '')) <> '')
group by l.locale
union all
select 'product.customization_scope' as pole, l.locale, count(*)::int as braki
from (select p.id, p.customization_scope as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.customization_scope, '')) <> '')
group by l.locale
union all
select 'product.service_scope_description' as pole, l.locale, count(*)::int as braki
from (select p.id, p.service_scope_description as v from product p where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from product_translation t where t.product_id = s.id and t.locale::text = l.locale and btrim(coalesce(t.service_scope_description, '')) <> '')
group by l.locale
union all
select 'product_country_eligibility.reason' as pole, l.locale, count(*)::int as braki
from (select distinct e.reason as v from product_country_eligibility e join product p on p.id = e.product_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from reference_text_translation t where t.source_pl = s.v and t.locale::text = l.locale and btrim(t.translated) <> '')
group by l.locale
union all
select 'product_compliance_assessment.reason' as pole, l.locale, count(*)::int as braki
from (select distinct a.reason as v from product_compliance_assessment a join product p on p.id = a.product_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from reference_text_translation t where t.source_pl = s.v and t.locale::text = l.locale and btrim(t.translated) <> '')
group by l.locale
union all
select 'product_timeline_stage.responsible_party' as pole, l.locale, count(*)::int as braki
from (select distinct s.responsible_party as v from product_timeline_stage s join product_variant pv on pv.id = s.product_variant_id and pv.deleted_at is null join product p on p.id = pv.product_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from reference_text_translation t where t.source_pl = s.v and t.locale::text = l.locale and btrim(t.translated) <> '')
group by l.locale
union all
select 'product_timeline_stage.starts_from_label' as pole, l.locale, count(*)::int as braki
from (select distinct s.starts_from_label as v from product_timeline_stage s join product_variant pv on pv.id = s.product_variant_id and pv.deleted_at is null join product p on p.id = pv.product_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from reference_text_translation t where t.source_pl = s.v and t.locale::text = l.locale and btrim(t.translated) <> '')
group by l.locale
union all
select 'cost_line_item.label' as pole, l.locale, count(*)::int as braki
from (select distinct c.label as v from cost_line_item c join product_variant pv on pv.id = c.product_variant_id and pv.deleted_at is null join product p on p.id = pv.product_id where p.status = 'published' and p.deleted_at is null) s cross join locales l
where btrim(coalesce(s.v, '')) <> ''
  and not exists (select 1 from cost_line_item_label_translation t where t.label_pl = s.v and t.locale::text = l.locale and btrim(t.translated_label) <> '')
group by l.locale
)
select pole, locale, braki from gaps order by pole, locale;
