# ClawItUp v0.2 - Git-Native Red Team / Filter / Blue Team Audit Gate

**Status:** Build-ready MVP spec  
**Primary goal:** Ship a focused GitAgent/GitClaw-compatible adversarial audit gate that runs locally and in GitHub Actions, not a giant autonomous security platform.  
**Core thesis:** Red Team attacks. Filter demands proof. Blue Team remediates. Git remembers everything.

---

## 1. Product Summary

**ClawItUp** is a Git-native, change-aware audit gate for real software repositories.

It has two first-class entrypoints:

1. A local TypeScript CLI for deliberate scoped audits, demo runs, reports, and evals.
2. A GitHub Actions path that invokes the same CLI against PR or push diffs before code ships.

It uses a Red Team / Verification Filter / Blue Team pipeline:

1. **Scope Builder** turns a human scope, task file, PR diff, or push diff into a bounded scope contract.
2. **Orchestrator Agent** turns that scope into a focused audit plan and chooses risk lenses.
3. **Red Team agents or skills** inspect the scoped change surface for bugs, vulnerabilities, risky flows, missing tests, architecture smells, and suspicious patterns.
4. **Red Team Handoff** turns raw leads into structured findings with evidence, confidence, affected files, and suggested verification.
5. **False Positive Filter Agent** verifies or rejects every finding using code evidence, deterministic gates, Graphify context, tests, scripts, or reproducible reasoning.
6. **Blue Team Handoff** receives only confirmed or human-review-worthy issues, then produces remediation plans, patch plans, regression-test guidance, and handoff notes.
7. **Policy Gate** turns verified outcomes and pipeline health into `PASS`, `WARN`, or `FAIL` for local reporting and CI exit codes.
8. **Repo-Level Memory** stores confirmed bug patterns, rejected false positives, remediation playbooks, run history, and repo-specific context across runs.
9. **Graphify** gives agents structural repository context through `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`, and related graph queries.
10. **GitAgent/GitClaw** provides the repo-native agent structure: identity, rules, skills, tools, hooks, workflows, and memory as version-controlled files.

ClawItUp is **not** a generic PR reviewer or a production-grade vulnerability scanner. It is a disciplined adversarial engineering workflow that turns risky changes into evidence-backed ship reports and auditable git-native artifacts.

---

## 2. Compatibility Direction: How ClawItUp Aligns With GitAgent/GitClaw

The implementation must lean into the GitAgent/GitClaw model instead of becoming custom prompt spaghetti.

The upstream `open-gitagent/gitagent` project exposes the current Gitclaw runtime and SDK while aligning with the GitAgent/GAP git-native model. ClawItUp should say that clearly in docs: it follows the GitAgent/GAP model and uses the current Gitclaw runtime/SDK from the upstream GitAgent repo for execution.

Gitclaw's current documentation frames an agent as a git repository where identity, rules, memory, tools, skills, and hooks are version-controlled files. ClawItUp should use that directly.

Relevant GitClaw concepts for builders:

- `agent.yaml` configures model, tools, runtime, skills, sub-agents, compliance, and related settings.
- `SOUL.md` defines identity and mission.
- `RULES.md` defines behavioral constraints.
- `DUTIES.md` defines responsibilities.
- `AGENTS.md` describes sub-agent relationships and delegation rules.
- `skills/<skill-name>/SKILL.md` stores reusable task instructions.
- `tools/*.yaml` can define custom declarative tools backed by scripts.
- `hooks/hooks.yaml` and programmatic hooks can gate dangerous tool calls.
- `memory/` stores git-native memory that can be committed, reviewed, and updated over time.
- `workflows/*.yaml` can chain skills into multi-step flows.
- The TypeScript SDK exposes `query()` for programmatic agent runs.

**Implementation principle:**

> The ClawItUp CLI should orchestrate GitClaw. It should not replace GitClaw.

The CLI should own deterministic contracts:

```txt
clawitup CLI
  -> builds scope contract from local scope, task, or git diff
  -> prepares run directory and deterministic gate outputs
  -> invokes Gitclaw query() with the right skill/workflow
  -> validates artifact schemas and required stage outputs
  -> evaluates policy and CI exit codes
  -> summarizes run status
```

The agent brain should live in the repo-native files:

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

---

## 3. Product Positioning

### One-liner

**ClawItUp is a Git-native, change-aware audit gate where Red Team agents find issues, a Filter agent kills false positives, and Blue Team agents turn verified risks into ship decisions and remediation work.**

### Longer pitch

AI code review is noisy. ClawItUp makes it adversarial, evidence-driven, and reviewable.

Red Team agents are allowed to be suspicious. The False Positive Filter is not. It must demand proof. Blue Team agents should never receive every Red Team thought; they should receive only the smallest useful packet of confirmed context.

Every finding, rejection, verification, patch plan, policy decision, and memory update is written back into git-native artifacts.

### What makes it different

Most tools do this:

```txt
LLM reads code -> leaves comments
```

ClawItUp does this:

```txt
Graph-aware repo initialization
  -> scoped local task or PR/push diff
  -> adversarial Red Team findings
  -> structured handoff
  -> evidence-based false-positive filtering
  -> Blue Team remediation planning
  -> policy-backed ship/risk report
  -> repo memory update
```

The best demo moment should not just be “it found a bug.”

The best demo moment should be:

> Red Team submits a plausible but wrong issue, and the False Positive Filter rejects it with evidence.

That proves engineering maturity.

---

## 4. MVP Scope

The MVP is **report-first and scoped by default**, not auto-fix-first.

### MVP must ship

1. GitAgent/GitClaw-style repo structure.
2. `clawitup init` command.
3. Graphify detection or initialization.
4. `clawitup audit` command for local scopes and CI diff mode.
5. Red Team finding generation.
6. Red Team handoff artifact.
7. False Positive Filter verification artifact.
8. Blue Team remediation plan artifact.
9. Policy-backed final ship/risk report with `PASS`, `WARN`, or `FAIL`.
10. GitHub Actions workflow that runs the CLI as a change-aware shipping gate.
11. File-based repo-level shared and team memory.
12. Deterministic scope, search, artifact, and verification gates.
13. Small demo/eval repo with seeded bugs, at least one seeded false positive, and one out-of-scope temptation.
14. Basic run summary with measurable counts.

### MVP should not ship yet

These are intentionally out of scope for v0.1/v0.2:

- automatic PR creation,
- automatic GitHub issue creation,
- automatic mutation of a target repo's project `ISSUES.md` or `CHANGELOG.md`,
- automatic code patching as the default path,
- Slack/Discord API integration,
- dashboard UI,
- database-backed memory,
- branch-per-agent execution,
- fully parallel multi-agent execution,
- generic “review every file in any repo” mode,
- unattended destructive CLI commands,
- production-grade vulnerability scanner claims,
- perfect Graphify querying,
- broad graph expansion on every run,
- approval-gate-heavy workflow depending on unstable runtime behavior.

### Brutal constraint

If a feature does not help prove this pipeline, defer it:

```txt
Scope is bounded -> Red Team finds -> Filter verifies -> Blue Team plans -> Policy report is useful
```

ClawItUp may expand context only through bounded Graphify, search, test, memory, and diff gates. Broad expansion must be explicit, logged, and visible in the final report.

---

## 5. Primary User Workflow

### 5.1 Initialize ClawItUp

```bash
clawitup init
```

Expected behavior:

- verify current directory is a git repository,
- create ClawItUp/GitAgent-compatible directories if missing,
- create baseline `agent.yaml`, `SOUL.md`, `RULES.md`, `DUTIES.md`, and `AGENTS.md`,
- create `skills/`, `tools/`, `hooks/`, `workflows/`, `memory/`, and `runs/`,
- detect Graphify,
- attempt to generate or refresh `graphify-out/`,
- confirm whether `graphify-out/GRAPH_REPORT.md` and `graphify-out/graph.json` exist,
- write `memory/shared/repo-profile.md`,
- print next command to run.

Expected output:

```txt
[clawitup:init] Git repository detected
[clawitup:init] GitAgent/GitClaw structure initialized
[clawitup:init] Memory files initialized
[clawitup:init] Checking Graphify
[clawitup:init] graphify-out/GRAPH_REPORT.md found
[clawitup:init] Ready for adversarial audit
```

### 5.2 Run a focused audit

Preferred:

```bash
clawitup audit --scope auth
```

Alternative:

```bash
clawitup audit "Audit auth, RBAC, and organization boundary security"
```

Task file:

```bash
clawitup audit --task tasks/auth-audit.md
```

Important rule:

> The first version should prefer scoped audits over broad whole-repo audits.

Good scopes:

```txt
auth
api
rbac
tenant-isolation
config
secrets
tests
webhooks
```

Bad MVP scope:

```txt
Audit my whole monorepo for everything.
```

### 5.3 Run a change-aware shipping gate

The GitHub Actions path should invoke the same CLI rather than reimplement audit logic in workflow YAML.

```bash
clawitup audit --ci
```

Expected behavior:

- derive the primary scope from PR or push diff metadata,
- create a scope contract before Red Team work starts,
- select high-risk changed slices when a diff is too large,
- use bounded Graphify, `rg`, test, memory, and diff gates to expand context,
- run the same Orchestrator -> Red Team -> Filter -> Blue Team pipeline,
- emit a policy-backed ship report,
- return a CI exit code from the policy result.

The policy gate may block shipping, but raw Red Team suspicion must never fail CI.

---

## 6. Recommended Repository Structure

```txt
clawitup/
  package.json
  tsconfig.json
  README.md
  CLAWITUP_SPEC.md

  src/
    cli.ts
    commands/
      init.ts
      audit.ts
      status.ts
      report.ts
      memory.ts
      eval.ts
    runtime/
      gitclaw-runner.ts
      artifact-store.ts
      deterministic-gates.ts
      policy-engine.ts
      scope-builder.ts
      graphify.ts
      run-id.ts
    schemas/
      finding.ts
      policy.ts
      scope-contract.ts
      verification.ts
      summary.ts

  agent.yaml
  SOUL.md
  RULES.md
  DUTIES.md
  AGENTS.md

  agents/
    orchestrator/AGENT.md
    false-positive-filter/AGENT.md
    blue-team-remediation/AGENT.md
    human-handoff/AGENT.md

  skills/
    initialize-repo/SKILL.md
    run-graphify/SKILL.md
    orchestrate-audit/SKILL.md
    red-team-audit/SKILL.md
    run-context-gates/SKILL.md
    verify-finding/SKILL.md
    blue-team-remediation/SKILL.md
    generate-ship-report/SKILL.md

  tools/
    graphify.yaml
    git-diff.yaml
    rg-search.yaml
    run-tests.yaml
    write-artifact.yaml

  hooks/
    hooks.yaml
    block-dangerous-cli.sh

  workflows/
    adversarial-audit.yaml

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

  runs/
    .gitkeep

  examples/
    vulnerable-demo-app/
    tasks/
      auth-audit.md
    evals/
      auth-boundary.yaml

  .github/
    workflows/
      clawitup-audit.yml
```

---

## 7. Agent Architecture

### 7.1 Orchestrator Agent

**Mission:** Convert a user task into a scoped audit plan.

Responsibilities:

- read the scope contract created from a task, scope, or CI diff,
- read `graphify-out/GRAPH_REPORT.md` if available,
- inspect bounded git diff and gate outputs,
- inspect selected memory files,
- choose Red Team focus areas and risk lenses,
- prevent context bloat by staying inside approved expansion budgets,
- create run directory,
- produce `02-red-team-plan.md`,
- ensure raw Red Team output does not go directly to Blue Team.

Must not:

- submit findings directly to Blue Team,
- skip the Filter agent,
- ask for a whole-repo audit by default,
- request all repo memory or all graph neighbors by default,
- create vague agent assignments.

### 7.2 Red Team Agents

**Mission:** Find possible bugs, vulnerabilities, missing tests, exploit paths, and suspicious patterns.

Red Team agents may be aggressive, but must be specific.

Suggested Red Team lenses for MVP:

1. **auth and boundary** - auth, RBAC, tenant isolation, session boundaries.
2. **API and mutation** - unsafe routes, validation gaps, unexpected mutations.
3. **tests and regression gaps** - missing regression tests and weak coverage around risky flows.

These lenses may start as stage prompts and skills. They do not need heavyweight parallel sub-agents until the MVP proves the pipeline.

Later agents:

- red-team-config-secrets,
- red-team-dependency-risk,
- red-team-architecture,
- red-team-webhooks,
- red-team-data-integrity.

### 7.3 False Positive Filter Agent

**Mission:** Protect Blue Team from noise.

This is the most important agent.

The Filter must classify every finding as exactly one of:

```txt
CONFIRMED
REJECTED_FALSE_POSITIVE
NEEDS_HUMAN_REVIEW
INSUFFICIENT_EVIDENCE
DUPLICATE
OUT_OF_SCOPE
```

Rules:

1. No finding passes without evidence.
2. Code evidence beats speculation.
3. Tests or reproduction scripts beat static guessing.
4. Graphify can support navigation, but it is not proof by itself.
5. Known false-positive memory must be checked.
6. Duplicates must be merged.
7. Weak claims should not be given to Blue Team.
8. Plausible but unproven claims become `NEEDS_HUMAN_REVIEW` or `INSUFFICIENT_EVIDENCE`.

### 7.4 Blue Team Agents

**Mission:** Convert verified findings into remediation work.

MVP Blue Team behavior:

- read only confirmed and human-review findings,
- produce remediation plan,
- propose files to change,
- propose tests,
- write patch plan,
- write human handoff if risky.

Blue Team should not:

- re-litigate rejected findings,
- rewrite the entire architecture,
- patch automatically unless explicitly enabled later,
- add noisy speculative risks.

### 7.5 Policy Gate

**Mission:** Turn verified outcomes and pipeline health into a trustworthy local or CI result.

The Policy Gate reads verified findings and required artifact status. It must not read raw Red Team findings as policy input.

MVP outcomes:

| Result | Meaning |
|---|---|
| `PASS` | Audit completed and no blocking verified policy rule fired |
| `WARN` | Useful risk, incomplete proof, or human review exists without a blocking verified rule |
| `FAIL` | Verified policy risk or required audit-stage integrity failure blocks shipping |

MVP `FAIL` triggers:

- confirmed critical or high security finding covered by policy,
- confirmed cross-boundary mutation, data exposure, or secret exposure policy rule,
- Filter stage did not complete,
- required ship-report artifacts are missing or invalid.

### 7.6 Human Handoff Agent

**Mission:** Create concise human-review packets.

Output options for MVP are markdown artifacts only:

- Discord message draft,
- Slack message draft,
- GitHub issue body draft,
- PR summary draft.

No live messaging API integration in MVP.

---

## 8. Artifact Contract

Every run must create predictable artifacts.

```txt
runs/<run-id>/
  00-task.md
  01-repo-context.md
  02-red-team-plan.md
  scope-contract.json
  gates/
    gate-log.json
    diff-summary.md
    search-summary.md

  red-team/
    RT-001.md
    RT-002.md
    red-team-handoff.md
    findings.json

  verification/
    verification-report.md
    verified-findings.json
    rejected-findings.md
    generated-tests/

  blue-team/
    remediation-plan.md
    patch-plan.md
    regression-tests.md
    human-handoff.md

  final/
    ship-report.md
    policy-result.json
    summary.json
```

### 8.1 Red Team Finding Schema

Each Red Team finding should be machine-readable and human-readable.

```json
{
  "id": "RT-AUTH-001",
  "title": "Missing organization ownership check on invoice update",
  "category": "authorization",
  "severity": "high",
  "confidence": 0.72,
  "claim": "The update route appears to allow cross-organization mutation.",
  "affected_files": [
    "backend/routes/invoices.py",
    "backend/services/invoice_service.py"
  ],
  "evidence": [
    {
      "file": "backend/services/invoice_service.py",
      "symbol": "update_invoice",
      "reason": "Service updates invoice after fetching by ID; no visible organization ownership check before mutation."
    }
  ],
  "graphify_context": {
    "used": true,
    "notes": "Graph path suggests auth dependency -> invoice route -> invoice service -> invoice model."
  },
  "verification_plan": {
    "test_type": "integration",
    "steps": [
      "Create user A in org A",
      "Create invoice in org B",
      "Attempt PATCH as user A",
      "Expect 403"
    ]
  },
  "status": "UNVERIFIED"
}
```

### 8.2 Verification Schema

```json
{
  "finding_id": "RT-AUTH-001",
  "status": "CONFIRMED",
  "evidence_summary": "Generated cross-org mutation test fails; code has no service-level ownership guard.",
  "proof_type": ["code_inspection", "generated_test"],
  "blue_team_action": "PATCH_REQUIRED",
  "human_review_required": false
}
```

### 8.3 Final Summary Schema

```json
{
  "run_id": "2026-05-22-auth-audit",
  "mode": "ci_diff",
  "target": "auth",
  "red_team_findings": 5,
  "confirmed": 2,
  "rejected_false_positive": 2,
  "needs_human_review": 1,
  "duplicates": 0,
  "policy_result": "FAIL",
  "ship_decision": "DO_NOT_SHIP",
  "recommended_next_action": "Patch RT-AUTH-001 and add regression test."
}
```

### 8.4 Scope Contract Schema

Every run must build a scope contract before Red Team work begins.

```json
{
  "mode": "ci_diff",
  "primary_scope": [
    "src/auth/session.ts",
    "src/api/invoices.ts"
  ],
  "risk_lenses": [
    "auth",
    "tenant-boundary",
    "regression-tests"
  ],
  "allowed_context_expansion": {
    "graphify_related_modules": 6,
    "search_result_files": 10,
    "related_tests": 6,
    "memory_files": 4,
    "diff_hunks": 12
  },
  "explicitly_out_of_scope": [
    "whole-repo dependency audit",
    "unrelated UI review",
    "broad refactor suggestions"
  ]
}
```

If a finding cannot explain how it relates to the scope contract, the Filter must classify it `OUT_OF_SCOPE`.

---

## 9. Graphify Workflow

Graphify is a repo-context layer, not a bug oracle.

ClawItUp should use Graphify to help agents understand structure, relationships, god nodes, surprising cross-file connections, likely blast radius, and likely high-risk zones.

### Init behavior

`clawitup init` should detect Graphify and refresh graph output when the command is available:

```bash
graphify update .
```

If Graphify is not installed, the CLI should explain degraded mode and print the install or refresh guidance chosen during implementation. The audit pipeline must still work without Graphify.

Expected output:

```txt
graphify-out/
  graph.html
  GRAPH_REPORT.md
  graph.json
  cache/
```

### Required agent rule

All major agents must follow this:

```md
Before making architecture-level claims, read `graphify-out/GRAPH_REPORT.md` when available.
Use Graphify to locate relationships, not to prove vulnerabilities by itself.
A finding is not confirmed until code, tests, scripts, runtime output, or direct evidence supports it.
```

### Layer-specific usage

| Layer | Graphify usage |
|---|---|
| Orchestrator | Identify major modules, central nodes, risky graph communities |
| Red Team | Find likely attack surfaces and cross-file relationships |
| Filter | Check whether claimed paths/relationships exist |
| Blue Team | Find safer patch locations and related tests |
| Memory | Store recurring graph insights and architecture notes |

Graph structure may raise dead-code or orphan-flow hypotheses for verification. It does not confirm dead code by itself.

### 9.1 Deterministic Context and Verification Gates

ClawItUp should use cheap deterministic gates before expensive or broad context expansion.

MVP gates:

| Gate | Purpose |
|---|---|
| diff gate | derive changed files and bounded diff hunks |
| `rg` gate | search for ownership checks, auth guards, tests, symbols, and suspicious patterns |
| test gate | run existing or targeted verification tests when safe and available |
| artifact gate | validate required JSON and markdown outputs |
| Graphify gate | detect available structural context and bounded related modules |
| memory gate | select only relevant shared and team memory files |

Gate outputs must be bounded, logged under the run artifacts, and reusable from local and CI mode.

### 9.2 Scope Expansion Rules

Every stage receives only the context it needs:

| Stage | Context allowed |
|---|---|
| Orchestrator | scope contract, diff summary, Graphify report excerpt, selected memory |
| Red Team | audit plan, target files, bounded related files, selected gate outputs |
| Filter | Red Team findings, evidence targets, verification gate outputs |
| Blue Team | verified findings only and patch-relevant context |
| Policy | verified summary and artifact validity |

The Orchestrator may request bounded Graphify neighbors, bounded `rg` results, bounded related tests, bounded memory, and bounded diff hunks. It may not pull every file in a graph community, all prior runs, all tests, all memory, or whole repo source trees by default.

---

## 10. GitClaw Runtime Direction

### 10.1 Use TypeScript CLI

Recommended stack:

```txt
TypeScript
commander
zod
gitclaw
execa
fs-extra
```

### 10.2 CLI commands for MVP

```bash
clawitup init
clawitup audit --scope auth
clawitup audit --task examples/tasks/auth-audit.md
clawitup audit --ci
clawitup status
clawitup report --latest
clawitup memory show
clawitup eval examples/evals/auth-boundary.yaml
```

### 10.3 CLI commands for later

```bash
clawitup verify --run latest
clawitup blue-team --run latest
clawitup patch RT-AUTH-001
clawitup pr --latest
clawitup handoff --discord RT-AUTH-004
```

### 10.4 SDK runner concept

The CLI should eventually call GitClaw's SDK `query()` with:

- `dir` pointing at the ClawItUp agent directory,
- prompt generated from the current workflow stage,
- allowed/disallowed tools,
- pre-tool-use hooks,
- max turns,
- run ID/session ID,
- optional custom tools.

Pseudo-shape:

```ts
import { query } from "gitclaw";

for await (const msg of query({
  dir: process.cwd(),
  prompt: buildAuditPrompt({ scope, runId }),
  model: selectedModel,
  allowedTools: ["read", "write", "cli", "memory"],
  disallowedTools: ["capture_photo"],
  maxTurns: 40,
  hooks: {
    preToolUse: blockDangerousCommands
  }
})) {
  streamAndRecord(msg);
}
```

### 10.5 GitHub Actions Runtime

The first GitHub Actions integration should call the CLI in CI mode on PR or push events:

```txt
GitHub PR or push
  -> checkout code
  -> run clawitup audit --ci
  -> upload run artifacts
  -> surface policy result as the workflow result
```

The workflow should be change-aware, not a broad whole-repo audit on every change. A later Action iteration may add a PR check summary or comment, but the first workflow should prove that the CLI can gate shipping from verified policy outcomes.

### 10.6 Safety hooks

Because ClawItUp audits security, its own agent behavior must be safe.

Block by default:

```txt
rm -rf
sudo
curl | sh
wget | sh
npm publish
git push --force
docker system prune
secret exfiltration commands
arbitrary network upload commands
```

Allow by default:

```txt
ls
cat
rg
grep
git diff
git status
npm test
pnpm test
pytest
graphify query
graphify path
graphify explain
```

### 10.7 Failure Handling

Local mode should degrade honestly:

- missing Graphify output becomes a visible degraded-mode note,
- unavailable tests or verification scripts lower proof strength,
- invalid agent artifacts get one bounded repair attempt before the stage fails,
- incomplete Filter work must produce a failed audit report rather than a fake success.

CI mode must distinguish failure classes:

- **policy failure** means verified risk blocked shipping,
- **audit failure** means a required stage or artifact failed,
- **warning** means human review or incomplete evidence exists without a blocking policy rule.

---

## 11. Repo-Level Memory System

Use file-based memory first.

No database and no cross-repo global memory in MVP.

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

Shared memory stores stable repo facts, confirmed bug patterns, rejected false positives, remediation playbooks, Graphify observations, run outcomes, and policy outcomes.

Team memory stays narrower:

- Red Team memory records productive hunt patterns and recurring blind spots.
- Filter memory records proof rules, rejection patterns, and verification strategies.
- Blue Team memory records remediation patterns and regression-test handoff habits.

The MVP should prefer team-scoped memory over per-agent personal memory. Per-agent memory and portable cross-repo playbooks are later directions.

Memory writes must come from high-quality outcomes: confirmed findings, evidence-backed false-positive rejections, accepted remediation patterns, policy outcomes, or stable Graphify observations. Do not store every speculative Red Team thought.

### 11.1 `shared/repo-profile.md`

Stores stable facts about the target repo.

```md
# Repo Profile

## Stack
- Backend: FastAPI
- Frontend: React/TypeScript
- Database: PostgreSQL/Supabase

## Critical Domains
- Auth
- RBAC
- Tenant isolation
- Notifications
- Billing/invoices

## Known High-Risk Areas
- Organization boundary checks
- Realtime subscriptions
- JWT claim parsing
```

### 11.2 `shared/false-positive-patterns.md`

Stores rejected patterns that Red Team should not keep repeating.

```md
# False Positive Patterns

## FP-001: Provider-managed auth storage is not automatically token leakage
Do not report token leakage unless the application itself stores raw JWTs, refresh tokens, or secrets in unsafe storage.
```

### 11.3 `shared/confirmed-bug-patterns.md`

Stores recurring true issue types.

```md
# Confirmed Bug Patterns

## CP-001: Route-level auth without service-level ownership check
If route authentication exists but service-level tenant ownership is missing, classify as high risk in multi-tenant apps.
```

### 11.4 `shared/remediation-playbook.md`

Stores known fix strategies.

```md
# Remediation Playbook

## Tenant Isolation Fix
1. Fetch resource by ID.
2. Compare resource organization ID against current user's organization ID.
3. Return 403 before mutation if mismatch.
4. Add cross-organization regression test.
```

### 11.5 Audit Ledger Direction

The MVP should capture durable audit state in run artifacts plus repo memory:

- `shared/risk-register.md` tracks verified risks and current state,
- `shared/run-history.md` tracks run summaries and policy outcomes.

Near-term generated ledgers may add `audit-issues.md` and `audit-changelog.md`. Later integrations may sync into a target repo's own `ISSUES.md`, `CHANGELOG.md`, or GitHub Issues when the repo opts in. The MVP must not mutate project-management files automatically during CI review.

---

## 12. Evaluation Plan

ClawItUp needs evals immediately. This is how the project proves it is not just prompt glue.

### 12.1 Demo/eval fixture

Create a small vulnerable demo app:

```txt
examples/vulnerable-demo-app/
  README.md
  seeded-bugs.yaml
  src/
  tests/
```

Seed at least six cases:

1. real missing authorization check,
2. real input validation bug,
3. real missing regression test gap,
4. plausible but false token-storage issue,
5. duplicate/overlapping finding,
6. tempting out-of-scope issue that the scope gate should reject.

### 12.2 Eval dimensions

| Metric | Target for MVP |
|---|---:|
| Required artifacts generated | 100% |
| Seeded real bugs detected by Red Team | >= 60% |
| Seeded false positive rejected by Filter | >= 1 confirmed rejection |
| Confirmed findings with concrete evidence | >= 80% |
| Blue Team remediation plans with file targets | >= 80% |
| Final report generated | 100% |
| Graphify context used where available | >= 1 explicit reference |
| Out-of-scope finding rejected | >= 1 |
| Policy result emitted | 100% |

### 12.3 Eval command

```bash
clawitup eval examples/evals/auth-boundary.yaml
```

Expected output:

```md
# ClawItUp Eval Report

## Score
72/100

## Results
- Seeded bugs found: 3/4
- False positives rejected: 1/1
- Required artifacts generated: 12/12
- Blue Team remediation useful: 3/3

## Failures
- Red Team missed webhook replay issue.

## Next Improvements
- Add specialized webhook agent.
- Improve config and middleware scanning.
```

### 12.4 What counts as success

ClawItUp v0.1 succeeds if it can run on a small repo and produce:

- at least 3 Red Team findings,
- at least 1 rejected false positive with evidence,
- at least 1 confirmed issue,
- a Blue Team remediation plan,
- a final ship/risk report,
- memory updates,
- deterministic run artifacts,
- an eval case proving out-of-scope rejection,
- a policy result that can drive CI.

---

## 13. Demo Plan

### 13.1 Demo features to ship for

The demo should show:

- `clawitup init` creating the agent/memory/run structure,
- Graphify output detected or generated,
- scoped audit command,
- CI diff audit path through the same CLI,
- Red Team findings,
- Red Team handoff,
- False Positive Filter rejecting one plausible but wrong issue,
- Blue Team remediation plan for one confirmed issue,
- final ship/risk report,
- policy result from verified findings,
- memory update for the rejected false-positive pattern.

### 13.2 Demo commands

```bash
clawitup init
clawitup audit --scope auth
clawitup audit --ci
clawitup status
clawitup report --latest
clawitup memory show
```

### 13.3 Demo story

1. Show a small repo with seeded bugs.
2. Run `clawitup init`.
3. Show GitAgent/GitClaw structure and Graphify artifacts.
4. Run `clawitup audit --scope auth` locally.
5. Show the GitHub Actions workflow calling `clawitup audit --ci` for PR or push review.
6. Open Red Team handoff.
7. Open Verification report.
8. Highlight one rejected false positive.
9. Highlight one confirmed issue.
10. Open Blue Team remediation plan.
11. Open final ship report and policy result.
12. Show memory update.

### 13.4 The winning demo moment

Do not oversell auto-fixing.

Sell this:

> ClawItUp prevents AI-generated security noise from reaching remediation work.

That is the mature angle.

---

## 14. Build Phases

### Phase 0 — Foundation

Goal: Make the repo look real and aligned with GitAgent/GitClaw.

Deliverables:

- README.md,
- package setup,
- `agent.yaml`,
- identity/rules files,
- skills directory,
- memory directory,
- scope contract schema,
- deterministic gate skeletons,
- run artifact templates,
- vulnerable demo app skeleton.

### Phase 1 — Report-First Pipeline

Goal: Generate complete run artifacts without patching code.

Deliverables:

- `clawitup init`,
- `clawitup audit --scope auth`,
- `clawitup audit --ci`,
- GitHub Actions workflow invoking CI mode,
- diff-aware scope contract,
- Red Team findings,
- Red Team handoff,
- Verification report,
- Blue Team remediation plan,
- final ship report,
- `PASS`, `WARN`, or `FAIL` policy result.

### Phase 2 — Real Verification

Goal: Make the Filter more than a summarizer.

Deliverables:

- run existing tests,
- use bounded `rg`, diff, and related-test gates,
- generate temporary verification tests or scripts,
- classify based on test/code evidence,
- write rejected false-positive memory,
- produce `verified-findings.json`.

### Phase 3 — Eval Harness

Goal: Prove the workflow works.

Deliverables:

- seeded bugs YAML,
- eval command,
- scoring report,
- one demo run checked into examples,
- out-of-scope gate eval case.

### Phase 4 — Optional Patch Mode

Goal: Generate safe patches for confirmed issues.

Deliverables:

- `clawitup patch RT-ID`,
- patch plan,
- code diff,
- regression test diff,
- risk review,
- PR summary artifact.

### Phase 5 — Optional Integrations

Goal: Human handoff convenience.

Deliverables:

- Discord/Slack/GitHub issue message drafts first,
- live API integrations later.

---

## 15. Human and Agent Reading Guide

### Humans should read first

1. `README.md`
2. `CLAWITUP_SPEC.md`
3. `agent.yaml`
4. `SOUL.md`
5. `RULES.md`
6. `workflows/adversarial-audit.yaml`
7. `examples/vulnerable-demo-app/seeded-bugs.yaml`

### AI agents should read first

1. `SOUL.md`
2. `RULES.md`
3. `DUTIES.md`
4. `AGENTS.md`
5. `graphify-out/GRAPH_REPORT.md` if present
6. `memory/shared/repo-profile.md`
7. relevant skill file under `skills/`
8. current run task under `runs/<run-id>/00-task.md`

### Required external docs for implementers

- GitClaw README / Quick Start: https://github.com/open-gitagent/gitagent/blob/main/README.md
- GitClaw Documentation: https://github.com/open-gitagent/gitagent/blob/main/Documentation.md
- Graphify home/docs: https://graphify.net/
- Graphify knowledge graph guide: https://graphify.net/knowledge-graph-for-ai-coding-assistants.html

### Key docs mapping

| ClawItUp feature | GitClaw / Graphify concept to read |
|---|---|
| Agent repo layout | GitClaw README and Directory Structure |
| CLI runner | GitClaw SDK `query()` |
| Agent behavior | `SOUL.md`, `RULES.md`, `DUTIES.md`, skills |
| Workflow chain | GitClaw SkillFlows |
| Tool safety | GitClaw Hooks and built-in tools |
| Persistent memory | GitClaw Memory System |
| Repo graph context | Graphify `GRAPH_REPORT.md` and `graph.json` |
| Eval proof | ClawItUp `examples/evals/` |

---

## 16. Out-of-Scope List

For clarity, the following are not part of the first build:

- autonomous production security scanner,
- replacing human security review,
- guaranteed vulnerability discovery,
- fully unattended patching,
- broad monorepo-wide audit by default,
- SaaS product,
- dashboard,
- vector database,
- cross-repo global memory,
- Slack/Discord live bot,
- GitHub marketplace app,
- perfect parallel sub-agent swarm,
- “one-click fix everything” workflow.

This project should feel small, sharp, and real.

---

## 17. Success Criteria

The first public demo is successful if a reviewer can see:

- the repo has a GitAgent/GitClaw-native structure,
- the CLI runs,
- GitHub Actions can run the same CLI in CI diff mode,
- Graphify is integrated or gracefully detected,
- Red Team creates structured findings,
- the Filter rejects at least one false positive with evidence,
- Blue Team creates a useful remediation plan,
- artifacts are written to `runs/<run-id>/`,
- memory files update,
- eval output exists,
- the README explains how to reproduce the demo.

### Engineering success metrics

| Metric | MVP target |
|---|---:|
| CLI install/run path works on fresh clone | yes |
| `clawitup init` completes | yes |
| `clawitup audit --scope auth` completes | yes |
| `clawitup audit --ci` produces policy result | yes |
| Required artifacts generated | 100% |
| Seeded false positive rejected | >= 1 |
| Confirmed finding reaches Blue Team | >= 1 |
| Final ship report generated | yes |
| Demo can be reproduced from README | yes |

---

## 18. Final Product Identity

ClawItUp should feel like a disciplined engineering swarm, not a noisy AI scanner.

```txt
Red Team attacks.
Filter demands proof.
Blue Team fixes.
Git remembers everything.
```

The MVP should prove one thing clearly:

> ClawItUp turns messy AI bug hunting into an evidence-backed Git-native audit workflow.
