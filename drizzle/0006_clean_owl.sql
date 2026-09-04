CREATE TABLE "favorite" (
	"client_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_client_id_product_id_pk" PRIMARY KEY("client_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Ten sam wzorzec audytu co 0002_audit_log_trigger.sql (spec 0018), rozszerzony
-- na favorite (spec 0024 Feature design). Żadna z jej kolumn (client_id,
-- product_id, created_at) nie jest w liście redagowanej audit_log_capture(),
-- bo favorite nie niesie danych osobowych wprost — funkcja i tak je pomija.
CREATE TRIGGER favorite_audit AFTER INSERT OR UPDATE OR DELETE ON "favorite"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();