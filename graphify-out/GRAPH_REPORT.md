# Graph Report - clawitup  (2026-05-24)

## Corpus Check
- 88 files · ~29,958 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 717 nodes · 990 edges · 71 communities (49 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8793e9c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]

## God Nodes (most connected - your core abstractions)
1. `ClawItUp` - 23 edges
2. `ClawItUp v1.0 - Git-Native Red Team / Filter / Blue Team Audit Gate` - 19 edges
3. `ClawItUp v0.2 - Git-Native Red Team / Filter / Blue Team Audit Gate` - 19 edges
4. `runAuditCommand()` - 14 edges
5. `ClawItUp Audit Gate Design` - 13 edges
6. `runAudit()` - 12 edges
7. `Planning Notes` - 11 edges
8. `parseAuditStageOutput()` - 10 edges
9. `runEval()` - 9 edges
10. `parseEvalFixture()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `refreshGraphify()` --calls--> `runner`  [INFERRED]
  src/runtime/graphify.ts → tests/runtime/gitclaw-runner.test.ts
- `runAudit()` --calls--> `runner`  [INFERRED]
  src/runtime/audit-runner.ts → tests/runtime/gitclaw-runner.test.ts
- `hasRequiredStageOutputs()` --calls--> `stage`  [INFERRED]
  src/commands/audit.ts → tests/runtime/audit-status.test.ts
- `writeRunArtifacts()` --calls--> `stage`  [INFERRED]
  src/commands/audit.ts → tests/runtime/audit-status.test.ts
- `runAuditCommand()` --calls--> `createRunLayout()`  [EXTRACTED]
  src/commands/audit.ts → src/runtime/artifact-store.ts

## Communities (71 total, 22 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (27): 💡 Brainstorm Categories, 🧠 Brainstorming: ClawItUp Project Ideas, Category A: Developer Productivity Tools, Category B: Team Collaboration & Workflow, Category C: AI Agent Infrastructure, Category D: Knowledge & Learning, Category E: Niche/Creative Ideas, 🤔 Evaluation Criteria (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (7): ClawItUp Audit Gate Implementation Plan, code:ts (// tests/commands/init.test.ts), code:bash (npm test -- tests/commands/init.test.ts), code:bash (npm test -- tests/commands/init.test.ts), code:bash (git add src/commands src/runtime/templates.ts tests/commands), Planning Notes, Task 5: Initialize Git-Native Agent Files And Repo Memory

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (13): 16. Out-of-Scope List, 17. Success Criteria, 18. Final Product Identity, 1. Product Summary, 2. Compatibility Direction: How ClawItUp Aligns With GitAgent/GitClaw, 6. Recommended Repository Structure, ClawItUp v0.2 - Git-Native Red Team / Filter / Blue Team Audit Gate, ClawItUp v1.0 - Git-Native Red Team / Filter / Blue Team Audit Gate (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): Artifacts, Audit Ledger Direction, Blue Team Handoff, ClawItUp Audit Gate Design, code:txt (Scope Builder), code:bash (clawitup audit --scope auth), code:bash (clawitup audit --ci), code:txt (agent.yaml) (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (15): 10.1 Use TypeScript CLI, 10.2 CLI commands for MVP, 10.3 CLI commands for later, 10.4 SDK runner concept, 10.5 GitHub Actions Runtime, 10.6 Safety hooks, 10.7 Failure Handling, 10. GitClaw Runtime Direction (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (6): 5.1 Initialize ClawItUp, 5.3 Run a change-aware shipping gate, 5. Primary User Workflow, code:bash (clawitup audit --ci), code:bash (clawitup init), code:txt ([clawitup:init] Git repository detected)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (11): 11.1 `shared/repo-profile.md`, 11.2 `shared/false-positive-patterns.md`, 11.3 `shared/confirmed-bug-patterns.md`, 11.4 `shared/remediation-playbook.md`, 11.5 Audit Ledger Direction, 11. Repo-Level Memory System, code:txt (memory/), code:md (# Repo Profile) (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.2
Nodes (10): 8.1 Red Team Finding Schema, 8.2 Verification Schema, 8.3 Final Summary Schema, 8.4 Scope Contract Schema, 8. Artifact Contract, code:txt (runs/<run-id>/), code:json ({), code:json ({) (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (9): 9.1 Deterministic Context and Verification Gates, 9.2 Scope Expansion Rules, 9. Graphify Workflow, code:bash (graphify update .), code:txt (graphify-out/), code:md (Before making architecture-level claims, read `graphify-out/), Init behavior, Layer-specific usage (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (8): 12.1 Demo/eval fixture, 12.2 Eval dimensions, 12.3 Eval command, 12.4 What counts as success, 12. Evaluation Plan, code:txt (examples/vulnerable-demo-app/), code:bash (clawitup eval examples/evals/auth-boundary.yaml), code:md (# ClawItUp Eval Report)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (8): 7.1 Orchestrator Agent, 7.2 Red Team Agents, 7.3 False Positive Filter Agent, 7.4 Blue Team Agents, 7.5 Policy Gate, 7.6 Human Handoff Agent, 7. Agent Architecture, code:txt (CONFIRMED)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (8): code:ts (// tests/cli/help.test.ts), code:json ({), code:ts (// src/cli.ts), code:ts (// src/index.ts), code:bash (npm test), code:bash (clawitup init), code:bash (git add package.json tsconfig.json vitest.config.ts src test), Task 1: Establish The TypeScript CLI Test Harness

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (40): ClawItUp, code:txt (bounded scope -> orchestrator -> red team -> filter -> blue ), code:bash (clawitup audit --task tasks/auth-audit.md), code:bash (clawitup audit --ci), code:bash (clawitup status), code:txt (runs/<run-id>/), code:txt (runs/<run-id>/), code:bash (clawitup audit --scope src/runtime) (+32 more)

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (7): code:bash (npm test -- tests/schemas/scope-contract.test.ts tests/schem), code:ts (// src/schemas/scope-contract.ts), code:bash (npm test -- tests/schemas), code:bash (git add src/schemas tests/schemas), code:ts (// tests/schemas/scope-contract.test.ts), code:ts (// tests/schemas/policy.test.ts), Task 2: Define Scope, Finding, Verification, Summary, And Policy Contracts

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (6): 13.1 Demo features to ship for, 13.2 Demo commands, 13.3 Demo story, 13.4 The winning demo moment, 13. Demo Plan, code:bash (clawitup init)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (38): normalizeVerifications(), buildRunnerErrorOutput(), buildStageContext(), buildStageError(), buildStageInstructions(), clipForPrompt(), collectToolActivity(), DISALLOWED_AUDIT_TOOLS (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (6): code:ts (// tests/commands/report.test.ts), code:bash (npm test -- tests/commands/report.test.ts), code:bash (npm test), code:bash (graphify update .), code:bash (git add src tests README.md CLAWITUP_V0_2_REFINED_SPEC.md gr), Task 10: Finish Reports, Docs, And Reproducible Demo Path

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (6): code:ts (// tests/commands/audit.test.ts), code:bash (npm test -- tests/commands/audit.test.ts), code:bash (clawitup audit --scope auth), code:bash (npm test -- tests/commands/audit.test.ts tests/runtime), code:bash (git add src/commands/audit.ts src/runtime tests/commands src), Task 6: Orchestrate A Report-First Audit With An Injected Gitclaw Runner

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (7): 14. Build Phases, Phase 0 — Foundation, Phase 1 — Report-First Pipeline, Phase 2 — Real Verification, Phase 3 — Eval Harness, Phase 4 — Optional Patch Mode, Phase 5 — Optional Integrations

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (6): code:ts (// tests/commands/eval.test.ts), code:bash (npm test -- tests/commands/eval.test.ts), code:bash (clawitup eval examples/evals/auth-boundary.yaml), code:bash (npm test -- tests/commands/eval.test.ts), code:bash (git add src/commands/eval.ts src/runtime/eval-runner.ts test), Task 9: Build The Seeded Eval Fixture And Eval Command

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (38): audit, cli, memory, names, formatMemoryShow(), MemoryEntry, MemorySnapshot, readMemorySnapshot() (+30 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (48): gateLogLines, gateLogs, policy, scope, summary, AuditCommandOptions, AuditCommandResult, auditExitCode() (+40 more)

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (6): 3. Product Positioning, code:txt (LLM reads code -> leaves comments), code:txt (Graph-aware repo initialization), Longer pitch, One-liner, What makes it different

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (18): BoundedGateResults, buildDegradedGateNote(), normalizeGateLimit(), takeBoundedGateResults(), result, defaultGraphifyRunner(), graphifyDegradedNote(), graphifyMode() (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (22): AuditStageName, AgentModelSelection, AuditRunHeader, AuditRunLogger, createAuditRunLogger(), createTerminalTheme(), execFileAsync, formatAuditRunHeader() (+14 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (23): printEvalCommand(), runEvalCommand(), result, countFixtureFindings(), EvalFinding, EvalFindingKind, EvalFixture, EvalRunResult (+15 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (22): execFileAsync, fileExists(), getGitRepoRoot(), InitOptions, InitRunResult, InitWritePlan, planInitWrites(), readTemplateContent() (+14 more)

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (8): canAccessTenant(), resolveTenantId(), Session, Invoice, invoices, listInvoices(), parseInvoiceAmount(), invoices

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (7): code:ts (// tests/runtime/scope-builder.test.ts), code:ts (// tests/runtime/deterministic-gates.test.ts), code:bash (npm test -- tests/runtime/scope-builder.test.ts tests/runtim), code:ts (// src/runtime/scope-builder.ts), code:bash (npm test -- tests/runtime), code:bash (git add src/runtime tests/runtime), Task 3: Build Scope Creation And Deterministic Gate Budgets

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (7): code:ts (// tests/runtime/artifact-store.test.ts), code:ts (// tests/runtime/policy-engine.test.ts), code:bash (npm test -- tests/runtime/artifact-store.test.ts tests/runti), code:ts (if (!input.filter_completed || !input.required_artifacts_val), code:bash (npm test -- tests/runtime/artifact-store.test.ts tests/runti), code:bash (git add src/runtime tests/runtime), Task 4: Create Run Artifacts And Policy Decisions

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (6): code:ts (// tests/commands/audit-ci.test.ts), code:bash (npm test -- tests/commands/audit-ci.test.ts), code:yaml (name: ClawItUp Audit), code:bash (npm test -- tests/commands/audit-ci.test.ts tests/runtime/po), code:bash (git add .github/workflows/clawitup-audit.yml src tests READM), Task 7: Add CI Diff Mode And GitHub Actions Policy Gating

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (6): code:ts (// tests/runtime/memory-gate.test.ts), code:ts (// tests/runtime/graphify.test.ts), code:bash (npm test -- tests/runtime/memory-gate.test.ts tests/runtime/), code:bash (npm test -- tests/runtime), code:bash (git add src/runtime tests/runtime tools skills/run-context-g), Task 8: Add Graphify, Search, And Memory Gate Integration

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (4): Blue Team Remediation, Constraints, Purpose, Steps

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (9): Finding, FindingSchema, FindingSeveritySchema, FindingStatusSchema, coerceVerification(), normalizeSeverity(), normalizeStatus(), STATUS_ALIASES (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (5): 4. MVP Scope, Brutal constraint, code:txt (Scope is bounded -> Red Team finds -> Filter verifies -> Blu), MVP must ship, MVP should not ship yet

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (4): Constraints, Generate Ship Report, Purpose, Steps

### Community 43 - "Community 43"
Cohesion: 0.4
Nodes (4): Constraints, Orchestrate Audit, Purpose, Steps

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (4): Constraints, Purpose, Red Team Audit, Steps

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (4): Constraints, Purpose, Steps, Verify Finding

### Community 47 - "Community 47"
Cohesion: 0.06
Nodes (37): blueTeamStageInputs, filterStage, stages, AuditRunEvents, AuditRunInput, AuditRunResult, AuditStageError, AuditStageErrorKind (+29 more)

### Community 64 - "Community 64"
Cohesion: 0.4
Nodes (4): ClawItUp v1.0.0, Highlights, Scope, Verified Real-Repo Run

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (6): 5.2 Run a focused audit, code:bash (clawitup audit --task tasks/auth-audit.md), code:txt (auth), code:txt (Audit my whole monorepo for everything.), code:bash (clawitup audit --scope auth), code:bash (clawitup audit "Audit auth, RBAC, and organization boundary )

### Community 66 - "Community 66"
Cohesion: 0.4
Nodes (5): 15. Human and Agent Reading Guide, AI agents should read first, Humans should read first, Key docs mapping, Required external docs for implementers

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (3): ClawItUp v1.0.1, Highlights, Verification Targets

### Community 69 - "Community 69"
Cohesion: 0.2
Nodes (3): args, limit, searchPath

## Knowledge Gaps
- **315 isolated node(s):** `DEFAULT_MEMORY_FILES`, `ScopeModeSchema`, `ExpansionBudgetSchema`, `FindingSchema`, `Finding` (+310 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runner` connect `Community 47` to `Community 27`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `refreshGraphify()` connect `Community 27` to `Community 47`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `runAudit()` connect `Community 47` to `Community 21`, `Community 15`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `DEFAULT_MEMORY_FILES`, `ScopeModeSchema`, `ExpansionBudgetSchema` to the rest of the system?**
  _315 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._