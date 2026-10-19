export type Role = "klient" | "producent";

export type ObservabilityEnvironment = "development" | "staging" | "production";

export type ErrorContext = {
  path?: string;
  role?: Role;
  userId?: string;
  distinctId?: string;
  // Gdzie błąd został złapany i połknięty (np. strona główna ukrywa sekcję), żeby dało się
  // ustawić alert w Sentry (spec 0073 AC-8).
  area?: string;
  section?: string;
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
  | "request_cancelled_by_client"
  | "request_closed_by_staff"
  | "request_reopened"
  | "project_quote_outcome_reported"
  | "project_quote_submitted"
  | "project_quote_selected"
  | "large_order_connected"
  | "project_quote_pdf_uploaded"
  | "inquiry_attachment_uploaded"
  | "producer_volume_verification_decided"
  | "client_b2b_verification_decided"
  | "case_created"
  | "case_first_advisor_reply"
  | "case_brief_approved"
  | "case_invitation_sent"
  | "case_offer_submitted"
  | "case_comparison_published"
  | "case_finalist_selected"
  | "case_closed_no_choice"
  | "notification_email_sent"
  | "notification_email_failed";
