export type Role = "klient" | "producent";

export type ObservabilityEnvironment = "development" | "staging" | "production";

export type ErrorContext = {
  path?: string;
  role?: Role;
  userId?: string;
  distinctId?: string;
};

export type EventName =
  | "user_registered"
  | "product_added"
  | "query_sent"
  | "offer_submitted"
  | "offer_accepted"
  | "payment_completed"
  | "order_status_changed";
