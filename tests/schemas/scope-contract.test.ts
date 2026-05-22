import { describe, expect, it } from "vitest";
import { ScopeContractSchema } from "../../src/schemas/scope-contract.js";

describe("ScopeContractSchema", () => {
  it("accepts bounded CI scope contracts", () => {
    const parsed = ScopeContractSchema.parse({
      mode: "ci_diff",
      primary_scope: ["src/auth/session.ts"],
      risk_lenses: ["auth", "tenant-boundary"],
      allowed_context_expansion: {
        graphify_related_modules: 6,
        search_result_files: 10,
        related_tests: 6,
        memory_files: 4,
        diff_hunks: 12
      },
      explicitly_out_of_scope: ["whole-repo dependency audit"]
    });

    expect(parsed.mode).toBe("ci_diff");
  });
});
