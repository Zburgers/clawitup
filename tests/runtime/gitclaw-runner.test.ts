import { describe, expect, it } from "vitest";

import { createGitclawStageRunner, type GitclawStageRunnerOptions } from "../../src/runtime/gitclaw-runner.js";
import type { AuditStageInput } from "../../src/runtime/audit-runner.js";
import type { QueryOptions } from "gitclaw";

describe("gitclaw stage runner", () => {
  it("leaves model selection to agent.yaml when no override is passed", async () => {
    const loadAgentCalls: Array<{ dir: string; model: string | undefined; env: string | undefined }> = [];
    const queryModels: Array<string | undefined> = [];

    const runner = createGitclawStageRunner({
      dir: "/tmp/clawitup",
      loadAgent: async (dir, model, env) => {
        loadAgentCalls.push({ dir, model, env });

        return {
          systemPrompt: "base system prompt",
          manifest: {
            tools: ["read", "write"],
            runtime: { max_turns: 8 }
          },
          workflows: []
        } as never;
      },
      query: async function* (options) {
        queryModels.push(options.model);
        yield {
          type: "assistant",
          content: JSON.stringify({
            report: "Agent config selected from manifest"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }
    });

    await runner({
      name: "orchestrator",
      prompt: "stage: orchestrator",
      findingIds: []
    } satisfies AuditStageInput);

    expect(loadAgentCalls).toEqual([
      {
        dir: "/tmp/clawitup",
        model: undefined,
        env: undefined
      }
    ]);
    expect(queryModels).toEqual([undefined]);
  });

  it("passes provider-prefixed model strings through unchanged", async () => {
    const loadAgentCalls: Array<{ dir: string; model: string | undefined; env: string | undefined }> = [];
    const queryModels: Array<string | undefined> = [];

    const runner = createGitclawStageRunner({
      dir: "/tmp/clawitup",
      model: "openrouter:anthropic/claude-sonnet-4.5",
      loadAgent: async (dir, model, env) => {
        loadAgentCalls.push({ dir, model, env });

        return {
          systemPrompt: "base system prompt",
          manifest: {
            tools: ["read", "write"],
            runtime: { max_turns: 8 }
          },
          workflows: []
        } as never;
      },
      query: async function* (options) {
        queryModels.push(options.model);
        yield {
          type: "assistant",
          content: JSON.stringify({
            report: "OpenRouter model selected"
          }),
          model: "openrouter:anthropic/claude-sonnet-4.5",
          provider: "openrouter",
          stopReason: "stop"
        };
      }
    });

    await runner({
      name: "red-team",
      prompt: "stage: red-team",
      findingIds: []
    } satisfies AuditStageInput);

    expect(loadAgentCalls).toEqual([
      {
        dir: "/tmp/clawitup",
        model: "openrouter:anthropic/claude-sonnet-4.5",
        env: undefined
      }
    ]);
    expect(queryModels).toEqual(["openrouter:anthropic/claude-sonnet-4.5"]);
  });

  it("captures assistant output and tool activity from the GitClaw stream", async () => {
    const seenPrompts: string[] = [];
    const runner = createGitclawStageRunner({
      dir: "/tmp/clawitup",
      loadAgent: async () =>
        ({
          systemPrompt: "base system prompt",
          manifest: {
            tools: ["read", "write"],
            runtime: { max_turns: 8 }
          },
          workflows: [
            {
              name: "adversarial-audit",
              description: "Report-first Red Team / Filter / Blue Team pipeline",
              filePath: "workflows/adversarial-audit.yaml",
              format: "yaml",
              type: "flow",
              steps: [
                { skill: "red-team-audit", prompt: "Produce plausible findings for the scoped change surface with evidence and file references." }
              ]
            }
          ]
        }) as never,
      query: (async function* (options: QueryOptions) {
        seenPrompts.push(options.prompt as string);
        yield {
          type: "tool_use",
          toolCallId: "call-1",
          toolName: "read",
          args: { file_path: "src/runtime/audit-runner.ts" }
        };
        yield {
          type: "tool_result",
          toolCallId: "call-1",
          toolName: "read",
          content: "file contents",
          isError: false
        };
        yield {
          type: "assistant",
          content: JSON.stringify({
            findingIds: ["RT-AUTH-001"],
            report: "Candidate finding",
            notes: "needs verification"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    const output = await runner({
      name: "red-team",
      prompt: "stage: red-team",
      scope: "auth",
      findingIds: []
    } satisfies AuditStageInput);

    expect(seenPrompts[0]).toContain("stage: red-team");
    expect(seenPrompts[0]).toContain("skill: red-team-audit");
    expect(output.findingIds).toEqual(["RT-AUTH-001"]);
    expect(output.assistantOutput).toContain("RT-AUTH-001");
    expect(output.toolActivity).toEqual([
      {
        type: "tool_use",
        toolCallId: "call-1",
        toolName: "read",
        args: { file_path: "src/runtime/audit-runner.ts" }
      },
      {
        type: "tool_result",
        toolCallId: "call-1",
        toolName: "read",
        content: "file contents",
        isError: false
      }
    ]);
  });

  it("surfaces an explicit stage error when the assistant response is truncated", async () => {
    const runner = createGitclawStageRunner({
      loadAgent: async () =>
        ({
          systemPrompt: "base system prompt",
          manifest: {
            tools: ["read"],
            runtime: { max_turns: 8 }
          },
          workflows: []
        }) as never,
      query: (async function* () {
        yield {
          type: "assistant",
          content: "partial response",
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "length",
          errorMessage: "max turns reached"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    const output = await runner({
      name: "ship-report",
      prompt: "stage: ship-report",
      scope: "auth",
      findingIds: []
    } satisfies AuditStageInput);

    expect(output.error?.kind).toBe("incomplete_response");
    expect(output.notes).toContain("gitclaw_error:");
    expect(output.assistantOutput).toBe("partial response");
  });
});
