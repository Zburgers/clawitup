# ClawItUp Audit Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a report-first ClawItUp MVP that runs scoped local audits and CI diff audits through the same Git-native Red Team / Filter / Blue Team pipeline.

**Architecture:** Keep deterministic contracts in a TypeScript CLI: scope generation, gate budgets, artifacts, policy decisions, eval scoring, and CI exit codes. Keep agent identity, skills, workflows, tools, hooks, and repo memory in GitAgent/Gitclaw-native files so the CLI orchestrates the runtime rather than embedding prompt behavior in code.

**Tech Stack:** TypeScript, Node.js, Gitclaw SDK/runtime, `commander`, `zod`, `execa`, `fs-extra`, Vitest, GitHub Actions, Graphify.

---

## Planning Notes

- Use @test-driven-development for implementation tasks.
- Keep the first MVP report-first. Do not add default patching, GitHub issue creation, or target repo `ISSUES.md` / `CHANGELOG.md` mutation.
- Keep scope expansion bounded. CI mode must start from changed files and gate related context.
- Prefer a fake or injected Gitclaw runner in unit tests so deterministic contracts can be tested without model calls.
- Run `graphify update .` after code files change in an implementation session.

### Task 1: Establish The TypeScript CLI Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/cli.ts`
- Create: `src/index.ts`
- Create: `tests/cli/help.test.ts`
- Modify: `README.md`

**Step 1: Write the failing CLI help test**

```ts
// tests/cli/help.test.ts
import { describe, expect, it } from "vitest";
import { buildCli } from "../../src/cli";

describe("clawitup cli", () => {
  it("registers the MVP commands", () => {
    const cli = buildCli();
    const names = cli.commands.map((command) => command.name());

    expect(names).toEqual(
      expect.arrayContaining(["init", "audit", "status", "report", "memory", "eval"])
    );
  });
});
```

**Step 2: Add the minimal package and test config**

```json
{
  "name": "clawitup",
  "version": "0.2.0",
  "type": "module",
  "bin": {
    "clawitup": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "commander": "latest",
    "execa": "latest",
    "fs-extra": "latest",
    "gitclaw": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/fs-extra": "latest",
    "@types/node": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

**Step 3: Implement the CLI shell**

```ts
// src/cli.ts
import { Command } from "commander";

export function buildCli(): Command {
  const cli = new Command("clawitup");

  cli.command("init");
  cli.command("audit");
  cli.command("status");
  cli.command("report");
  cli.command("memory");
  cli.command("eval");

  return cli;
}
```

```ts
// src/index.ts
import { buildCli } from "./cli.js";

await buildCli().parseAsync(process.argv);
```

**Step 4: Run the tests and typecheck**

Run:

```bash
npm test
npm run typecheck
```

Expected: the CLI help test passes and TypeScript emits no type errors.

**Step 5: Update README MVP commands**

Document:

```bash
clawitup init
clawitup audit --scope auth
clawitup audit --ci
clawitup eval examples/evals/auth-boundary.yaml
```

**Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src tests README.md
git commit -m "Set up ClawItUp CLI harness"
```

### Task 2: Define Scope, Finding, Verification, Summary, And Policy Contracts

**Files:**
- Create: `src/schemas/scope-contract.ts`
- Create: `src/schemas/finding.ts`
- Create: `src/schemas/verification.ts`
- Create: `src/schemas/policy.ts`
- Create: `src/schemas/summary.ts`
- Create: `tests/schemas/scope-contract.test.ts`
- Create: `tests/schemas/policy.test.ts`

**Step 1: Write failing schema tests**

```ts
// tests/schemas/scope-contract.test.ts
import { describe, expect, it } from "vitest";
import { ScopeContractSchema } from "../../src/schemas/scope-contract";

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
```

```ts
// tests/schemas/policy.test.ts
import { describe, expect, it } from "vitest";
import { PolicyResultSchema } from "../../src/schemas/policy";

describe("PolicyResultSchema", () => {
  it("accepts a CI failure with explicit reasons", () => {
    const parsed = PolicyResultSchema.parse({
      result: "FAIL",
      reasons: ["confirmed high security finding"],
      blocking_finding_ids: ["RT-AUTH-001"]
    });

    expect(parsed.result).toBe("FAIL");
  });
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/schemas/scope-contract.test.ts tests/schemas/policy.test.ts
```

Expected: FAIL because schema modules do not exist.

**Step 3: Implement the Zod schemas**

Start with:

```ts
// src/schemas/scope-contract.ts
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
```

Use matching enum-heavy schemas for findings, verification results, final summaries, and policy results from the refined spec.

**Step 4: Run schema tests**

Run:

```bash
npm test -- tests/schemas
npm run typecheck
```

Expected: schema tests pass and contracts typecheck.

**Step 5: Commit**

```bash
git add src/schemas tests/schemas
git commit -m "Define ClawItUp audit contracts"
```

### Task 3: Build Scope Creation And Deterministic Gate Budgets

**Files:**
- Create: `src/runtime/scope-builder.ts`
- Create: `src/runtime/deterministic-gates.ts`
- Create: `src/runtime/git.ts`
- Create: `tests/runtime/scope-builder.test.ts`
- Create: `tests/runtime/deterministic-gates.test.ts`

**Step 1: Write failing scope-builder tests**

```ts
// tests/runtime/scope-builder.test.ts
import { describe, expect, it } from "vitest";
import { buildCiScopeContract, buildLocalScopeContract } from "../../src/runtime/scope-builder";

describe("scope builder", () => {
  it("builds a local auth scope", () => {
    const scope = buildLocalScopeContract("auth");
    expect(scope.primary_scope).toEqual(["auth"]);
    expect(scope.mode).toBe("local_scope");
  });

  it("caps CI changed files before audit work starts", () => {
    const scope = buildCiScopeContract(
      Array.from({ length: 40 }, (_, index) => `src/file-${index}.ts`)
    );

    expect(scope.primary_scope.length).toBeLessThanOrEqual(24);
    expect(scope.explicitly_out_of_scope.join(" ")).toContain("oversized diff");
  });
});
```

**Step 2: Write failing gate-budget tests**

```ts
// tests/runtime/deterministic-gates.test.ts
import { describe, expect, it } from "vitest";
import { takeBoundedGateResults } from "../../src/runtime/deterministic-gates";

describe("deterministic gates", () => {
  it("truncates search results to the scope budget", () => {
    const results = takeBoundedGateResults(["a", "b", "c"], 2);
    expect(results).toEqual(["a", "b"]);
  });
});
```

**Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/runtime/scope-builder.test.ts tests/runtime/deterministic-gates.test.ts
```

Expected: FAIL because runtime modules do not exist.

**Step 4: Implement the minimal scope builder**

```ts
// src/runtime/scope-builder.ts
import type { ScopeContract } from "../schemas/scope-contract";

const defaultBudget = {
  graphify_related_modules: 6,
  search_result_files: 10,
  related_tests: 6,
  memory_files: 4,
  diff_hunks: 12
};

export function buildLocalScopeContract(scope: string): ScopeContract {
  return {
    mode: "local_scope",
    primary_scope: [scope],
    risk_lenses: [scope, "regression-tests"],
    allowed_context_expansion: defaultBudget,
    explicitly_out_of_scope: ["broad whole-repo audit"]
  };
}

export function buildCiScopeContract(changedFiles: string[]): ScopeContract {
  const primaryScope = changedFiles.slice(0, 24);
  const oversized = changedFiles.length > primaryScope.length;

  return {
    mode: "ci_diff",
    primary_scope: primaryScope,
    risk_lenses: ["changed-surface", "security", "regression-tests"],
    allowed_context_expansion: defaultBudget,
    explicitly_out_of_scope: oversized ? ["oversized diff remainder"] : []
  };
}
```

Implement deterministic helpers that:

- cap arrays to budgets,
- record whether results were truncated,
- extract changed files through an injected git reader,
- avoid reading full diff output into agent context by default.

**Step 5: Run runtime tests**

Run:

```bash
npm test -- tests/runtime
npm run typecheck
```

Expected: runtime scope and budget tests pass.

**Step 6: Commit**

```bash
git add src/runtime tests/runtime
git commit -m "Add bounded audit scope builder"
```

### Task 4: Create Run Artifacts And Policy Decisions

**Files:**
- Create: `src/runtime/artifact-store.ts`
- Create: `src/runtime/policy-engine.ts`
- Create: `tests/runtime/artifact-store.test.ts`
- Create: `tests/runtime/policy-engine.test.ts`

**Step 1: Write failing artifact-store test**

```ts
// tests/runtime/artifact-store.test.ts
import { describe, expect, it } from "vitest";
import { createRunLayout } from "../../src/runtime/artifact-store";

describe("artifact store", () => {
  it("returns required run paths", () => {
    const layout = createRunLayout("/tmp/clawitup", "run-001");
    expect(layout.scopeContract).toContain("scope-contract.json");
    expect(layout.policyResult).toContain("policy-result.json");
  });
});
```

**Step 2: Write failing policy tests**

```ts
// tests/runtime/policy-engine.test.ts
import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/runtime/policy-engine";

describe("policy engine", () => {
  it("fails for a confirmed high security finding", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [{ id: "RT-AUTH-001", status: "CONFIRMED", severity: "high" }]
    });

    expect(result.result).toBe("FAIL");
  });

  it("warns for human review without a blocking finding", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [{ id: "RT-AUTH-002", status: "NEEDS_HUMAN_REVIEW", severity: "medium" }]
    });

    expect(result.result).toBe("WARN");
  });
});
```

**Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/runtime/artifact-store.test.ts tests/runtime/policy-engine.test.ts
```

Expected: FAIL because artifact and policy modules do not exist.

**Step 4: Implement artifact paths and policy decisions**

Implement `createRunLayout()` with stable run paths for:

- task context,
- scope contract,
- gate logs,
- Red Team findings,
- verification output,
- Blue Team handoff,
- final ship report,
- policy result,
- summary.

Implement `evaluatePolicy()` with the MVP rules:

```ts
if (!input.filter_completed || !input.required_artifacts_valid) return fail(...);
if (input.verified_findings.some(isBlockingFinding)) return fail(...);
if (input.verified_findings.some(needsHumanReview)) return warn(...);
return pass(...);
```

**Step 5: Run runtime tests**

Run:

```bash
npm test -- tests/runtime/artifact-store.test.ts tests/runtime/policy-engine.test.ts
npm run typecheck
```

Expected: artifact and policy tests pass.

**Step 6: Commit**

```bash
git add src/runtime tests/runtime
git commit -m "Add audit artifacts and policy engine"
```

### Task 5: Initialize Git-Native Agent Files And Repo Memory

**Files:**
- Create: `src/commands/init.ts`
- Create: `src/runtime/templates.ts`
- Create: `tests/commands/init.test.ts`
- Create: `RULES.md`
- Create: `DUTIES.md`
- Create: `skills/orchestrate-audit/SKILL.md`
- Create: `skills/red-team-audit/SKILL.md`
- Create: `skills/verify-finding/SKILL.md`
- Create: `skills/blue-team-remediation/SKILL.md`
- Create: `skills/generate-ship-report/SKILL.md`
- Create: `workflows/adversarial-audit.yaml`
- Create: `hooks/hooks.yaml`
- Create: `memory/shared/repo-profile.md`
- Create: `memory/shared/risk-register.md`
- Create: `memory/shared/false-positive-patterns.md`
- Create: `memory/shared/confirmed-bug-patterns.md`
- Create: `memory/shared/remediation-playbook.md`
- Create: `memory/shared/graphify-notes.md`
- Create: `memory/shared/run-history.md`
- Create: `memory/teams/red-team.md`
- Create: `memory/teams/filter.md`
- Create: `memory/teams/blue-team.md`
- Modify: `agent.yaml`
- Modify: `SOUL.md`
- Modify: `src/cli.ts`

**Step 1: Write failing init test**

```ts
// tests/commands/init.test.ts
import { describe, expect, it } from "vitest";
import { planInitWrites } from "../../src/commands/init";

describe("init command", () => {
  it("plans repo-level memory files", () => {
    const writes = planInitWrites("/repo").map((write) => write.path);
    expect(writes).toContain("/repo/memory/shared/repo-profile.md");
    expect(writes).toContain("/repo/memory/teams/filter.md");
  });
});
```

**Step 2: Run the init test**

Run:

```bash
npm test -- tests/commands/init.test.ts
```

Expected: FAIL because the init module does not exist.

**Step 3: Implement template planning before filesystem writes**

Expose a pure `planInitWrites()` helper for tests. Make the actual command:

- verify the target is a git repo,
- create missing Git-native files,
- avoid overwriting existing user files without explicit policy,
- initialize shared and team memory,
- print the next command.

**Step 4: Tighten agent-native files**

Make the files express approved constraints:

- raw Red Team findings never fail CI,
- Filter evidence rules,
- Graphify context rule,
- bounded memory and search reads,
- report-first MVP behavior.

**Step 5: Run init tests and typecheck**

Run:

```bash
npm test -- tests/commands/init.test.ts
npm run typecheck
```

Expected: init planning passes and the CLI command compiles.

**Step 6: Commit**

```bash
git add src/commands src/runtime/templates.ts tests/commands agent.yaml SOUL.md RULES.md DUTIES.md skills workflows hooks memory src/cli.ts
git commit -m "Initialize ClawItUp agent structure"
```

### Task 6: Orchestrate A Report-First Audit With An Injected Gitclaw Runner

**Files:**
- Create: `src/commands/audit.ts`
- Create: `src/runtime/gitclaw-runner.ts`
- Create: `src/runtime/audit-runner.ts`
- Create: `tests/commands/audit.test.ts`
- Modify: `src/cli.ts`
- Modify: `skills/orchestrate-audit/SKILL.md`
- Modify: `skills/red-team-audit/SKILL.md`
- Modify: `skills/verify-finding/SKILL.md`
- Modify: `skills/blue-team-remediation/SKILL.md`
- Modify: `workflows/adversarial-audit.yaml`

**Step 1: Write failing audit runner test**

```ts
// tests/commands/audit.test.ts
import { describe, expect, it } from "vitest";
import { runAudit } from "../../src/runtime/audit-runner";

describe("audit runner", () => {
  it("passes only verified findings into the blue-team stage", async () => {
    const stages: string[] = [];
    const result = await runAudit({
      scope: "auth",
      runner: async (stage) => {
        stages.push(stage.name);
        return stage.name === "filter"
          ? { verifiedFindingIds: ["RT-AUTH-001"] }
          : {};
      }
    });

    expect(stages).toEqual(["orchestrator", "red-team", "filter", "blue-team", "ship-report"]);
    expect(result.blueTeamInput.findingIds).toEqual(["RT-AUTH-001"]);
  });
});
```

**Step 2: Run the audit test**

Run:

```bash
npm test -- tests/commands/audit.test.ts
```

Expected: FAIL because the audit runner does not exist.

**Step 3: Implement stage orchestration**

Create:

- a typed stage definition,
- an injectable `StageRunner`,
- a real Gitclaw-backed runner wrapper,
- a report-first `runAudit()` that writes and validates stage artifacts.

Use the fake runner in tests. Keep direct SDK behavior isolated in `gitclaw-runner.ts`.

**Step 4: Wire CLI local audit mode**

Support:

```bash
clawitup audit --scope auth
clawitup audit --task examples/tasks/auth-audit.md
```

Reject broad default audit input when no scope, task, or CI mode exists.

**Step 5: Run audit tests**

Run:

```bash
npm test -- tests/commands/audit.test.ts tests/runtime
npm run typecheck
```

Expected: report-first local audit orchestration passes with fake runner coverage.

**Step 6: Commit**

```bash
git add src/commands/audit.ts src/runtime tests/commands src/cli.ts skills workflows
git commit -m "Orchestrate report-first audits"
```

### Task 7: Add CI Diff Mode And GitHub Actions Policy Gating

**Files:**
- Create: `.github/workflows/clawitup-audit.yml`
- Create: `tests/commands/audit-ci.test.ts`
- Modify: `src/commands/audit.ts`
- Modify: `src/runtime/git.ts`
- Modify: `src/runtime/policy-engine.ts`
- Modify: `README.md`

**Step 1: Write failing CI mode test**

```ts
// tests/commands/audit-ci.test.ts
import { describe, expect, it } from "vitest";
import { auditExitCode } from "../../src/commands/audit";

describe("audit ci mode", () => {
  it("returns a failing exit code for policy FAIL", () => {
    expect(auditExitCode({ result: "FAIL", reasons: [], blocking_finding_ids: [] })).toBe(1);
  });

  it("keeps warnings non-blocking", () => {
    expect(auditExitCode({ result: "WARN", reasons: [], blocking_finding_ids: [] })).toBe(0);
  });
});
```

**Step 2: Run the CI test**

Run:

```bash
npm test -- tests/commands/audit-ci.test.ts
```

Expected: FAIL because CI exit-code behavior is not implemented.

**Step 3: Implement CI audit path**

Make `clawitup audit --ci`:

- derive changed files from GitHub diff environment or local git base fallback,
- build a CI scope contract,
- run the same audit runner,
- emit policy result,
- use policy result for process exit code.

**Step 4: Add the workflow**

Start with a workflow shaped like:

```yaml
name: ClawItUp Audit

on:
  pull_request:
  push:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - run: node dist/index.js audit --ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: clawitup-runs
          path: runs/
```

Tighten auth and secret handling once the real Gitclaw execution requirements are verified.

**Step 5: Run CI-mode tests**

Run:

```bash
npm test -- tests/commands/audit-ci.test.ts tests/runtime/policy-engine.test.ts
npm run typecheck
npm run build
```

Expected: CI exit-code behavior passes and build succeeds.

**Step 6: Commit**

```bash
git add .github/workflows/clawitup-audit.yml src tests README.md
git commit -m "Add CI diff audit gate"
```

### Task 8: Add Graphify, Search, And Memory Gate Integration

**Files:**
- Create: `src/runtime/graphify.ts`
- Create: `src/runtime/memory-gate.ts`
- Create: `tests/runtime/graphify.test.ts`
- Create: `tests/runtime/memory-gate.test.ts`
- Modify: `src/runtime/deterministic-gates.ts`
- Modify: `tools/graphify.yaml`
- Create: `tools/git-diff.yaml`
- Create: `tools/rg-search.yaml`
- Create: `tools/run-tests.yaml`
- Create: `skills/run-context-gates/SKILL.md`

**Step 1: Write failing gate tests**

```ts
// tests/runtime/memory-gate.test.ts
import { describe, expect, it } from "vitest";
import { selectMemoryFiles } from "../../src/runtime/memory-gate";

describe("memory gate", () => {
  it("caps memory files by the scope budget", () => {
    const files = selectMemoryFiles(["a.md", "b.md", "c.md"], 2);
    expect(files).toEqual(["a.md", "b.md"]);
  });
});
```

```ts
// tests/runtime/graphify.test.ts
import { describe, expect, it } from "vitest";
import { graphifyMode } from "../../src/runtime/graphify";

describe("graphify", () => {
  it("degrades when graph output is unavailable", () => {
    expect(graphifyMode(false)).toBe("degraded");
  });
});
```

**Step 2: Run gate tests**

Run:

```bash
npm test -- tests/runtime/memory-gate.test.ts tests/runtime/graphify.test.ts
```

Expected: FAIL because Graphify and memory gate modules do not exist.

**Step 3: Implement bounded gates**

Implement helpers to:

- detect `graphify-out/GRAPH_REPORT.md`,
- invoke `graphify update .` when available from init or explicit refresh,
- select memory files by budget,
- record `rg` query summaries without stuffing unlimited search output into stages,
- record degraded-mode notes when Graphify or tests are unavailable.

**Step 4: Add Gitclaw tool and skill guidance**

Tool and skill guidance should enforce:

- bounded `rg` and diff use,
- Graphify is context, not proof,
- gate outputs are artifacts,
- no whole-repo context expansion by default.

**Step 5: Run runtime tests**

Run:

```bash
npm test -- tests/runtime
npm run typecheck
```

Expected: Graphify and memory gates pass in both normal and degraded-mode tests.

**Step 6: Commit**

```bash
git add src/runtime tests/runtime tools skills/run-context-gates
git commit -m "Add bounded context gates"
```

### Task 9: Build The Seeded Eval Fixture And Eval Command

**Files:**
- Create: `src/commands/eval.ts`
- Create: `src/runtime/eval-runner.ts`
- Create: `tests/commands/eval.test.ts`
- Create: `examples/vulnerable-demo-app/README.md`
- Create: `examples/vulnerable-demo-app/seeded-bugs.yaml`
- Create: `examples/vulnerable-demo-app/src/auth.ts`
- Create: `examples/vulnerable-demo-app/src/invoices.ts`
- Create: `examples/vulnerable-demo-app/tests/invoices.test.ts`
- Create: `examples/tasks/auth-audit.md`
- Create: `examples/evals/auth-boundary.yaml`
- Modify: `src/cli.ts`

**Step 1: Write failing eval scoring test**

```ts
// tests/commands/eval.test.ts
import { describe, expect, it } from "vitest";
import { scoreEval } from "../../src/runtime/eval-runner";

describe("eval scoring", () => {
  it("requires a false-positive rejection and policy result", () => {
    const result = scoreEval({
      requiredArtifacts: true,
      realBugsFound: 1,
      expectedRealBugs: 1,
      falsePositivesRejected: 1,
      outOfScopeRejected: 1,
      policyResultEmitted: true
    });

    expect(result.passed).toBe(true);
  });
});
```

**Step 2: Run the eval test**

Run:

```bash
npm test -- tests/commands/eval.test.ts
```

Expected: FAIL because eval scoring does not exist.

**Step 3: Implement eval scoring**

Score:

- required artifacts,
- seeded real bug discovery,
- seeded false-positive rejection,
- out-of-scope rejection,
- policy output,
- remediation handoff presence.

**Step 4: Create the demo fixture**

Seed:

- a real auth or tenant-boundary bug,
- a real validation bug,
- a regression-test gap,
- a plausible but false token-storage claim,
- a duplicate or overlapping finding,
- an out-of-scope issue.

**Step 5: Wire the eval command**

Support:

```bash
clawitup eval examples/evals/auth-boundary.yaml
```

Keep eval output inspectable as markdown and JSON artifacts.

**Step 6: Run eval tests**

Run:

```bash
npm test -- tests/commands/eval.test.ts
npm run typecheck
```

Expected: eval scoring and command contracts pass.

**Step 7: Commit**

```bash
git add src/commands/eval.ts src/runtime/eval-runner.ts tests/commands/eval.test.ts examples src/cli.ts
git commit -m "Add ClawItUp eval fixture"
```

### Task 10: Finish Reports, Docs, And Reproducible Demo Path

**Files:**
- Create: `src/commands/status.ts`
- Create: `src/commands/report.ts`
- Create: `src/commands/memory.ts`
- Create: `tests/commands/report.test.ts`
- Modify: `README.md`
- Modify: `CLAWITUP_V0_2_REFINED_SPEC.md`

**Step 1: Write failing report test**

```ts
// tests/commands/report.test.ts
import { describe, expect, it } from "vitest";
import { formatLatestReportSummary } from "../../src/commands/report";

describe("report command", () => {
  it("prints policy result and finding counts", () => {
    const text = formatLatestReportSummary({
      policy_result: "WARN",
      confirmed: 1,
      rejected_false_positive: 1
    });

    expect(text).toContain("WARN");
    expect(text).toContain("confirmed: 1");
  });
});
```

**Step 2: Run the report test**

Run:

```bash
npm test -- tests/commands/report.test.ts
```

Expected: FAIL because report formatting does not exist.

**Step 3: Implement status, report, and memory readers**

Keep these commands read-only in MVP:

- `clawitup status`,
- `clawitup report --latest`,
- `clawitup memory show`.

**Step 4: Tighten docs**

README should show:

- what GitAgent/Gitclaw role is,
- local scoped audit commands,
- GitHub Actions CI path,
- Graphify degraded mode,
- eval command,
- artifact locations,
- policy semantics,
- deferred work.

Keep the refined spec aligned with final command names and file paths.

**Step 5: Run verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: unit tests, typecheck, and build pass.

**Step 6: Refresh Graphify after code changes**

Run:

```bash
graphify update .
```

Expected: `graphify-out/` refreshes when Graphify is installed. If unavailable, record that verification limitation.

**Step 7: Commit**

```bash
git add src tests README.md CLAWITUP_V0_2_REFINED_SPEC.md graphify-out
git commit -m "Document ClawItUp audit demo"
```
