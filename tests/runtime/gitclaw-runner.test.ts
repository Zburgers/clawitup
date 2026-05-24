import { describe, expect, it } from "vitest";

import { createGitclawStageRunner, type GitclawStageRunnerOptions } from "../../src/runtime/gitclaw-runner.js";
import type { AuditStageInput } from "../../src/runtime/audit-runner.js";
import type { QueryOptions } from "gitclaw";

function buildStageInput(overrides: Partial<AuditStageInput>): AuditStageInput {
  return {
    name: "orchestrator",
    prompt: "stage: orchestrator",
    index: 1,
    total: 5,
    findingIds: [],
    verifiedFindings: [],
    ...overrides
  };
}

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
            goal: "Map the scope for audit",
            hotAreas: ["src/runtime/audit-runner.ts", "src/runtime/gitclaw-runner.ts"],
            report: "Agent config selected from manifest"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }
    });

    await runner(buildStageInput({}));

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
          type: "tool_use",
          toolCallId: "call-1",
          toolName: "read",
          args: { file_path: "src/runtime/gitclaw-runner.ts" }
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
            report: "OpenRouter model selected"
          }),
          model: "openrouter:anthropic/claude-sonnet-4.5",
          provider: "openrouter",
          stopReason: "stop"
        };
      }
    });

    await runner(
      buildStageInput({
        name: "red-team",
        prompt: "stage: red-team"
      })
    );

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
    const seenAllowedTools: Array<QueryOptions["allowedTools"]> = [];
    const seenSuffixes: Array<QueryOptions["systemPromptSuffix"]> = [];
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
                {
                  skill: "red-team-audit",
                  prompt: "Start from the orchestrator goal and hot areas, then produce plausible findings for the scoped change surface with evidence, direct file observations, and file references that were verified in the repo."
                }
              ]
            }
          ]
        }) as never,
      query: (async function* (options: QueryOptions) {
        seenPrompts.push(options.prompt as string);
        seenAllowedTools.push(options.allowedTools);
        seenSuffixes.push(options.systemPromptSuffix);
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

    const output = await runner(
      buildStageInput({
        name: "red-team",
        prompt: [
          "stage: red-team",
          "skill: red-team-audit",
          "workflow: adversarial-audit",
          "report_first: true",
          "handoff: use the orchestrator task/goal/hot-area handoff to generate provisional findings for filter verification"
        ].join("\n"),
        scope: "auth"
      })
    );

    expect(seenPrompts[0]).toContain("stage: red-team");
    expect(seenPrompts[0]).toContain("skill: red-team-audit");
    expect(seenPrompts[0]).toContain("handoff: use the orchestrator task/goal/hot-area handoff to generate provisional findings for filter verification");
    expect(seenAllowedTools[0]).toEqual(["read", "git-diff", "graphify", "rg-search", "run-tests"]);
    expect(seenSuffixes[0]).toContain("Do not write files, save memory, create workspace artifacts, or modify the repository.");
    expect(seenSuffixes[0]).toContain("Start from the orchestrator goal and hot areas");
    expect(seenSuffixes[0]).toContain("direct file observations");
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

  it("injects file-read requirements into the filter stage prompt", async () => {
    const seenSuffixes: Array<QueryOptions["systemPromptSuffix"]> = [];
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
                {
                  skill: "verify-finding",
                  prompt: "Verify or reject each finding using code evidence, tests, or reproducible reasoning. If the claimed file or symbol was not directly observed, reject the finding or mark it for human review."
                }
              ]
            }
          ]
        }) as never,
      query: (async function* (options: QueryOptions) {
        seenSuffixes.push(options.systemPromptSuffix);
        yield {
          type: "tool_use",
          toolCallId: "call-1",
          toolName: "read",
          args: { file_path: "src/runtime/gitclaw-runner.ts" }
        };
        yield {
          type: "assistant",
          content: JSON.stringify({
            verifiedFindings: [
              {
                id: "RT-AUTH-001",
                status: "CONFIRMED",
                severity: "medium",
                reasons: ["direct observation"],
                evidence: ["src/runtime/gitclaw-runner.ts"]
              }
            ],
            report: "Verified finding"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    await runner(
      buildStageInput({
        name: "filter",
        prompt: "stage: filter\nhandoff: verify or reject red-team leads before Blue Team"
      })
    );

    expect(seenSuffixes[0]).toContain("If the claimed file or symbol was not directly observed, reject the finding or mark it for human review.");
    expect(seenSuffixes[0]).toContain("Return strict JSON only with verified findings");
  });

  it("rejects red-team findings that never read any files", async () => {
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
          content: JSON.stringify({
            findingIds: ["RT-AUTH-999"],
            report: "Candidate finding without file reads"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    const output = await runner(
      buildStageInput({
        name: "red-team",
        prompt: "stage: red-team\nhandoff: use the orchestrator task/goal/hot-area handoff to generate provisional findings for filter verification"
      })
    );

    expect(output.error?.kind).toBe("invalid_output");
    expect(output.notes).toContain("produced candidate findings without reading any files");
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

    const output = await runner(
      buildStageInput({
        name: "ship-report",
        prompt: "stage: ship-report",
        scope: "auth"
      })
    );

    expect(output.error?.kind).toBe("incomplete_response");
    expect(output.notes).toContain("gitclaw_error:");
    expect(output.assistantOutput).toBe("partial response");
  });

  it("rejects filter findings that never read any files", async () => {
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
          content: JSON.stringify({
            verifiedFindings: [
              {
                id: "RT-AUTH-002",
                status: "CONFIRMED",
                severity: "medium",
                reasons: ["needs review"],
                evidence: ["src/runtime/gitclaw-runner.ts"]
              }
            ],
            report: "Verified finding"
          }),
          model: "openai:gpt-4o-mini",
          provider: "openai",
          stopReason: "stop"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    const output = await runner(
      buildStageInput({
        name: "filter",
        prompt: "stage: filter\nhandoff: verify or reject red-team leads before Blue Team"
      })
    );

    expect(output.error?.kind).toBe("invalid_output");
    expect(output.notes).toContain("verified findings without reading any files");
  });

  it("normalizes lowercase verification statuses from model output", async () => {
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
          content: JSON.stringify({
            verifiedFindings: [
              {
                id: "F003",
                status: "confirmed",
                severity: "medium"
              },
              {
                id: "F001",
                status: "rejected",
                severity: "none"
              }
            ],
            verifiedFindingIds: ["F003"],
            report: "Filter complete"
          }),
          model: "openrouter:z-ai/glm-4.5-air:free",
          provider: "openrouter",
          stopReason: "stop"
        };
      }) as NonNullable<GitclawStageRunnerOptions["query"]>
    });

    const output = await runner(
      buildStageInput({
        name: "filter",
        prompt: "stage: filter",
        scope: "src/lib",
        findingIds: ["F001", "F003"]
      })
    );

    expect(output.verifiedFindings).toEqual([
      {
        id: "F003",
        status: "CONFIRMED",
        severity: "medium"
      },
      {
        id: "F001",
        status: "REJECTED_FALSE_POSITIVE",
        severity: "low"
      }
    ]);
  });
});
