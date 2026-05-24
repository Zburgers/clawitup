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

const READ_ONLY_AUDIT_TOOLS = [
  "read",
  "list-files",
  "git-diff",
  "graphify",
  "rg-search",
  "run-tests"
] as const;
const ORCHESTRATOR_AUDIT_TOOLS = [
  "read",
  "list-files",
  "git-diff",
  "graphify",
  "rg-search",
  "run-tests"
] as const;
const REPORT_AUDIT_TOOLS = ["read"] as const;
const DISALLOWED_AUDIT_TOOLS = [
  "cli",
  "write",
  "memory",
  "capture_photo",
  "task_tracker",
  "skill_learner",
  "read-file"
] as const;

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
      disallowedTools: runnerOptions.disallowedTools ?? [...DISALLOWED_AUDIT_TOOLS],
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
    const goal = typeof record.goal === "string" ? record.goal : undefined;
    const exploredPaths = normalizeStringArray(record.exploredPaths);
    const hotAreas = normalizeStringArray(record.hotAreas);
    const observedFiles = normalizeStringArray(record.observedFiles);
    const findingIds = normalizeFindingIds(record.findingIds);
    const verifiedFindingIds = normalizeFindingIds(record.verifiedFindingIds);
    const verifiedFindings = Array.isArray(record.verifiedFindings)
      ? normalizeVerifications(record.verifiedFindings)
      : undefined;

    const output: AuditStageOutput = {
      findingIds,
      verifiedFindingIds,
      verifiedFindings,
      goal,
      exploredPaths,
      hotAreas,
      observedFiles,
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
      return "Return strict JSON only: {\"goal\": string, \"exploredPaths\": string[], \"hotAreas\": string[], \"report\": string, \"notes\"?: string}. Mandatory tool order: (1) list-files scoped to the provided scope only, (2) graphify, (3) optional rg-search scoped to the same paths. Inspect the repository structure first, then name the audit goal and list the hot areas the Red Team should inspect next. Keep tool calls narrow to avoid large outputs.";
    case "red-team":
      return "Return strict JSON only: {\"findingIds\": string[], \"observedFiles\": string[], \"report\": string, \"notes\"?: string}. Keep candidate findings provisional and evidence-dense. If findingIds is non-empty, observedFiles must list the files you successfully read in this stage. A file path, function name, class name, or line-number claim is invalid unless it came from a successful tool result in this stage or from a previous verified handoff. If you cannot verify a referenced path exists, omit the lead or mark it for human review.";
    case "filter":
      return "Return strict JSON only with verified findings: {\"verifiedFindings\": [{\"id\": string, \"status\": string, \"severity\": string, \"reasons\"?: string[], \"evidence\"?: string[]}], \"verifiedFindingIds\"?: string[], \"observedFiles\": string[], \"report\": string, \"notes\"?: string}. Allowed statuses: CONFIRMED, REJECTED_FALSE_POSITIVE, NEEDS_HUMAN_REVIEW, INSUFFICIENT_EVIDENCE, DUPLICATE, OUT_OF_SCOPE. If verifiedFindings or verifiedFindingIds is non-empty, observedFiles must list the files you successfully read in this stage. A file path, function name, class name, or line-number claim is invalid unless it came from a successful tool result in this stage or from a previous verified handoff. If you did not directly inspect the claimed code, reject the finding or escalate it to human review.";
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
    "The orchestrator must inspect repository structure before naming hot areas.",
    "Be concise, evidence-first, and report-first.",
    "Use only the available tools when they materially help.",
    "The audit is sequential: this stage does not run later stages, and the CLI handles all stage transitions.",
    "Tool names are hyphenated (list-files); do not use underscores.",
    "Keep tool calls scoped and narrow; avoid broad rg-search or large file reads.",
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
      if (
        !hasText(output.report) ||
        !hasText(output.goal) ||
        !hasNonEmptyArray(output.exploredPaths) ||
        !hasNonEmptyArray(output.hotAreas)
      ) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "orchestrator stage must return a goal, explored paths, hot areas, and a report"
        };
      }
      if (
        (hasText(output.report) || hasText(output.goal) || hasNonEmptyArray(output.hotAreas)) &&
        !hasSuccessfulToolResult(output, ["list-files"])
      ) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "orchestrator stage produced a plan without successfully listing files in scope"
        };
      }
      if (!hasSuccessfulToolResult(output, ["graphify"])) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "orchestrator stage produced a plan without running graphify"
        };
      }
      const firstToolUse = firstToolUseName(output);
      if (firstToolUse && firstToolUse !== "list-files") {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "orchestrator stage must start by listing files in scope"
        };
      }
      const listIndex = indexOfToolUse(output, "list-files");
      const graphifyIndex = indexOfToolUse(output, "graphify");
      if (listIndex !== undefined && graphifyIndex !== undefined && graphifyIndex < listIndex) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "orchestrator stage must run graphify after listing files"
        };
      }
      return undefined;
    case "red-team":
      if (!hasText(output.report) && !hasNonEmptyArray(output.findingIds)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "red-team stage returned no report or candidate finding ids"
        };
      }
      if (
        (hasText(output.report) || hasNonEmptyArray(output.findingIds)) &&
        !hasSuccessfulToolResult(output, ["read"])
      ) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "red-team stage produced candidate findings without successfully reading any files"
        };
      }
      if (hasNonEmptyArray(output.findingIds) && !hasObservedFilesBackedByReads(output)) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "red-team stage produced candidate findings without observedFiles backed by successful reads"
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
      if (
        (hasText(output.report) || hasNonEmptyArray(output.verifiedFindingIds) || hasNonEmptyArray(output.verifiedFindings)) &&
        !hasSuccessfulToolResult(output, ["read"])
      ) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "filter stage verified findings without successfully reading any files"
        };
      }
      if (
        (hasNonEmptyArray(output.verifiedFindingIds) || hasNonEmptyArray(output.verifiedFindings)) &&
        !hasObservedFilesBackedByReads(output)
      ) {
        return {
          stage: stageName,
          kind: "invalid_output",
          message: "filter stage verified findings without observedFiles backed by successful reads"
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

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  return values.length > 0 ? values : undefined;
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

function hasSuccessfulToolResult(output: AuditStageOutput, toolNames: readonly string[]): boolean {
  const successfulCallIds = new Set(
    output.toolActivity
      ?.filter(
        (activity) =>
          activity.type === "tool_result" &&
          toolNames.includes(activity.toolName) &&
          activity.isError === false &&
          typeof activity.content === "string" &&
          activity.content.trim().length > 0
      )
      .map((activity) => activity.toolCallId)
  );

  return Boolean(
    output.toolActivity?.some(
      (activity) =>
        activity.type === "tool_use" &&
        toolNames.includes(activity.toolName) &&
        successfulCallIds.has(activity.toolCallId)
    )
  );
}

function firstToolUseName(output: AuditStageOutput): string | undefined {
  return output.toolActivity?.find((activity) => activity.type === "tool_use")?.toolName;
}

function indexOfToolUse(output: AuditStageOutput, toolName: string): number | undefined {
  if (!output.toolActivity) {
    return undefined;
  }
  const index = output.toolActivity.findIndex(
    (activity) => activity.type === "tool_use" && activity.toolName === toolName
  );
  return index >= 0 ? index : undefined;
}

function hasObservedFilesBackedByReads(output: AuditStageOutput): boolean {
  const observedFiles = output.observedFiles;
  if (!Array.isArray(observedFiles) || observedFiles.length === 0) {
    return false;
  }

  const readPaths = successfulReadPaths(output);
  return observedFiles.every((filePath) => readPaths.has(normalizePath(filePath)));
}

function successfulReadPaths(output: AuditStageOutput): Set<string> {
  const successfulCallIds = new Set(
    output.toolActivity
      ?.filter(
        (activity) =>
          activity.type === "tool_result" &&
          activity.toolName === "read" &&
          activity.isError === false &&
          typeof activity.content === "string" &&
          activity.content.trim().length > 0
      )
      .map((activity) => activity.toolCallId)
  );

  const paths = new Set<string>();
  for (const activity of output.toolActivity ?? []) {
    if (
      activity.type !== "tool_use" ||
      activity.toolName !== "read" ||
      !successfulCallIds.has(activity.toolCallId)
    ) {
      continue;
    }

    const readPath = toolArgPath(activity.args);
    if (readPath) {
      paths.add(normalizePath(readPath));
    }
  }

  return paths;
}

function toolArgPath(args: Record<string, unknown>): string | undefined {
  const value = args.path ?? args.file_path ?? args.filePath;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizePath(value: string): string {
  return value.trim().replace(/^\.\//, "");
}
