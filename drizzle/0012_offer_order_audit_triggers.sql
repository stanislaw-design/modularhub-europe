-- Ścieżka audytu RODO dla zapytanie -> oferta -> zamówienie (spec 0033 AC-18),
-- ten sam wzorzec co drizzle/0002_audit_log_trigger.sql: jeden trigger
-- Postgres per tabela, funkcja audit_log_capture() już istnieje (i już
-- obsługuje tabele bez pojedynczej kolumny `id`, patrz
-- drizzle/0007_fix_favorite_audit_trigger.sql) — offer_item ma klucz złożony
-- (offer_id, product_id), nie potrzebuje więc żadnej dalszej zmiany funkcji.
CREATE TRIGGER offer_audit AFTER INSERT OR UPDATE OR DELETE ON "offer"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER offer_item_audit AFTER INSERT OR UPDATE OR DELETE ON "offer_item"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER order_audit AFTER INSERT OR UPDATE OR DELETE ON "order"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER order_stage_event_audit AFTER INSERT OR UPDATE OR DELETE ON "order_stage_event"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
