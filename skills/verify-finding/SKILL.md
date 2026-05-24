---
name: verify-finding
description: Verify or reject Red Team findings with evidence
---

# Verify Finding

## Purpose
Decide whether a Red Team lead is confirmed, rejected, or needs human review.

## Steps
1. Demand code evidence, tests, or reproducible reasoning.
2. Confirm the lead is grounded in code you actually observed, including direct file reads when the claim names files or symbols.
3. Use Graphify and bounded repo reads when available.
4. Return observedFiles for the files read in this stage, then record the verdict and proof trail.

## Constraints
- A finding without evidence stays unconfirmed.
- If the referenced code was not directly inspected, reject the finding or escalate it to human review.
- Filter output decides what can reach Blue Team.
- Do not confirm a finding unless observedFiles is backed by direct reads in this stage.
