# ClawItUp

ClawItUp is a **git-native audit gate** built on top of the **GitAgent/Gitclaw framework**. The MVP is a small TypeScript CLI that will grow into a report-first Red Team / Filter / Blue Team workflow.

> 🚀 **Built for the Lyzr.ai Hiring Challenge** — using the GitAgent protocol to create an autonomous agent framework for security audits.

## About GitAgent/Gitclaw

This project uses **[GitAgent](https://github.com/open-gitagent/gitagent)** (now called **Gitclaw**), a git-native AI agent framework where:
- Your agent lives inside a git repository
- Identity, rules, memory, tools, and skills are version-controlled files
- The agent's entire state is auditable and forkable
- Perfect for building domain-specific agents (security, compliance, analysis)

**Gitclaw** enables us to:
✅ Version-control audit policies  
✅ Fork audits for different domains  
✅ Track agent decisions and reasoning  
✅ Share reproducible audit workflows  

See: https://github.com/open-gitagent/gitagent

---

## Current MVP Shape

The implementation is intentionally narrow:

```bash
clawitup init       # Initialize audit workspace
clawitup audit      # Run audits on code
clawitup status     # Show audit status
clawitup report     # Generate audit reports
clawitup memory     # Access agent memory
clawitup eval       # Run evaluation fixtures
```

## MVP Commands

```bash
clawitup init
clawitup audit --scope auth
clawitup audit --ci
clawitup eval examples/evals/auth-boundary.yaml
```

## Project Structure

```
clawitup/
├── .gitagent/           # GitAgent protocol files (agent identity)
├── src/                 # TypeScript CLI implementation
├── tools/               # Custom audit tools
├── skills/              # Reusable audit patterns
├── memory/              # Agent memory (version-controlled)
├── examples/            # Audit examples and evals
├── tests/               # Test suite
├── docs/                # Documentation
└── workflows/           # GitHub Actions workflows
```

## What This Repo Is For

- A local CLI harness in TypeScript for running Gitclaw audits
- Deterministic audit contracts and report artifacts
- Scoped local and CI diff audits
- Git-native memory and graph-aware context (roadmap)
- Reusable audit patterns as Gitclaw skills
- Version-controlled audit policies and SOD rules

## Requirements

- **Gitclaw/GitAgent** — Download from https://github.com/open-gitagent/gitagent
- Node.js 18+
- npm or yarn

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Next Steps

- [ ] Integrate with Gitclaw runtime
- [ ] Build custom audit tools
- [ ] Create evaluation evals
- [ ] Document audit patterns
- [ ] Set up CI/CD workflows

---

**Status:** Work in progress for Lyzr.ai hiring challenge  
**Framework:** [Gitclaw/GitAgent Protocol](https://github.com/open-gitagent/gitagent)
