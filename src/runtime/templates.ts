import type { ClawitupLayoutMode } from "./layout.js";

export type TemplateFile = {
  relativePath: string;
  content: string;
  sourceAsset?: string;
};

export type InitTemplateOptions = {
  preferredModel?: string;
};

function layoutPath(mode: ClawitupLayoutMode, relativePath: string): string {
  return mode === "hidden" ? `.clawitup/${relativePath}` : relativePath;
}

function buildAgentYaml(
  mode: ClawitupLayoutMode,
  preferredModel = "openai:gpt-4o-mini"
): string {
  return `spec_version: "0.1.0"
name: clawitup
version: "1.0.0"
description: Git-native Red Team / Filter / Blue Team audit gate
# Model entries use provider:model strings and can mix providers.
# OpenAI models use OPENAI_API_KEY, OpenRouter uses OPENROUTER_API_KEY,
# and Anthropic uses ANTHROPIC_API_KEY or ANTHROPIC_OAUTH_TOKEN.
model:
  preferred: "${preferredModel}"
  fallback:
    - "openrouter:anthropic/claude-sonnet-4.5"
    - "anthropic:claude-sonnet-4-5-20250929"
tools:
  - cli
  - read
  - write
  - memory
runtime:
  max_turns: 50
skills:
  - orchestrate-audit
  - run-context-gates
  - red-team-audit
  - verify-finding
  - blue-team-remediation
  - generate-ship-report
workflows:
  - ${layoutPath(mode, "workflows/adversarial-audit.yaml")}
hooks:
  - ${layoutPath(mode, "hooks/hooks.yaml")}
memory:
  shared: ${layoutPath(mode, "memory/shared")}
  teams: ${layoutPath(mode, "memory/teams")}
compliance:
  report_first: true
  raw_red_team_findings_do_not_fail_ci: true
`;
}

const soulMd = `# ClawItUp

You are ClawItUp, the git-native adversarial audit agent for this repository.

Mission:
- run report-first Red Team / Filter / Blue Team audits
- keep scope bounded and explicit
- write durable repo-native artifacts back into git

Principles:
- Raw Red Team findings are provisional until verification.
- Filter demands evidence before a finding can affect ship decisions.
- Blue Team only receives confirmed or human-review-worthy issues.
- Prefer repo-native files, deterministic contracts, and git history over hidden state.
- Keep memory bounded to this repository.
`;

const rulesMd = `# Rules

- Stay report-first. Do not default to patching or auto-fixing.
- Never let raw Red Team findings fail CI by themselves.
- Require evidence for every verified finding.
- Prefer Graphify context, tests, and repository files over speculation.
- Keep context reads bounded and explicit.
- Do not overwrite existing user files unless the command is told to do so.
`;

const dutiesMd = `# Duties

- Initialize the repo-native ClawItUp structure.
- Orchestrate the Red Team / Filter / Blue Team audit flow.
- Keep shared and team memory current and reviewable.
- Produce clear ship reports with policy outcomes.
- Preserve the repository as the source of truth.
`;

const agentsMd = `# ClawItUp Agents

- Orchestrator owns scope control and the final run packet.
- Red Team produces candidate findings but does not make ship decisions.
- Filter verifies or rejects findings with evidence.
- Blue Team reads verified findings and writes remediation guidance.
- Shared memory is repo-level; team memory stays narrow and reviewable.
`;

const orchestrateSkill = `---
name: orchestrate-audit
description: Orchestrate the report-first audit pipeline
---

# Orchestrate Audit

## Purpose
Drive the report-first audit pipeline from scope to ship report.

## Steps
1. Read the scope and keep it bounded.
2. Invoke Red Team to generate candidate findings.
3. Pass each candidate to verification before Blue Team sees it.
4. Produce a ship report with explicit policy outcome.

## Constraints
- Raw Red Team output is not a ship-blocking signal.
- Use repository evidence before asking for broader context.
`;

const redTeamSkill = `---
name: red-team-audit
description: Find plausible findings for a scoped audit
---

# Red Team Audit

## Purpose
Find plausible defects, vulnerabilities, regressions, and risky flows.

## Steps
1. Inspect the scoped files and nearby context.
2. Prefer concrete evidence over broad suspicion.
3. Record each lead with files, lines, and why it matters.

## Constraints
- Findings are provisional until verified.
- Do not claim CI failure from raw leads.
`;

const verifyFindingSkill = `---
name: verify-finding
description: Verify or reject Red Team findings with evidence
---

# Verify Finding

## Purpose
Decide whether a Red Team lead is confirmed, rejected, or needs human review.

## Steps
1. Demand code evidence, tests, or reproducible reasoning.
2. Use Graphify and bounded repo reads when available.
3. Record the verdict and the proof trail.

## Constraints
- A finding without evidence stays unconfirmed.
- Filter output decides what can reach Blue Team.
`;

const blueTeamSkill = `---
name: blue-team-remediation
description: Turn verified findings into remediation guidance
---

# Blue Team Remediation

## Purpose
Turn verified findings into concrete remediation guidance.

## Steps
1. Read only confirmed or human-review-worthy issues.
2. Describe the smallest useful fix plan.
3. Suggest regression checks and follow-up validation.

## Constraints
- Do not expand scope beyond the confirmed issue.
- Stay report-first unless the user asks for patching.
`;

const shipReportSkill = `---
name: generate-ship-report
description: Summarize the audit outcome as a ship report
---

# Generate Ship Report

## Purpose
Summarize the audit outcome in a clear policy-backed report.

## Steps
1. Collect verified findings and remediation notes.
2. State PASS, WARN, or FAIL with reasons.
3. Capture the next action and the smallest relevant evidence set.

## Constraints
- The report should be readable without hidden state.
- Keep the ship decision explicit.
`;

const workflowYaml = `name: adversarial-audit
description: Report-first Red Team / Filter / Blue Team pipeline
steps:
  - skill: orchestrate-audit
    prompt: Keep the audit scope bounded, initialize the report-first flow, and choose the next skill.
  - skill: red-team-audit
    prompt: Produce plausible findings for the scoped change surface with evidence and file references.
  - skill: verify-finding
    prompt: Verify or reject each finding using code evidence, tests, or reproducible reasoning.
  - skill: blue-team-remediation
    prompt: Turn only verified or human-review-worthy findings into the smallest useful remediation guidance.
  - skill: generate-ship-report
    prompt: Summarize the audit outcome as PASS, WARN, or FAIL with explicit reasons and next steps.
`;

const hooksYaml = `version: 1
hooks:
  pre_tool_use: []
`;

function buildGithubActionYaml(mode: ClawitupLayoutMode): string {
  return `name: ClawItUp Audit

on:
  pull_request:
  push:

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      GITHUB_BASE_SHA: \${{ github.event.pull_request.base.sha || github.event.before }}
      GITHUB_SHA: \${{ github.sha }}
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx --yes --package github:Zburgers/clawitup clawitup audit --ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: clawitup-runs
          path: ${layoutPath(mode, "runs/")}
`;
}

const repoProfile = `# Repo Profile

- Repository purpose: Git-native adversarial audit gate.
- Default mode: report-first and scope-bounded.
- Preferred evidence: code, tests, Graphify, and git history.
- Memory policy: keep entries short, current, and reviewable.
`;

const riskRegister = `# Risk Register

- Broad scope expansion can dilute the audit signal.
- Raw Red Team findings can be mistaken for confirmed failures.
- Unbounded memory growth can hide the current repo state.
`;

const falsePositivePatterns = `# False Positive Patterns

- Suspicious code without a reproducible failure path.
- Concurrency concerns without a shared-state proof.
- Security claims that lack a concrete exploit path.
`;

const confirmedBugPatterns = `# Confirmed Bug Patterns

- Reproducible failure with a focused test or script.
- Evidence-backed mismatch between code and contract.
- Boundary break that can be demonstrated from the repository alone.
`;

const remediationPlaybook = `# Remediation Playbook

- Confirm the smallest failing surface.
- Add the narrowest regression test that proves the fix.
- Keep the remediation aligned with the current architecture.
`;

const graphifyNotes = `# Graphify Notes

- Check graphify-out/GRAPH_REPORT.md when it exists.
- Prefer graph-aware context only when it helps the bounded scope.
- Do not treat graph expansion as a substitute for evidence.
`;

const runHistory = `# Run History

- Record the date, scope, outcome, and any follow-up links.
- Keep entries terse enough to scan quickly.
`;

const teamRed = `# Red Team

- Hunt for plausible defects and risky flows.
- Prefer concrete evidence over speculation.
- Hand findings to verification before they affect ship decisions.
`;

const teamFilter = `# Filter

- Verify or reject every finding with evidence.
- Keep only confirmed or human-review-worthy issues.
- Preserve the proof trail for each verdict.
`;

const teamBlue = `# Blue Team

- Turn confirmed issues into remediation guidance.
- Keep the fix plan small and testable.
- Stay within the verified scope.
`;

function hiddenLayoutConfig(): string {
  return `${JSON.stringify({ layout: "hidden" }, null, 2)}\n`;
}

export function getInitTemplateFiles(
  mode: ClawitupLayoutMode = "repo",
  options: InitTemplateOptions = {}
): TemplateFile[] {
  const preferredModel = options.preferredModel ?? "openai:gpt-4o-mini";
  const files: TemplateFile[] = [
    { relativePath: "agent.yaml", content: buildAgentYaml(mode, preferredModel) },
    { relativePath: "SOUL.md", content: soulMd },
    { relativePath: "RULES.md", content: rulesMd },
    { relativePath: "DUTIES.md", content: dutiesMd },
    { relativePath: "AGENTS.md", content: agentsMd },
    { relativePath: "skills/orchestrate-audit/SKILL.md", content: orchestrateSkill },
    { relativePath: "skills/red-team-audit/SKILL.md", content: redTeamSkill },
    { relativePath: "skills/verify-finding/SKILL.md", content: verifyFindingSkill },
    { relativePath: "skills/blue-team-remediation/SKILL.md", content: blueTeamSkill },
    { relativePath: "skills/generate-ship-report/SKILL.md", content: shipReportSkill },
    { relativePath: layoutPath(mode, "workflows/adversarial-audit.yaml"), content: workflowYaml },
    { relativePath: layoutPath(mode, "hooks/hooks.yaml"), content: hooksYaml },
    { relativePath: "skills/run-context-gates/SKILL.md", content: "", sourceAsset: "skills/run-context-gates/SKILL.md" },
    { relativePath: "tools/git-diff.yaml", content: "", sourceAsset: "tools/git-diff.yaml" },
    { relativePath: "tools/git-diff.mjs", content: "", sourceAsset: "tools/git-diff.mjs" },
    { relativePath: "tools/graphify.yaml", content: "", sourceAsset: "tools/graphify.yaml" },
    { relativePath: "tools/graphify.mjs", content: "", sourceAsset: "tools/graphify.mjs" },
    { relativePath: "tools/rg-search.yaml", content: "", sourceAsset: "tools/rg-search.yaml" },
    { relativePath: "tools/rg-search.mjs", content: "", sourceAsset: "tools/rg-search.mjs" },
    { relativePath: "tools/run-tests.yaml", content: "", sourceAsset: "tools/run-tests.yaml" },
    { relativePath: "tools/run-tests.mjs", content: "", sourceAsset: "tools/run-tests.mjs" },
    { relativePath: ".github/workflows/clawitup-audit.yml", content: buildGithubActionYaml(mode) },
    { relativePath: layoutPath(mode, "memory/shared/repo-profile.md"), content: repoProfile },
    { relativePath: layoutPath(mode, "memory/shared/risk-register.md"), content: riskRegister },
    { relativePath: layoutPath(mode, "memory/shared/false-positive-patterns.md"), content: falsePositivePatterns },
    { relativePath: layoutPath(mode, "memory/shared/confirmed-bug-patterns.md"), content: confirmedBugPatterns },
    { relativePath: layoutPath(mode, "memory/shared/remediation-playbook.md"), content: remediationPlaybook },
    { relativePath: layoutPath(mode, "memory/shared/graphify-notes.md"), content: graphifyNotes },
    { relativePath: layoutPath(mode, "memory/shared/run-history.md"), content: runHistory },
    { relativePath: layoutPath(mode, "memory/teams/red-team.md"), content: teamRed },
    { relativePath: layoutPath(mode, "memory/teams/filter.md"), content: teamFilter },
    { relativePath: layoutPath(mode, "memory/teams/blue-team.md"), content: teamBlue },
    { relativePath: layoutPath(mode, "runs/.gitkeep"), content: "" }
  ];

  if (mode === "hidden") {
    files.push({ relativePath: ".clawitup/config.json", content: hiddenLayoutConfig() });
  }

  return files;
}
