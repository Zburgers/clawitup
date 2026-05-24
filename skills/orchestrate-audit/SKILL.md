---
name: orchestrate-audit
description: Orchestrate the report-first audit pipeline
---

# Orchestrate Audit

## Purpose
Drive the report-first audit pipeline from scope to ship report.

## Steps
1. Read the scope and keep it bounded.
2. Explore the scope, state the audit goal, and identify hot areas for Red Team.
3. Pass each candidate to verification before Blue Team sees it.
4. Produce a ship report with explicit policy outcome.

## Constraints
- Raw Red Team output is not a ship-blocking signal.
- Reject or downgrade any lead that cites files, functions, or lines the model did not directly observe.
- Require file existence checks before a finding can be promoted.
- Use repository evidence before asking for broader context.
