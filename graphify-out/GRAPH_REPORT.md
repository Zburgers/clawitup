# Graph Report - clawitup  (2026-05-22)

## Corpus Check
- 24 files · ~11,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 292 nodes · 292 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bdf9a87e`
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

## God Nodes (most connected - your core abstractions)
1. `ClawItUp v0.2 - Git-Native Red Team / Filter / Blue Team Audit Gate` - 19 edges
2. `ClawItUp Audit Gate Design` - 13 edges
3. `Planning Notes` - 11 edges
4. `10. GitClaw Runtime Direction` - 8 edges
5. `Task 1: Establish The TypeScript CLI Test Harness` - 8 edges
6. `🧠 Brainstorming: ClawItUp Project Ideas` - 7 edges
7. `7. Agent Architecture` - 7 edges
8. `11. Repo-Level Memory System` - 7 edges
9. `14. Build Phases` - 7 edges
10. `Pipeline` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (29 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (27): 💡 Brainstorm Categories, 🧠 Brainstorming: ClawItUp Project Ideas, Category A: Developer Productivity Tools, Category B: Team Collaboration & Workflow, Category C: AI Agent Infrastructure, Category D: Knowledge & Learning, Category E: Niche/Creative Ideas, 🤔 Evaluation Criteria (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): ClawItUp Audit Gate Implementation Plan, code:ts (// tests/runtime/scope-builder.test.ts), code:ts (// tests/runtime/deterministic-gates.test.ts), code:bash (npm test -- tests/runtime/scope-builder.test.ts tests/runtim), code:ts (// src/runtime/scope-builder.ts), code:bash (npm test -- tests/runtime), code:bash (git add src/runtime tests/runtime), code:ts (// tests/runtime/artifact-store.test.ts) (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): 15. Human and Agent Reading Guide, 16. Out-of-Scope List, 17. Success Criteria, 18. Final Product Identity, 1. Product Summary, 2. Compatibility Direction: How ClawItUp Aligns With GitAgent/GitClaw, 4. MVP Scope, 6. Recommended Repository Structure (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): Artifacts, Audit Ledger Direction, Blue Team Handoff, ClawItUp Audit Gate Design, code:txt (Scope Builder), code:bash (clawitup audit --scope auth), code:bash (clawitup audit --ci), code:txt (agent.yaml) (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (15): 10.1 Use TypeScript CLI, 10.2 CLI commands for MVP, 10.3 CLI commands for later, 10.4 SDK runner concept, 10.5 GitHub Actions Runtime, 10.6 Safety hooks, 10.7 Failure Handling, 10. GitClaw Runtime Direction (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (12): 5.1 Initialize ClawItUp, 5.2 Run a focused audit, 5.3 Run a change-aware shipping gate, 5. Primary User Workflow, code:bash (clawitup audit --task tasks/auth-audit.md), code:txt (auth), code:txt (Audit my whole monorepo for everything.), code:bash (clawitup audit --ci) (+4 more)

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
Cohesion: 0.29
Nodes (6): ClawItUp, code:bash (clawitup init), code:bash (npm install), Development, MVP commands, What this repo is for

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (7): code:bash (npm test -- tests/schemas/scope-contract.test.ts tests/schem), code:ts (// src/schemas/scope-contract.ts), code:bash (npm test -- tests/schemas), code:bash (git add src/schemas tests/schemas), code:ts (// tests/schemas/scope-contract.test.ts), code:ts (// tests/schemas/policy.test.ts), Task 2: Define Scope, Finding, Verification, Summary, And Policy Contracts

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (6): 13.1 Demo features to ship for, 13.2 Demo commands, 13.3 Demo story, 13.4 The winning demo moment, 13. Demo Plan, code:bash (clawitup init)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): Finding, FindingSchema, FindingSeveritySchema, FindingStatusSchema, PolicyResult, PolicyResultSchema, parsed, Summary (+3 more)

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
Cohesion: 0.47
Nodes (3): cli, names, buildCli()

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (10): buildCiScopeContract(), buildLocalScopeContract(), DEFAULT_EXPANSION_BUDGET, inferRiskLenses(), scope, ExpansionBudgetSchema, ScopeContract, ScopeContractSchema (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (6): 3. Product Positioning, code:txt (LLM reads code -> leaves comments), code:txt (Graph-aware repo initialization), Longer pitch, One-liner, What makes it different

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (3): BoundedGateResults, takeBoundedGateResults(), result

## Knowledge Gaps
- **188 isolated node(s):** `ScopeModeSchema`, `ExpansionBudgetSchema`, `FindingSchema`, `Finding`, `Verification` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ClawItUp v0.2 - Git-Native Red Team / Filter / Blue Team Audit Gate` connect `Community 2` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 14`, `Community 18`, `Community 26`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `Planning Notes` connect `Community 1` to `Community 11`, `Community 13`, `Community 16`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `10. GitClaw Runtime Direction` connect `Community 4` to `Community 2`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `ScopeModeSchema`, `ExpansionBudgetSchema`, `FindingSchema` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._