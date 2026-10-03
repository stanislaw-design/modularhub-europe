import { z } from "zod";

// Spec 0065 AC-2, AC-10: ocena zgodności projektu z przepisami kraju.
// Statusy te same co eligibility_status (lib/db/schema.ts, eligibilityStatusEnum).
export const COMPLIANCE_ASSESSMENT_STATUSES = ["approved", "conditional", "blocked"] as const;

export const productComplianceAssessmentInputSchema = z.object({
  countryCode: z.enum(["PL", "DE", "NL"]),
  rule: z.string().trim().min(1).max(50),
  status: z.enum(COMPLIANCE_ASSESSMENT_STATUSES),
  reason: z.string().trim().min(1).max(500),
});

export type ProductComplianceAssessmentInput = z.infer<typeof productComplianceAssessmentInputSchema>;
