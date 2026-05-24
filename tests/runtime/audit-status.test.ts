import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatAuditRunHeader, formatMessage, readAgentModelSelection } from "../../src/runtime/audit-status.js";

describe("audit status formatting", () => {
  it("parses the selected model and provider from agent.yaml", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "clawitup-agent-"));
    await fs.writeFile(
      path.join(dir, "agent.yaml"),
      [
        "spec_version: \"0.1.0\"",
        "model:",
        "  preferred: \"openai:gpt-4o-mini\"",
        "  fallback: []",
        ""
      ].join("\n"),
      "utf8"
    );

    await expect(readAgentModelSelection(dir)).resolves.toEqual({
      provider: "openai",
      model: "gpt-4o-mini",
      raw: "openai:gpt-4o-mini"
    });
  });

  it("formats the run header with repo, git, model, and scope details", () => {
    expect(
      formatAuditRunHeader({
        repoRoot: "/repo",
        branch: "main",
        commitSha: "abc123",
        modelSelection: {
          provider: "openai",
          model: "gpt-4o-mini",
          raw: "openai:gpt-4o-mini"
        },
        mode: "ci_diff",
        scope: ["src/auth.ts", "src/roles.ts"],
        task: "tasks/auth.md"
      })
    ).toEqual([
      "[clawitup:audit] repo=/repo",
      "[clawitup:audit] git=main @ abc123",
      "[clawitup:audit] model=openai:gpt-4o-mini provider=openai",
      "[clawitup:audit] mode=ci_diff scope=src/auth.ts, src/roles.ts task=tasks/auth.md"
    ]);
  });

  it("suppresses raw thinking deltas from the live logger", () => {
    expect(
      formatMessage({
        type: "delta",
        deltaType: "thinking",
        content: "internal reasoning"
      } as never)
    ).toBeUndefined();
  });
});
