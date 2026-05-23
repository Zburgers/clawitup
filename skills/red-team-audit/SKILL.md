---
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
4. Leave verification to the filter stage.

## Constraints
- Findings are provisional until verified.
- Do not claim CI failure from raw leads.
- Do not hand findings directly to Blue Team.
