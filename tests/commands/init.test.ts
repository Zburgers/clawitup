import { describe, expect, it } from "vitest";
import { planInitWrites } from "../../src/commands/init.js";

describe("init command", () => {
  it("plans repo-level memory files", () => {
    const writes = planInitWrites("/repo").map((write) => write.path);

    expect(writes).toContain("/repo/memory/shared/repo-profile.md");
    expect(writes).toContain("/repo/memory/teams/filter.md");
  });

  it("plans provider-aware agent model entries and keys", () => {
    const agentYaml = planInitWrites("/repo").find((write) => write.path.endsWith("agent.yaml"));

    expect(agentYaml?.content).toContain('preferred: "openai:gpt-4o-mini"');
    expect(agentYaml?.content).toContain('openrouter:anthropic/claude-sonnet-4.5');
    expect(agentYaml?.content).toContain('anthropic:claude-sonnet-4-5-20250929');
    expect(agentYaml?.content).toContain('OPENROUTER_API_KEY');
    expect(agentYaml?.content).toContain('ANTHROPIC_API_KEY');
  });

  it("plans the target repository audit workflow", () => {
    const writes = planInitWrites("/repo");
    const workflow = writes.find((write) =>
      write.path.endsWith(".github/workflows/clawitup-audit.yml")
    );

    expect(workflow?.content).toContain("clawitup audit --ci");
    expect(workflow?.content).toContain("github:Zburgers/clawitup");
  });

  it("plans bounded target repo context gates", () => {
    const writes = planInitWrites("/repo").map((write) => write.path);

    expect(writes).toContain("/repo/skills/run-context-gates/SKILL.md");
    expect(writes).toContain("/repo/tools/rg-search.yaml");
    expect(writes).toContain("/repo/tools/run-tests.mjs");
  });
});
