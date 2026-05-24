---
name: orchestrate-audit
description: Orchestrate the report-first audit pipeline
---

# Orchestrate Audit

## Purpose
Prepare the scoped handoff for the sequential report-first audit pipeline.

## Steps
1. Read the scope and list files within the scoped paths first.
2. Run Graphify after listing files to understand relationships.
3. Use rg-search only after Graphify and only within the scoped paths.
4. State the audit goal and identify hot areas for Red Team.
5. Return the scoped handoff; the CLI runs Red Team, Filter, Blue Team, and Ship Report after this stage.

## Constraints
- Raw Red Team output is not a ship-blocking signal.
- Reject or downgrade any lead that cites files, functions, or lines the model did not directly observe.
- Require file existence checks before a finding can be promoted.
- Use repository evidence before asking for broader context.
- Do not claim to run later stages; ClawItUp executes stages sequentially outside the model.
