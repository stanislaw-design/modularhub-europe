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
  | "product_updated"
  | "product_deleted"
  | "query_sent"
  | "offer_submitted"
  | "offer_accepted"
  | "offer_rejected"
  | "payment_completed"
  | "order_status_changed"
  | "product_favorited"
  | "project_request_submitted"
  | "bulk_product_inquiry_submitted"
  | "project_quote_submitted"
  | "project_quote_accepted";
