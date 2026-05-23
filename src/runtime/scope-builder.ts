import type { ScopeContract } from "../schemas/scope-contract.js";

const DEFAULT_EXPANSION_BUDGET = {
  graphify_related_modules: 6,
  search_result_files: 10,
  related_tests: 6,
  memory_files: 4,
  diff_hunks: 12
} as const;

function inferRiskLenses(primaryScope: string[]): string[] {
  const joined = primaryScope.join(" ").toLowerCase();
  const lenses = new Set<string>();

  if (joined.includes("auth")) {
    lenses.add("auth");
  }

  if (
    joined.includes("tenant") ||
    joined.includes("org") ||
    joined.includes("invoice") ||
    joined.includes("rbac")
  ) {
    lenses.add("tenant-boundary");
  }

  lenses.add("regression-tests");

  return Array.from(lenses).slice(0, 6);
}

export function buildLocalScopeContract(scope: string): ScopeContract {
  const primaryScope = [scope];

  return {
    mode: "local_scope",
    primary_scope: primaryScope,
    risk_lenses: inferRiskLenses(primaryScope),
    allowed_context_expansion: { ...DEFAULT_EXPANSION_BUDGET },
    explicitly_out_of_scope: ["broad whole-repo audit"]
  };
}

export function buildTaskScopeContract(taskFile: string): ScopeContract {
  const primaryScope = [taskFile];

  return {
    mode: "task_file",
    primary_scope: primaryScope,
    risk_lenses: inferRiskLenses(primaryScope),
    allowed_context_expansion: { ...DEFAULT_EXPANSION_BUDGET },
    explicitly_out_of_scope: ["scope not justified by task file"]
  };
}

export function buildCiScopeContract(changedFiles: string[]): ScopeContract {
  const primaryScope = changedFiles.slice(0, 24);
  const outOfScope = ["whole-repo dependency audit"];

  if (changedFiles.length > primaryScope.length) {
    outOfScope.push("oversized diff remainder");
  }

  return {
    mode: "ci_diff",
    primary_scope: primaryScope,
    risk_lenses: inferRiskLenses(primaryScope),
    allowed_context_expansion: { ...DEFAULT_EXPANSION_BUDGET },
    explicitly_out_of_scope: outOfScope
  };
}
