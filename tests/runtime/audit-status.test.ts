import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  createAuditRunLogger,
  formatAuditRunHeader,
  formatMessage,
  readAgentModelSelection
} from "../../src/runtime/audit-status.js";

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

  it("streams text deltas on one readable line instead of prefixing every token", () => {
    const stream = new PassThrough();
    let output = "";
    stream.on("data", (chunk) => {
      output += chunk.toString("utf8");
    });

    const logger = createAuditRunLogger(stream);
    const stage = {
      name: "orchestrator",
      prompt: "stage: orchestrator",
      index: 1,
      total: 5,
      findingIds: [],
      verifiedFindings: []
    } as never;

    logger.stageStart(stage);
    logger.stageMessage(stage, {
      type: "delta",
      deltaType: "text",
      content: "Hello"
    } as never);
    logger.stageMessage(stage, {
      type: "delta",
      deltaType: "text",
      content: " world"
    } as never);
    logger.stageMessage(stage, {
      type: "assistant",
      content: "Hello world",
      stopReason: "stop",
      usage: {
        totalTokens: 12
      }
    } as never);
    logger.stageEnd(stage, {
      report: "Hello world"
    });

    expect(output).toContain("[clawitup:audit] │ 1/5 orchestrator Hello world\n");
    expect(output).toContain("[clawitup:audit] 1/5 orchestrator assistant stop=stop tokens=12\n");
    expect(output).not.toContain("delta(text) Hello");
    expect(output).not.toContain("delta(text) world");
  });
});
