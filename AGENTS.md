# graphify
- **graphify** (`~/.Codex/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

--- project-doc ---

# ClawItUp Agents

- Orchestrator owns scope control and the hot-area handoff only.
- ClawItUp runs stages sequentially; no model stage actively drives the rest of the workflow.
- Red Team produces candidate findings but does not make ship decisions.
- Filter verifies or rejects findings with evidence.
- Blue Team reads verified findings and writes remediation guidance.
- Red Team and Filter must return observedFiles backed by successful read tool results when promoting or verifying findings.
- Shared memory is repo-level; team memory stays narrow and reviewable.
