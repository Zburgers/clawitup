# ClawItUp

ClawItUp is a git-native audit gate. The MVP is a small TypeScript CLI that will grow into a report-first Red Team / Filter / Blue Team workflow.

The current shape is intentionally narrow:

- `clawitup init`
- `clawitup audit`
- `clawitup status`
- `clawitup report`
- `clawitup memory`
- `clawitup eval`

The implementation is based on the current Gitclaw naming used by the upstream GitAgent project, so the repo stays aligned with the documented runtime and SDK instead of an older `.gitagent` scaffold.

## MVP commands

```bash
clawitup init
clawitup audit --scope auth
clawitup audit --ci
clawitup eval examples/evals/auth-boundary.yaml
```

## What this repo is for

- a local CLI harness in TypeScript
- deterministic audit contracts and report artifacts
- scoped local and CI diff audits
- git-native memory and graph-aware context later in the roadmap

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```
