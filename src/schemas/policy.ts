import { z } from "zod";

export const PolicyResultSchema = z.object({
  result: z.enum(["PASS", "WARN", "FAIL"]),
  reasons: z.array(z.string().min(1)),
  blocking_finding_ids: z.array(z.string().min(1))
});

export type PolicyResult = z.infer<typeof PolicyResultSchema>;
