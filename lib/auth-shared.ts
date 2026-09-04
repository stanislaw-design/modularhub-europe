import type { ProducerTechnology } from "@/lib/producer-technologies";
import type { CountryCode } from "@/lib/data/types";

// Shape of pending_registration.payload (spec 0023 Feature design). Written by
// registerClient/registerProducer (lib/auth-registration.ts), read back by
// auth.ts's createUser adapter override when the magic link is confirmed.
export interface PendingRegistrationPayload {
  name: string;
  phone: string;
  // Producer only.
  nip?: string;
  countryCode?: CountryCode;
  technology?: ProducerTechnology;
}
