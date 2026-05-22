import { z } from "zod";
import { FindingSeveritySchema, FindingStatusSchema } from "./finding.js";

export const VerificationSchema = z.object({
  id: z.string().min(1),
  status: FindingStatusSchema,
  severity: FindingSeveritySchema,
  reasons: z.array(z.string().min(1)).optional(),
  evidence: z.array(z.string().min(1)).optional(),
  verifier: z.string().min(1).optional()
});

export type Verification = z.infer<typeof VerificationSchema>;
