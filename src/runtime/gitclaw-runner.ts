import { readFile } from "node:fs/promises";

import { loadAgent, query } from "gitclaw";
import type { GCMessage, QueryOptions } from "gitclaw";
import { coerceVerificationList } from "../schemas/verification.js";
import type {
  AuditStageError,
  AuditStageInput,
  AuditStageOutput,
  AuditStageToolActivity,
  StageRunner
} from "./audit-runner.js";

type QueryFactory = (options: QueryOptions) => AsyncIterable<GCMessage>;
type LoadAgentFactory = typeof loadAgent;

export type GitclawStageRunnerOptions = Pick<
  QueryOptions,
  "dir" | "model" | "env" | "systemPrompt" | "systemPromptSuffix" | "allowedTools" | "disallowedTools" | "maxTurns"
> & {
  query?: QueryFactory;
  loadAgent?: LoadAgentFactory;
};

export type GitclawStageRunnerHooks = {
  onMessage?: (message: GCMessage) => void;
};

const READ_ONLY_AUDIT_TOOLS = ["read", "git-diff", "graphify", "rg-search", "run-tests"] as const;
const ORCHESTRATOR_AUDIT_TOOLS: string[] = [];
const REPORT_AUDIT_TOOLS = ["read"] as const;

const STAGE_SKILLS: Record<AuditStageInput["name"], string> = {
  orchestrator: "orchestrate-audit",
  "red-team": "red-team-audit",
  filter: "verify-finding",
  "blue-team": "blue-team-remediation",
  "ship-report": "generate-ship-report"
};

export function createGitclawStageRunner(options: GitclawStageRunnerOptions = {}): StageRunner {
  const { model, query: queryFactory = query, loadAgent: loadAgentFactory = loadAgent, ...runnerOptions } = options;

  return async (stage: AuditStageInput, hooks?: GitclawStageRunnerHooks): Promise<AuditStageOutput> => {
    let loadedAgent;
    let effectiveModel = model;
    try {
      const loaded = await loadAgentWithFallback(
        loadAgentFactory,
        runnerOptions.dir ?? process.cwd(),
        model,
        runnerOptions.env
      );
      loadedAgent = loaded.agent;
      effectiveModel = loaded.model;
    } catch (error) {
      return buildRunnerErrorOutput(stage.name, error);
    }

    const workflowStep = resolveWorkflowStep(loadedAgent.workflows, stage.name);
    const stageInstructions = buildStageInstructions(stage.name, workflowStep?.prompt);
    const systemPrompt = runnerOptions.systemPrompt ?? buildAuditSystemPrompt();
    const systemPromptSuffix = joinPromptSections(runnerOptions.systemPromptSuffix, stageInstructions);
    const queryOptions: QueryOptions = {
      dir: runnerOptions.dir ?? process.cwd(),
      env: runnerOptions.env,
      systemPrompt,
      systemPromptSuffix,
      allowedTools: runnerOptions.allowedTools ?? defaultAllowedTools(stage.name),
      disallowedTools: runnerOptions.disallowedTools,
      maxTurns: runnerOptions.maxTurns ?? loadedAgent.manifest.runtime.max_turns,
      prompt: stage.prompt
    };

    if (effectiveModel !== undefined) {
      queryOptions.model = effectiveModel;
    }

    const messages: GCMessage[] = [];

    try {
      for await (const message of queryFactory(queryOptions)) {
        hooks?.onMessage?.(message);
        messages.push(message);
      }
    } catch (error) {
      return buildRunnerErrorOutput(stage.name, error, messages);
    }

    return parseAuditStageOutput(stage, messages);
  };
}

async function loadAgentWithFallback(
  loadAgentFactory: LoadAgentFactory,
  dir: string,
  model: string | undefined,
  env: string | undefined
): Promise<{ agent: Awaited<ReturnType<LoadAgentFactory>>; model: string | undefined }> {
  try {
    return {
      agent: await loadAgentFactory(dir, model, env),
      model
    };
  } catch (error) {
    const fallbackModel = await resolveFallbackModel(dir, model, error);
    if (!fallbackModel) {
      throw error;
    }

    return {
      agent: await loadAgentFactory(dir, fallbackModel, env),
      model: fallbackModel
    };
  }
}

async function resolveFallbackModel(
  dir: string,
  model: string | undefined,
  error: unknown
): Promise<string | undefined> {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("baseUrl")) {
    return undefined;
  }

  const configuredModel = model ?? (await readPreferredModel(dir));
  if (!configuredModel || configuredModel.includes("@")) {
    return undefined;
  }

  return configuredModel.startsWith("openrouter:")
    ? `${configuredModel}@https://openrouter.ai/api/v1`
    : undefined;
}

async function readPreferredModel(dir: string): Promise<string | undefined> {
  try {
    const contents = await readFile(`${dir}/agent.yaml`, "utf8");
    return contents.match(/^\s*preferred:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function parseAuditStageOutput(stage: AuditStageInput, messages: GCMessage[]): AuditStageOutput {
  const toolActivity = collectToolActivity(messages);
  const assistant = [...messages].reverse().find(
    (message): message is Extract<GCMessage, { type: "assistant" }> => message.type === "assistant"
  );
  const systemError = [...messages].reverse().find(
    (message): message is Extract<GCMessage, { type: "system" }> =>
      message.type === "system" && message.subtype === "error"
  );

  if (systemError) {
    return buildRunnerErrorOutput(stage.name, systemError.content, messages);
  }

  if (!assistant) {
    return buildStageError(stage.name, "missing_assistant", "Gitclaw returned no assistant response", messages);
  }

  const assistantOutput = assistant.content;
  if (assistant.stopReason !== "stop") {
    const stopReason = assistant.stopReason;
    const message = assistant.errorMessage
      ? `assistant stopped with ${stopReason}: ${assistant.errorMessage}`
      : `assistant stopped with ${stopReason}`;

    return buildStageError(stage.name, "incomplete_response", message, messages, assistantOutput, toolActivity);
  }

  const parsed = safeParseJson(assistantOutput);
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    const report = typeof record.report === "string" ? record.report : assistantOutput;
    const notes = typeof record.notes === "string" ? record.notes : undefined;
    const findingIds = normalizeFindingIds(record.findingIds);
    const verifiedFindingIds = normalizeFindingIds(record.verifiedFindingIds);
    const verifiedFindings = Array.isArray(record.verifiedFindings)
      ? normalizeVerifications(record.verifiedFindings)
      : undefined;

    const output: AuditStageOutput = {
      findingIds,
      verifiedFindingIds,
      verifiedFindings,
      report,
      notes,
      assistantOutput,
      toolActivity
    };

    const validationError = validateStageOutput(stage.name, output);
    if (validationError) {
      output.error = validationError;
      output.notes = joinNotes(output.notes, validationError.message);
    }

    return output;
  }

  const output: AuditStageOutput = {
    report: assistantOutput,
    assistantOutput,
    toolActivity
  };

  const validationError = validateStageOutput(stage.name, output);
  if (validationError) {
    output.error = validationError;
    output.notes = joinNotes(output.notes, validationError.message);
  }

  return output;
}

function buildStageInstructions(stageName: AuditStageInput["name"], workflowPrompt?: string): string {
  const workflowSections = [
    `Execute only the ${stageName} stage of the adversarial-audit workflow.`,
    "Treat the user prompt as the authoritative handoff state for this stage.",
    `Follow the ${STAGE_SKILLS[stageName]} skill and preserve the evidence trail passed in.`,
    "Do not write files, save memory, create workspace artifacts, or modify the repository. ClawItUp writes the official run artifacts itself.",
    "Ignore generic task-tracking or skill-learning instructions when they conflict with this audit stage.",
    "Do not try to invoke other stages, skills, or helper names as tools. ClawItUp runs the workflow stages automatically.",
    "If a helper is described in the prompt but is not an actual available tool, continue without it and use the available tools directly.",
    workflowPrompt ? `Workflow step prompt: ${workflowPrompt}` : undefined,
    stageOutputContract(stageName)
  ].filter((section): section is string => Boolean(section));

  return workflowSections.join("\n\n");
}

function stageOutputContract(stageName: AuditStageInput["name"]): string {
  switch (stageName) {
    case "orchestrator":
      return "Output a concise report. Include notes if you need to explain the plan.";
    case "red-team":
      return "Return strict JSON only: {\"findingIds\": string[], \"report\": string, \"notes\"?: string}. Keep candidate findings provisional and evidence-dense.";
    case "filter":
      return "Return strict JSON only with verified findings: {\"verifiedFindings\": [{\"id\": string, \"status\": string, \"severity\": string, \"reasons\"?: string[], \"evidence\"?: string[]}], \"verifiedFindingIds\"?: string[], \"report\": string, \"notes\"?: string}.";
    case "blue-team":
      return "Use only verified findings and return strict JSON: {\"report\": string, \"notes\"?: string}. Cite the verified evidence you are acting on.";
    case "ship-report":
      return "Return strict JSON: {\"report\": string, \"notes\"?: string}. The report must state PASS, WARN, or FAIL explicitly and explain it from the verified evidence.";
  }
}

function joinPromptSections(...sections: Array<string | undefined>): string | undefined {
  const values = sections.filter((section): section is string => Boolean(section));
  return values.length > 0 ? values.join("\n\n") : undefined;
}

function buildAuditSystemPrompt(): string {
  return [
    "You are ClawItUp's audit-stage model.",
    "Work only on the current stage.",
    "Stay inside the supplied scope and evidence handoff.",
    "Be concise, evidence-first, and report-first.",
    "Use only the available tools when they materially help.",
    "Never create files, save memory, or mutate the repository."
  ].join("\n");
}

function defaultAllowedTools(stageName: AuditStageInput["name"]): string[] {
  switch (stageName) {
    case "orchestrator":
      return [...ORCHESTRATOR_AUDIT_TOOLS];
    case "blue-team":
    case "ship-report":
      return [...REPORT_AUDIT_TOOLS];
    case "red-team":
    case "filter":
      return [...READ_ONLY_AUDIT_TOOLS];
  }
}

function resolveWorkflowStep(
  workflows: NonNullable<Awaited<ReturnType<LoadAgentFactory>>["workflows"]>,
  stageName: AuditStageInput["name"]
): { prompt?: string } | undefined {
  const workflow = workflows.find((entry) => entry.name === "adversarial-audit") ?? workflows.find((entry) => entry.steps?.length);
  const step = workflow?.steps?.find((entry) => entry.skill === STAGE_SKILLS[stageName]);

  return step ? { prompt: step.prompt } : undefined;
}

function collectToolActivity(messages: GCMessage[]): AuditStageToolActivity[] | undefined {
  const toolActivity = messages.flatMap((message): AuditStageToolActivity[] => {
    if (message.type === "tool_use") {
      return [
        {
          type: "tool_use",
          toolCallId: message.toolCallId,
          toolName: message.toolName,
          args: message.args
        }
      ];
    }

    if (message.type === "tool_result") {
      return [
        {
          type: "tool_result",
          toolCallId: message.toolCallId,
          toolName: message.toolName,
          content: message.content,
          isError: message.isError
        }
      ];
    }

    return [];
  });

  return toolActivity.length > 0 ? toolActivity : undefined;
}

function validateStageOutput(stageName: AuditStageInput["name"], output: AuditStageOutput): AuditStageError | undefined {
  switch (stageName) {
    case "orchestrator":
      return undefined;
    case "red-team":
      if (!hasText(output.report) && !hasNonEmptyArray(output.findingIds)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "red-team stage returned no report or candidate finding ids"
        };
      }
      return undefined;
    case "filter":
      if (!hasText(output.report) && !hasNonEmptyArray(output.verifiedFindingIds) && !hasNonEmptyArray(output.verifiedFindings)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "filter stage returned no verified findings or report"
        };
      }
      return undefined;
    case "blue-team":
      if (!hasText(output.report) && !hasText(output.notes)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "blue-team stage returned no remediation report"
        };
      }
      return undefined;
    case "ship-report":
      if (!hasText(output.report)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "ship-report stage returned no final report"
        };
      }
      return undefined;
  }
}

function buildRunnerErrorOutput(stageName: AuditStageInput["name"], error: unknown, messages: GCMessage[] = []): AuditStageOutput {
  const message = error instanceof Error ? error.message : String(error);
  const toolActivity = collectToolActivity(messages);

  return {
    report: "",
    notes: `gitclaw_error: ${message}`,
    assistantOutput: extractAssistantContent(messages),
    toolActivity,
    error: {
      stage: stageName,
      kind: "runner_error",
      message
    }
  };
}

function buildStageError(
  stageName: AuditStageInput["name"],
  kind: AuditStageError["kind"],
  message: string,
  messages: GCMessage[] = [],
  assistantOutput?: string,
  toolActivity?: AuditStageToolActivity[]
): AuditStageOutput {
  return {
    report: assistantOutput ?? "",
    notes: `gitclaw_error: ${message}`,
    assistantOutput: assistantOutput ?? extractAssistantContent(messages),
    toolActivity: toolActivity ?? collectToolActivity(messages),
    error: {
      stage: stageName,
      kind,
      message
    }
  };
}

function extractAssistantContent(messages: GCMessage[]): string | undefined {
  const assistant = [...messages].reverse().find(
    (message): message is Extract<GCMessage, { type: "assistant" }> => message.type === "assistant"
  );

  return assistant?.content;
}

function normalizeVerifications(value: unknown[]): AuditStageOutput["verifiedFindings"] {
  return coerceVerificationList(value);
}

function safeParseJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = extractFencedJson(trimmed);
    if (fenced) {
      try {
        return JSON.parse(fenced);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}

function extractFencedJson(value: string): string | undefined {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim();
}

function normalizeFindingIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const ids = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  return ids.length > 0 ? ids : undefined;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyArray<T>(value: T[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function joinNotes(existing: string | undefined, next: string): string {
  return existing && existing.trim().length > 0 ? `${existing}\n${next}` : next;
}
