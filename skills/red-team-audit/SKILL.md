---
name: red-team-audit
description: Find plausible findings for a scoped audit
---

# Red Team Audit

## Purpose
Find plausible defects, vulnerabilities, regressions, and risky flows.

## Steps
1. Start from the orchestrator goal and hot areas.
2. Inspect the scoped files and nearby context.
3. Verify referenced paths and symbols exist with direct file reads or diffs before naming a finding.
4. Prefer concrete evidence over broad suspicion.
5. Record each lead with files, lines, and why it matters.

## Constraints
- Findings are provisional until verified.
- Never invent filenames, functions, line numbers, or code patterns.
- If a path cannot be verified, omit it or mark it for human review.
- Do not claim CI failure from raw leads.
