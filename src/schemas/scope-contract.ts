import { z } from "zod";

export const ScopeModeSchema = z.enum(["local_scope", "task_file", "ci_diff"]);

export const ExpansionBudgetSchema = z.object({
  graphify_related_modules: z.number().int().nonnegative().max(12),
  search_result_files: z.number().int().nonnegative().max(20),
  related_tests: z.number().int().nonnegative().max(12),
  memory_files: z.number().int().nonnegative().max(8),
  diff_hunks: z.number().int().nonnegative().max(24)
});

export const ScopeContractSchema = z.object({
  mode: ScopeModeSchema,
  primary_scope: z.array(z.string().min(1)).min(1).max(24),
  risk_lenses: z.array(z.string().min(1)).min(1).max(6),
  allowed_context_expansion: ExpansionBudgetSchema,
  explicitly_out_of_scope: z.array(z.string().min(1)).max(12)
});

export type ScopeContract = z.infer<typeof ScopeContractSchema>;
