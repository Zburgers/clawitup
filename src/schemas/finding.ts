import { z } from "zod";

export const FindingSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const FindingStatusSchema = z.enum([
  "CONFIRMED",
  "REJECTED_FALSE_POSITIVE",
  "NEEDS_HUMAN_REVIEW",
  "INSUFFICIENT_EVIDENCE",
  "DUPLICATE",
  "OUT_OF_SCOPE"
]);

export const FindingSchema = z.object({
  id: z.string().min(1),
  severity: FindingSeveritySchema,
  status: FindingStatusSchema,
  title: z.string().min(1).optional(),
  scope_relation: z.enum(["in_scope", "out_of_scope", "unclear"]).optional(),
  evidence: z.array(z.string().min(1)).optional(),
  source_files: z.array(z.string().min(1)).optional(),
  notes: z.string().min(1).optional()
});

export type Finding = z.infer<typeof FindingSchema>;
