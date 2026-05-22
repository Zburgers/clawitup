import { z } from "zod";
import { VerificationSchema } from "./verification.js";
import { PolicyResultSchema } from "./policy.js";

export const SummarySchema = z.object({
  policy_result: z.enum(["PASS", "WARN", "FAIL"]),
  confirmed: z.number().int().nonnegative(),
  rejected_false_positive: z.number().int().nonnegative(),
  needs_human_review: z.number().int().nonnegative().optional(),
  insufficient_evidence: z.number().int().nonnegative().optional(),
  duplicate: z.number().int().nonnegative().optional(),
  out_of_scope: z.number().int().nonnegative().optional(),
  verified_findings: z.array(VerificationSchema).optional(),
  blocking_finding_ids: z.array(z.string().min(1)).optional(),
  policy: PolicyResultSchema.optional()
});

export type Summary = z.infer<typeof SummarySchema>;
