# ClawItUp Audit Gate Design

**Date:** 2026-05-22
**Status:** Approved design direction
**Spec:** `CLAWITUP_V0_2_REFINED_SPEC.md`

## Goal

ClawItUp should prove that a Git-native agent can help a team ship better code without becoming a noisy generic scanner.

The first product should be a change-aware audit gate with two first-class entrypoints:

1. A TypeScript CLI for scoped local audits, reports, and evals.
2. A GitHub Actions path that invokes the same CLI against PR or push diffs.

The core promise is:

> ClawItUp turns risky code changes into evidence-backed audit artifacts before they ship.

## Product Shape

Both local and CI modes run the same pipeline:

```txt
Scope Builder
  -> Orchestrator
  -> Red Team
  -> Evidence Filter
  -> Blue Team Handoff
  -> Policy Gate
  -> Ship Report + Repo Memory
```

The local path starts from a human scope or task file:

```bash
clawitup audit --scope auth
```

The CI path starts from changed code:

```bash
clawitup audit --ci
```

The GitHub Action should call the CLI rather than duplicate audit behavior in workflow YAML.

## Runtime Split

ClawItUp follows the GitAgent/GAP git-native agent model and uses the current Gitclaw runtime/SDK exposed by the upstream GitAgent repo for execution.

Git-native files should hold the agent identity and behavior:

```txt
agent.yaml
SOUL.md
RULES.md
DUTIES.md
AGENTS.md
skills/
tools/
hooks/
workflows/
memory/
```

TypeScript should enforce deterministic contracts:

- command parsing,
- scope-contract generation,
- diff extraction,
- bounded gate execution,
- artifact schema validation,
- policy evaluation,
- eval scoring,
- CI exit codes.

Agents reason inside those contracts. Deterministic code owns the parts that must be predictable.

## Pipeline

### Scope Builder

The Scope Builder produces a scope contract before Red Team work starts. It accepts a local scope, a task file, or CI diff metadata.

It records:

- primary changed or requested scope,
- selected risk lenses,
- allowed context-expansion budgets,
- explicit out-of-scope areas.

### Orchestrator

The Orchestrator turns the scope contract into a focused audit plan.

It may read selected repo memory, bounded diff summaries, Graphify structure, and deterministic gate outputs. It may not request a whole-repo audit by default.

### Red Team

The MVP can model Red Team work as focused lenses or skills before it grows heavyweight sub-agents:

- auth and boundary review,
- API and mutation review,
- tests and regression-gap review.

Red Team output is an untrusted lead packet. Raw Red Team findings cannot fail CI and cannot go straight to Blue Team.

### Evidence Filter

The Filter is the credibility layer. It classifies every finding as:

- `CONFIRMED`,
- `REJECTED_FALSE_POSITIVE`,
- `NEEDS_HUMAN_REVIEW`,
- `INSUFFICIENT_EVIDENCE`,
- `DUPLICATE`,
- `OUT_OF_SCOPE`.

Proof should prefer targeted tests or scripts, then direct code-path evidence, then deterministic search evidence. Graphify supports navigation and relationship checks, but it is not proof by itself.

### Blue Team Handoff

Blue Team receives only confirmed or explicitly human-review-worthy findings.

The MVP should produce remediation plans, patch plans, regression-test guidance, and human handoff notes. It should not patch target code by default.

### Policy Gate

The Policy Gate reads verified findings and required artifact status.

Initial outcomes:

| Result | Meaning |
|---|---|
| `PASS` | Audit completed with no blocking verified policy rule |
| `WARN` | Human review or incomplete proof exists without a blocking rule |
| `FAIL` | Verified risk or pipeline integrity failure blocks shipping |

Initial `FAIL` rules should cover confirmed high or critical security risk, confirmed cross-boundary mutation or data exposure, incomplete Filter execution, and missing required ship-report artifacts.

## Context Control

ClawItUp must be scoped by default.

Context can expand only through bounded gates:

- Graphify related-module lookup,
- `rg` searches,
- related-test lookup,
- selected memory reads,
- bounded diff hunks,
- targeted tests or verification scripts.

Every stage gets the smallest useful packet:

| Stage | Context |
|---|---|
| Orchestrator | scope contract, diff summary, Graphify excerpt, selected memory |
| Red Team | audit plan, target files, bounded related files, selected gate outputs |
| Filter | Red Team findings, evidence targets, verification outputs |
| Blue Team | verified findings and patch-relevant context |
| Policy | verified summary and artifact validity |

Findings that cannot explain their scope relation should be classified out of scope.

## Graphify

Graphify is a repo-context accelerator.

It should help:

- map central modules and graph communities,
- expand CI diff scope conservatively,
- expose likely blast radius and related tests,
- preserve stable structural observations in repo memory.

Graph structure may raise dead-code or orphan-flow hypotheses for later verification. It must not confirm vulnerabilities or dead code on its own.

## Memory

The MVP memory layer should be repo-local.

```txt
memory/
  shared/
    repo-profile.md
    risk-register.md
    false-positive-patterns.md
    confirmed-bug-patterns.md
    remediation-playbook.md
    graphify-notes.md
    run-history.md
  teams/
    red-team.md
    filter.md
    blue-team.md
```

Shared memory stores repo facts, verified risks, false-positive patterns, remediation patterns, Graphify observations, run summaries, and policy outcomes.

Team memory should stay narrow:

- Red Team learns useful hunt patterns and blind spots.
- Filter learns proof and rejection patterns.
- Blue Team learns remediation and regression-test patterns.

Memory writes should come from confirmed findings, evidence-backed rejections, accepted remediation patterns, policy outcomes, or stable Graphify observations. Speculative Red Team notes should not accumulate in memory.

Cross-repo memory and per-agent personal memory are later directions.

## Audit Ledger Direction

The MVP should use run artifacts plus repo memory as its durable audit ledger:

- `risk-register.md` for verified risks and current state,
- `run-history.md` for run summaries and policy outcomes.

Later, ClawItUp may generate `audit-issues.md` and `audit-changelog.md`, then optionally sync to a repo's own `ISSUES.md`, `CHANGELOG.md`, or GitHub Issues when configured.

## Artifacts

Each run should write a predictable artifact tree including:

- task and repo-context notes,
- scope contract,
- deterministic gate logs,
- Red Team findings,
- Filter verification results,
- Blue Team remediation handoff,
- ship report,
- policy result,
- final summary.

Artifacts are both the demo surface and the audit trail.

## Failure Handling

Local mode should degrade honestly when Graphify or verification tools are unavailable.

CI mode must distinguish:

- policy failures,
- audit pipeline failures,
- non-blocking warnings.

The system should never invent a successful report after the Filter or required artifacts fail.

## Evaluation

The eval fixture should prove the claims of the product:

1. A real seeded vulnerability is confirmed.
2. A plausible seeded false positive is rejected with evidence.
3. A tempting out-of-scope issue is rejected by scope control.
4. Incomplete proof becomes warning or human review instead of false confirmation.
5. Policy output can drive CI.

Implementation tests should focus on deterministic contracts:

- scope generation,
- policy decisions,
- artifact validation,
- memory write eligibility,
- eval scoring,
- CI exit codes.

Agent quality should be measured through seeded evals and artifact assertions.

## Deferred Work

The first build should defer:

- default auto-patching,
- automatic PR creation,
- automatic GitHub issue creation,
- automatic mutation of project `ISSUES.md` or `CHANGELOG.md`,
- cross-repo global memory,
- dashboard UI,
- broad whole-repo scans by default,
- large parallel swarms,
- strong dead-code detection claims without verification.
