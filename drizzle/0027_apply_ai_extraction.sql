-- Spec 0047 AC-13 "Atomowe zastosowanie": zapisuje zaakceptowane decyzje sesji
-- importu PDF do szkicu produktu w jednym wywołaniu funkcji. Neon-http nie
-- wspiera db.transaction (lib/db/AGENTS.md), więc jak save_ai_field_decision
-- i get_ai_review_gate (drizzle/0024_wandering_baron_zemo.sql), cała
-- wielotabelowa operacja żyje w jednej funkcji Postgres wywoływanej jednym
-- zapytaniem — Postgres gwarantuje atomowość samej funkcji niezależnie od
-- wsparcia sterownika dla wielostatementowych transakcji.
--
-- Payload jest budowany i walidowany po stronie TypeScript
-- (lib/house-ai-apply.ts, wołane z lib/house-ai-actions.ts#applyAiExtraction)
-- i traktowany tu jako zaufany — nigdy nie pochodzi bezpośrednio od
-- klienta, więc funkcja nie powtarza walidacji grafu encji.
--
-- Świadomie poza zakresem: TRANSLATION_PENDING/TRANSLATION_FAILED (pipeline
-- tłumaczeń nie istnieje) i PRODUCT_FIELD_CHANGED (ai_field_snapshot nigdy
-- nie jest dziś zapisywany) — get_ai_review_gate ich jeszcze nie zwraca,
-- więc ponowna kontrola bramki niżej nie może na nie trafić. Zapisywane pola
-- nie przechodzą też ponownie przez istniejące schematy Zod produktu (np.
-- lib/product-technical-specs.ts) — patrz docs/specs/0047-import-projektu-z-pdf/verify.md.
CREATE OR REPLACE FUNCTION apply_ai_extraction(
  p_session_id uuid,
  p_producer_id uuid,
  p_expected_decision_revision integer,
  p_payload jsonb
)
RETURNS TABLE(applied_product_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session ai_extraction_session%ROWTYPE;
  v_gate_codes text[];
  v_product_id uuid;
  v_variant jsonb;
  v_variant_idx integer;
  v_variant_id uuid;
  v_cost_item jsonb;
  v_timeline_item jsonb;
  v_item_idx integer;
  v_existing_variant_count integer;
BEGIN
  SELECT * INTO v_session
  FROM ai_extraction_session
  WHERE id = p_session_id
    AND producer_id = p_producer_id
    AND status = 'review_ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI_SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.decision_revision <> p_expected_decision_revision THEN
    RAISE EXCEPTION 'AI_DECISION_REVISION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  -- Ponowna bramka tuż przed zapisem: ten sam wynik co UI, żadnej reguły
  -- odtworzonej osobno (spec 0047 "Deterministyczna bramka przeglądu").
  v_gate_codes := get_ai_review_gate(p_session_id);
  IF array_length(v_gate_codes, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'AI_APPLY_BLOCKED' USING ERRCODE = 'P0001';
  END IF;

  v_product_id := v_session.product_id;

  IF p_payload->'product' <> '{}'::jsonb THEN
    UPDATE product SET
      name = COALESCE(p_payload->'product'->>'name', name),
      description = COALESCE(p_payload->'product'->>'description', description),
      floor_area_m2 = COALESCE((p_payload->'product'->>'floor_area_m2')::real, floor_area_m2),
      bedrooms = COALESCE((p_payload->'product'->>'bedrooms')::integer, bedrooms),
      country_of_production = COALESCE(p_payload->'product'->>'country_of_production', country_of_production),
      category = COALESCE((p_payload->'product'->>'category')::product_category, category),
      structural_warranty_years = COALESCE((p_payload->'product'->>'structural_warranty_years')::integer, structural_warranty_years),
      installation_warranty_years = COALESCE((p_payload->'product'->>'installation_warranty_years')::integer, installation_warranty_years),
      service_scope_description = COALESCE(p_payload->'product'->>'service_scope_description', service_scope_description),
      transport_dimensions = COALESCE(p_payload->'product'->>'transport_dimensions', transport_dimensions),
      crane_requirements = COALESCE(p_payload->'product'->>'crane_requirements', crane_requirements),
      min_plot_width_m = COALESCE((p_payload->'product'->>'min_plot_width_m')::real, min_plot_width_m),
      simplified_permit_eligible = COALESCE((p_payload->'product'->>'simplified_permit_eligible')::boolean, simplified_permit_eligible),
      updated_at = now()
    WHERE id = v_product_id;
  END IF;

  IF p_payload->'technicalSpecs' <> '{}'::jsonb THEN
    UPDATE product
    SET technical_specs = COALESCE(technical_specs, '{}'::jsonb) || (p_payload->'technicalSpecs'),
        updated_at = now()
    WHERE id = v_product_id;
  END IF;

  -- Pełne zastąpienie, nie scalenie: szkic z createAiProductDraft startuje
  -- bez pomieszczeń ani FAQ (AC-1), więc istniejące wpisy nie mają
  -- entity_key, po którym dałoby się je dopasować do kandydatów AI.
  IF p_payload->'roomLayout' IS NOT NULL THEN
    UPDATE product SET room_layout = p_payload->'roomLayout', updated_at = now() WHERE id = v_product_id;
  END IF;
  IF p_payload->'faq' IS NOT NULL THEN
    UPDATE product SET faq = p_payload->'faq', updated_at = now() WHERE id = v_product_id;
  END IF;

  SELECT count(*) INTO v_existing_variant_count
  FROM product_variant
  WHERE product_id = v_product_id AND deleted_at IS NULL;

  FOR v_variant, v_variant_idx IN
    SELECT value, (ordinality - 1)::integer
    FROM jsonb_array_elements(COALESCE(p_payload->'variants', '[]'::jsonb)) WITH ORDINALITY AS t(value, ordinality)
  LOOP
    INSERT INTO product_variant (
      product_id, completion_standard, variant_label, price_min_cents, price_max_cents,
      scope_summary, is_default, sort_order
    ) VALUES (
      v_product_id,
      (v_variant->>'completionStandard')::completion_standard,
      v_variant->>'variantLabel',
      (v_variant->>'priceMinCents')::integer,
      (v_variant->>'priceMaxCents')::integer,
      v_variant->>'scopeSummary',
      (v_existing_variant_count = 0 AND v_variant_idx = 0),
      v_variant_idx
    )
    ON CONFLICT (product_id, completion_standard) WHERE deleted_at IS NULL
    DO UPDATE SET
      variant_label = EXCLUDED.variant_label,
      price_min_cents = EXCLUDED.price_min_cents,
      price_max_cents = EXCLUDED.price_max_cents,
      scope_summary = EXCLUDED.scope_summary,
      sort_order = EXCLUDED.sort_order,
      updated_at = now()
    RETURNING id INTO v_variant_id;

    -- Pozycje kosztowe i etapy harmonogramu tego wariantu: pełne zastąpienie
    -- zestawem z bieżącej sesji, ten sam argument co dla room_layout/faq wyżej.
    DELETE FROM cost_line_item WHERE product_variant_id = v_variant_id;
    DELETE FROM product_timeline_stage WHERE product_variant_id = v_variant_id;

    FOR v_cost_item, v_item_idx IN
      SELECT value, (ordinality - 1)::integer
      FROM jsonb_array_elements(COALESCE(v_variant->'costItems', '[]'::jsonb)) WITH ORDINALITY AS t(value, ordinality)
    LOOP
      INSERT INTO cost_line_item (product_variant_id, label, status, responsible_party, sort_order)
      VALUES (
        v_variant_id,
        v_cost_item->>'label',
        (v_cost_item->>'status')::cost_line_item_status,
        v_cost_item->>'responsibleParty',
        v_item_idx
      );
    END LOOP;

    FOR v_timeline_item, v_item_idx IN
      SELECT value, (ordinality - 1)::integer
      FROM jsonb_array_elements(COALESCE(v_variant->'timeline', '[]'::jsonb)) WITH ORDINALITY AS t(value, ordinality)
    LOOP
      INSERT INTO product_timeline_stage (
        product_variant_id, stage_key, duration_min_days, duration_max_days,
        starts_from_label, responsible_party, sort_order
      ) VALUES (
        v_variant_id,
        (v_timeline_item->>'stageKey')::product_timeline_stage_key,
        (v_timeline_item->>'durationMinDays')::integer,
        (v_timeline_item->>'durationMaxDays')::integer,
        v_timeline_item->>'startsFromLabel',
        v_timeline_item->>'responsibleParty',
        v_item_idx
      );
    END LOOP;
  END LOOP;

  UPDATE ai_extraction_session
  SET status = 'applied', current_stage = 'apply', progress = 100, completed_at = now()
  WHERE id = p_session_id;

  applied_product_id := v_product_id;
  RETURN NEXT;
END;
$$;
