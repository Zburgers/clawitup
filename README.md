# ClawItUp

ClawItUp is a Git-native adversarial audit gate built on the GitAgent/Gitclaw runtime and SDK.

It is designed to run a report-first pipeline:

```txt
bounded scope -> orchestrator -> red team -> filter -> blue team -> ship report -> policy
```

The CLI orchestrates deterministic contracts and artifacts. Gitclaw provides the live agent runtime and tool execution.

## Release

- Current release: `v1.0.0`
- Runtime target: Node.js `22+`
- Upstream runtime reference: <https://github.com/open-gitagent/gitagent>

## Runtime Shape

`clawitup init` configures the current git repository with a repo-native agent layout. Use `--force` to overwrite existing ClawItUp-managed scaffold files, and `--model <provider:model-id>` to write the preferred `agent.yaml` model:

```bash
clawitup init --force
clawitup init --model openrouter:openai/gpt-oss-120b:free
```

```txt
agent.yaml
SOUL.md
RULES.md
DUTIES.md
skills/
tools/
hooks/
workflows/
memory/
runs/
.github/workflows/clawitup-audit.yml
```

## How ClawItUp Uses Gitclaw SDK

ClawItUp uses SDK-level calls from `gitclaw` in the runtime layer:

- `loadAgent(dir, model?, env?)` to resolve repo agent config and workflow/skill metadata.
- `query(options)` to execute each audit stage with live streaming messages.

Key implementation points:

- [gitclaw-runner.ts](/home/naki/Desktop/itsthatnewshit/clawitup/src/runtime/gitclaw-runner.ts)
- [audit-runner.ts](/home/naki/Desktop/itsthatnewshit/clawitup/src/runtime/audit-runner.ts)
- [audit-status.ts](/home/naki/Desktop/itsthatnewshit/clawitup/src/runtime/audit-status.ts)

The runtime streams and captures:

- phase start/end
- assistant deltas
- tool calls/results
- stage-level assistant output
- explicit stage errors

## Skills Used In The Audit Workflow

Default stage-to-skill mapping:

1. `orchestrator` -> `orchestrate-audit`
2. `red-team` -> `red-team-audit`
3. `filter` -> `verify-finding`
4. `blue-team` -> `blue-team-remediation`
5. `ship-report` -> `generate-ship-report`

Workflow file:

- [adversarial-audit.yaml](/home/naki/Desktop/itsthatnewshit/clawitup/workflows/adversarial-audit.yaml)

## Install

From this ClawItUp checkout:

```bash
./install.sh /absolute/path/to/target-git-repo
```

Installer behavior:

1. Verifies target is a git repository.
2. Installs dependencies and builds local CLI.
3. Links `clawitup` locally.
4. Runs `clawitup init` in the target repo.
5. Prints next-step commands.

Manual development install:

```bash
npm install
npm run build
npm link
cd /absolute/path/to/target-git-repo
clawitup init
```

## Model And Provider Configuration

ClawItUp model routing is controlled by `agent.yaml` using `provider:model-id` strings.
`agent.yaml` is the default source of truth for audits unless you pass `--model` on `clawitup audit` for a one-run override.

Example:

```yaml
model:
  preferred: "openrouter:openai/gpt-oss-120b:free"
  fallback:
    - "openai:gpt-4o-mini"
    - "anthropic:claude-sonnet-4-5-20250929"
```

Set the environment variable matching your selected provider:

| Provider | Environment variable(s) |
|---|---|
| OpenAI | `OPENAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` |
| Google | `GOOGLE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| xAI | `XAI_API_KEY` |

Notes:

- `clawitup init --model <provider:model-id>` writes the preferred `agent.yaml` model.
- `clawitup audit --model <provider:model-id>` overrides the preferred model for that run only.
- If `model` is omitted at SDK call-site, ClawItUp defers model selection to `agent.yaml`.
- If `model` is passed, ClawItUp forwards it unchanged.

## Running The CLI

Local scope audit:

```bash
clawitup audit --scope auth
```

Task-file scoped audit:

```bash
clawitup audit --task tasks/auth-audit.md
```

CI diff audit:

```bash
clawitup audit --ci
```

Status/report:

```bash
clawitup status
clawitup report
clawitup report --run <run-id>
clawitup memory show
```

`status` prints the selected run, `artifacts: <run-root>`, and whether the ship report and policy artifact exist. `report` prints the same run and artifact root before the latest ship report body.

`clawitup audit` is report-first and read-only: it produces audit artifacts and a final ship report, but does not patch the repo.

## Live TUI Output

`clawitup audit` prints live progress so runs do not appear hung.

You will see:

- run header (`repo`, `branch`, `commit`, `model`, mode/scope)
- colored numbered stage progress like `◐ 1/5 orchestrator`, `✓ 2/5 red-team`
- phase transitions
- readable live assistant text streamed as a single stage block instead of token-per-line log spam
- colored tool/system activity per phase
- final policy plus clearer artifact paths for `runs/<run-id>/`, `ship_report`, `verification`, and `summary`

## Output Artifacts

Each run writes to `runs/<run-id>/`:

```txt
runs/<run-id>/
  task-context.json
  scope-contract.json
  gate-logs.jsonl
  red-team-findings.json
  verification-output.json
  blue-team-handoff.md
  final-ship-report.md
  policy-result.json
  summary.json
```

Example real run in `mdview`:

- [runs/20260523170801996](/home/naki/Desktop/itsthatnewshit/mdview/runs/20260523170801996)
- [red-team-findings.json](/home/naki/Desktop/itsthatnewshit/mdview/runs/20260523170801996/red-team-findings.json)
- [verification-output.json](/home/naki/Desktop/itsthatnewshit/mdview/runs/20260523170801996/verification-output.json)
- [final-ship-report.md](/home/naki/Desktop/itsthatnewshit/mdview/runs/20260523170801996/final-ship-report.md)

## Testing On Real Repositories

Recommended flow:

1. Initialize target repo:
```bash
clawitup init --force
```
2. Choose bounded area first:
```bash
clawitup audit --scope src/lib
```
3. Inspect artifacts under `runs/<run-id>/`.
4. Run `clawitup report --run <run-id>`.
5. For CI validation, open a PR and let `.github/workflows/clawitup-audit.yml` run `clawitup audit --ci`.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Out Of Scope (v1.0.0)

The following are intentionally not shipped in `v1.0.0`:

- automatic patch application as default behavior
- automatic issue/PR creation
- Slack/Discord integrations
- dashboard UI
- fully parallel multi-agent branch execution
- database-backed memory system
- whole-repo unbounded audit mode by default
- production-grade vulnerability scanner claims
