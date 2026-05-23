import { loadAgent, query } from "gitclaw";
import type { GCMessage, QueryOptions } from "gitclaw";
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
    try {
      loadedAgent = await loadAgentFactory(runnerOptions.dir ?? process.cwd(), model, runnerOptions.env);
    } catch (error) {
      return buildRunnerErrorOutput(stage.name, error);
    }

    const stageContext = buildStageContext(stage);
    const workflowStep = resolveWorkflowStep(loadedAgent.workflows, stage.name);
    const stageInstructions = buildStageInstructions(stage.name, workflowStep?.prompt);
    const systemPrompt = runnerOptions.systemPrompt ?? loadedAgent.systemPrompt;
    const systemPromptSuffix = joinPromptSections(runnerOptions.systemPromptSuffix, stageInstructions);
    const queryOptions: QueryOptions = {
      dir: runnerOptions.dir ?? process.cwd(),
      env: runnerOptions.env,
      systemPrompt,
      systemPromptSuffix,
      allowedTools: runnerOptions.allowedTools ?? loadedAgent.manifest.tools,
      disallowedTools: runnerOptions.disallowedTools,
      maxTurns: runnerOptions.maxTurns ?? loadedAgent.manifest.runtime.max_turns,
      prompt: stageContext
    };

    if (model !== undefined) {
      queryOptions.model = model;
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

function buildStageContext(stage: AuditStageInput): string {
  const lines = [
    `stage: ${stage.name}`,
    `skill: ${STAGE_SKILLS[stage.name]}`,
    "workflow: adversarial-audit",
    "report_first: true"
  ];

  if (stage.scope) {
    lines.push(`scope: ${stage.scope}`);
  }

  if (stage.task) {
    lines.push(`task: ${stage.task}`);
  }

  if (stage.findingIds.length > 0) {
    lines.push(`finding_ids: ${stage.findingIds.join(", ")}`);
  }
  if (stage.redTeamReport) {
    lines.push(`red_team_report_excerpt: ${clipForPrompt(stage.redTeamReport)}`);
  }
  if (stage.filterReport) {
    lines.push(`filter_report_excerpt: ${clipForPrompt(stage.filterReport)}`);
  }

  return lines.join("\n");
}

function buildStageInstructions(stageName: AuditStageInput["name"], workflowPrompt?: string): string {
  const workflowSections = [
    `You are executing the ${stageName} stage of the adversarial-audit workflow.`,
    `Follow the ${STAGE_SKILLS[stageName]} skill and the workflow notes from agent.yaml.`,
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
      return "Return strict JSON only: {\"findingIds\": string[], \"report\": string, \"notes\"?: string}. Keep candidate findings provisional.";
    case "filter":
      return "Return strict JSON only with verified findings: {\"verifiedFindings\": [{\"id\": string, \"status\": string, \"severity\": string, \"reasons\"?: string[], \"evidence\"?: string[]}], \"verifiedFindingIds\"?: string[], \"report\": string, \"notes\"?: string}.";
    case "blue-team":
      return "Use only verified findings and return strict JSON: {\"report\": string, \"notes\"?: string}.";
    case "ship-report":
      return "Return strict JSON: {\"report\": string, \"notes\"?: string}. The report must state PASS, WARN, or FAIL explicitly.";
  }
}

function clipForPrompt(value: string, limit = 3000): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit)}...`;
}

function joinPromptSections(...sections: Array<string | undefined>): string | undefined {
  const values = sections.filter((section): section is string => Boolean(section));
  return values.length > 0 ? values.join("\n\n") : undefined;
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
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : undefined;
    const status = typeof candidate.status === "string" ? candidate.status : undefined;
    const severity = typeof candidate.severity === "string" ? candidate.severity : undefined;

    if (!id || !status || !severity) {
      return [];
    }

    return [
      {
        id,
        status: status as NonNullable<AuditStageOutput["verifiedFindings"]>[number]["status"],
        severity: severity as NonNullable<AuditStageOutput["verifiedFindings"]>[number]["severity"],
        reasons: Array.isArray(candidate.reasons)
          ? candidate.reasons.filter((reason): reason is string => typeof reason === "string" && reason.length > 0)
          : undefined,
        evidence: Array.isArray(candidate.evidence)
          ? candidate.evidence.filter((item): item is string => typeof item === "string" && item.length > 0)
          : undefined,
        verifier: typeof candidate.verifier === "string" ? candidate.verifier : undefined
      }
    ];
  });
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
