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

  it("can plan a custom preferred model in agent.yaml", () => {
    const agentYaml = planInitWrites(
      "/repo",
      "repo",
      "openrouter:arcee-ai/trinity-large-thinking:free"
    ).find((write) => write.path.endsWith("agent.yaml"));

    expect(agentYaml?.content).toContain(
      'preferred: "openrouter:arcee-ai/trinity-large-thinking:free"'
    );
  });

  it("plans the target repository audit workflow", () => {
    const writes = planInitWrites("/repo");
    const workflow = writes.find((write) =>
      write.path.endsWith(".github/workflows/clawitup-audit.yml")
    );

    expect(workflow?.content).toContain("clawitup audit --ci");
    expect(workflow?.content).toContain("github:Zburgers/clawitup");
  });

  it("plans guarded red-team and verification skills", () => {
    const redTeamSkill = planInitWrites("/repo").find((write) =>
      write.path.endsWith("skills/red-team-audit/SKILL.md")
    );
    const verifyFindingSkill = planInitWrites("/repo").find((write) =>
      write.path.endsWith("skills/verify-finding/SKILL.md")
    );

    expect(redTeamSkill?.content).toContain("Verify referenced paths and symbols exist");
    expect(redTeamSkill?.content).toContain("Never invent filenames, functions, line numbers, or code patterns");
    expect(verifyFindingSkill?.content).toContain("including direct file reads when the claim names files or symbols");
    expect(verifyFindingSkill?.content).toContain("reject the finding or escalate it to human review");
  });

  it("plans bounded target repo context gates", () => {
    const writes = planInitWrites("/repo").map((write) => write.path);

    expect(writes).toContain("/repo/skills/run-context-gates/SKILL.md");
    expect(writes).toContain("/repo/tools/rg-search.yaml");
    expect(writes).toContain("/repo/tools/run-tests.mjs");
  });

  it("can plan a hidden .clawitup layout", () => {
    const writes = planInitWrites("/repo", "hidden").map((write) => write.path);
    const agentYaml = planInitWrites("/repo", "hidden").find((write) =>
      write.path.endsWith("agent.yaml")
    );

    expect(writes).toContain("/repo/.clawitup/memory/shared/repo-profile.md");
    expect(writes).toContain("/repo/.clawitup/runs/.gitkeep");
    expect(writes).toContain("/repo/tools/rg-search.yaml");
    expect(writes).toContain("/repo/.clawitup/config.json");
    expect(agentYaml?.content).toContain(".clawitup/workflows/adversarial-audit.yaml");
    expect(agentYaml?.content).toContain("shared: .clawitup/memory/shared");
    expect(agentYaml?.content).toContain("  - orchestrate-audit");
  });
});
