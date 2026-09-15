import type { CountryCode } from "@/lib/data/types";
import type { ProducerProductionScale } from "@/lib/producer-production-scale";

// Shape of pending_registration.payload (spec 0023 Feature design, extended by
// spec 0040). Written by registerClient/registerProducer
// (lib/auth-registration.ts), read back by auth.ts's createUser adapter
// override when the magic link is confirmed.
export interface PendingRegistrationPayload {
  name: string;
  phone: string;
  // Shared by producer registration and the client "Jestem inwestorem"
  // checkbox (spec 0040), which reuses client.nip/company_name (spec 0037)
  // instead of its own flag.
  nip?: string;
  // Client investor only (spec 0040).
  companyName?: string;
  // Producer only.
  countryCode?: CountryCode;
  productionScale?: ProducerProductionScale;
}
