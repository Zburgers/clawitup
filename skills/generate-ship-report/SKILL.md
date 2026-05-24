---
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
- Call out whether any stage had to fall back to human review because code could not be directly observed.
- Keep the ship decision explicit.
