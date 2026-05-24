import { createGitclawStageRunner } from "./gitclaw-runner.js";
import { coerceVerificationList, type Verification } from "../schemas/verification.js";
import type { GCMessage } from "gitclaw";

export type AuditStageName = "orchestrator" | "red-team" | "filter" | "blue-team" | "ship-report";

export type AuditStageSkillName =
  | "orchestrate-audit"
  | "red-team-audit"
  | "verify-finding"
  | "blue-team-remediation"
  | "generate-ship-report";

export type AuditStageErrorKind =
  | "runner_error"
  | "system_error"
  | "missing_assistant"
  | "incomplete_response"
  | "invalid_output";

export type AuditStageError = {
  stage: AuditStageName;
  kind: AuditStageErrorKind;
  message: string;
};

export type AuditStageToolUse = {
  type: "tool_use";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};

export type AuditStageToolResult = {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  content: string;
  isError: boolean;
};

export type AuditStageToolActivity = AuditStageToolUse | AuditStageToolResult;

export type AuditStageInput = {
  name: AuditStageName;
  prompt: string;
  index: number;
  total: number;
  scope?: string;
  task?: string;
  findingIds: string[];
  verifiedFindings: Verification[];
  orchestratorOutput?: AuditStageOutput;
  redTeamReport?: string;
  filterReport?: string;
  redTeamOutput?: AuditStageOutput;
  filterOutput?: AuditStageOutput;
  blueTeamOutput?: AuditStageOutput;
};

export type AuditStageOutput = {
  findingIds?: string[];
  verifiedFindingIds?: string[];
  verifiedFindings?: Verification[];
  goal?: string;
  hotAreas?: string[];
  report?: string;
  notes?: string;
  assistantOutput?: string;
  toolActivity?: AuditStageToolActivity[];
  error?: AuditStageError;
};

export type StageRunner = (
  stage: AuditStageInput,
  hooks?: StageRunnerHooks
) => Promise<AuditStageOutput> | AuditStageOutput;

export type StageRunnerHooks = {
  onMessage?: (message: GCMessage) => void;
};

export type AuditRunEvents = {
  onStageStart?: (stage: AuditStageInput) => void;
  onStageMessage?: (stage: AuditStageInput, message: GCMessage) => void;
  onStageEnd?: (stage: AuditStageInput, output: AuditStageOutput) => void;
};

export type AuditRunInput = {
  scope?: string;
  task?: string;
  runner?: StageRunner;
  events?: AuditRunEvents;
};

export type AuditStageRun = AuditStageInput & {
  output: AuditStageOutput;
};

export type AuditRunResult = {
  stages: AuditStageRun[];
  blueTeamInput: {
    scope?: string;
    task?: string;
    findingIds: string[];
  };
  verifiedFindingIds: string[];
  verifiedFindings: Verification[];
};

const STAGE_ORDER: AuditStageName[] = ["orchestrator", "red-team", "filter", "blue-team", "ship-report"];
const STAGE_SKILLS: Record<AuditStageName, AuditStageSkillName> = {
  orchestrator: "orchestrate-audit",
  "red-team": "red-team-audit",
  filter: "verify-finding",
  "blue-team": "blue-team-remediation",
  "ship-report": "generate-ship-report"
};

export async function runAudit(input: AuditRunInput): Promise<AuditRunResult> {
  if (!input.scope && !input.task) {
    throw new Error("[clawitup:audit] provide --scope or --task");
  }

  const runner = input.runner ?? createGitclawStageRunner();
  const stages: AuditStageRun[] = [];
  let orchestratorOutput: AuditStageOutput | undefined;
  let candidateFindingIds: string[] = [];
  let verifiedFindingIds: string[] = [];
  let verifiedFindings: Verification[] = [];

  for (const name of STAGE_ORDER) {
    const redTeamOutput = stages.find((entry) => entry.name === "red-team")?.output;
    const filterOutput = stages.find((entry) => entry.name === "filter")?.output;
    const blueTeamOutput = stages.find((entry) => entry.name === "blue-team")?.output;
    const findingIds =
      name === "filter" ? candidateFindingIds : name === "blue-team" || name === "ship-report"
        ? verifiedFindingIds
        : [];
    const stage: AuditStageInput = {
      name,
      prompt: buildStagePrompt(
        name,
        input.scope,
        input.task,
        findingIds,
        verifiedFindings,
        orchestratorOutput,
        redTeamOutput,
        filterOutput,
        blueTeamOutput
      ),
      index: STAGE_ORDER.indexOf(name) + 1,
      total: STAGE_ORDER.length,
      scope: input.scope,
      task: input.task,
      findingIds,
      verifiedFindings,
      orchestratorOutput,
      redTeamReport: redTeamOutput?.report,
      filterReport: filterOutput?.report,
      redTeamOutput,
      filterOutput,
      blueTeamOutput
    };
    input.events?.onStageStart?.(stage);
    let output: AuditStageOutput;

    try {
      output = await runner(stage, {
        onMessage: input.events?.onStageMessage
          ? (message) => {
              input.events?.onStageMessage?.(stage, message);
            }
          : undefined
      });
    } catch (error) {
      output = buildStageErrorOutput(name, error);
    }

    if (name === "red-team") {
      candidateFindingIds = normalizeFindingIds(output.findingIds);
      if (candidateFindingIds.length === 0) {
        candidateFindingIds = extractFindingIdsFromText(output.report ?? output.assistantOutput);
      }
    }

    if (name === "orchestrator") {
      orchestratorOutput = output;
    }

    if (name === "filter") {
      verifiedFindings = normalizeVerifications(output.verifiedFindings);
      verifiedFindingIds =
        verifiedFindings.length > 0
          ? verifiedFindings.map((finding) => finding.id)
          : normalizeFindingIds(output.verifiedFindingIds);
    }

    stages.push({ ...stage, output });
    input.events?.onStageEnd?.(stage, output);
  }

  return {
    stages,
    blueTeamInput: {
      scope: input.scope,
      task: input.task,
      findingIds: verifiedFindingIds
    },
    verifiedFindingIds,
    verifiedFindings
  };
}

function buildStagePrompt(
  name: AuditStageName,
  scope: string | undefined,
  task: string | undefined,
  findingIds: string[],
  verifiedFindings: Verification[],
  orchestratorOutput: AuditStageOutput | undefined,
  redTeamOutput: AuditStageOutput | undefined,
  filterOutput: AuditStageOutput | undefined,
  blueTeamOutput: AuditStageOutput | undefined
): string {
  const context: string[] = [
    `stage: ${name}`,
    `skill: ${STAGE_SKILLS[name]}`,
    "workflow: adversarial-audit",
    "report_first: true"
  ];

  if (scope) {
    context.push(`scope: ${scope}`);
  }

  if (task) {
    context.push(`task: ${task}`);
  }

  if (findingIds.length > 0) {
    context.push(`finding_ids: ${findingIds.join(", ")}`);
  }
  if (verifiedFindings.length > 0) {
    context.push(blockForPrompt("verified_findings_json", verifiedFindings, 5000));
  }
  if (name !== "orchestrator" && orchestratorOutput) {
    context.push(blockForPrompt("orchestrator_handoff_json", summarizeStageOutput(orchestratorOutput), 5000));
  }
  if (name === "filter" && redTeamOutput) {
    context.push(blockForPrompt("red_team_handoff_json", summarizeStageOutput(redTeamOutput), 5000));
  }
  if ((name === "blue-team" || name === "ship-report") && filterOutput) {
    context.push(blockForPrompt("filter_handoff_json", summarizeStageOutput(filterOutput), 5000));
  }
  if (name === "ship-report" && blueTeamOutput) {
    context.push(blockForPrompt("blue_team_handoff_json", summarizeStageOutput(blueTeamOutput), 4000));
  }

  switch (name) {
    case "orchestrator":
      context.push("handoff: explore the scope, identify hot areas, and produce the task/goal handoff for Red Team");
      return context.join("\n");
    case "red-team":
      context.push("handoff: use the orchestrator task/goal/hot-area handoff to generate provisional findings for filter verification");
      return context.join("\n");
    case "filter":
      context.push("handoff: verify or reject red-team leads before Blue Team");
      return context.join("\n");
    case "blue-team":
      context.push("handoff: prepare remediation guidance from verified findings only");
      return context.join("\n");
    case "ship-report":
      context.push("handoff: summarize the audit outcome as PASS, WARN, or FAIL");
      return context.join("\n");
  }
}

function extractFindingIdsFromText(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const matches = value.match(/\b(?:RT-[A-Z0-9-]+|R\d{3,})\b/g) ?? [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const match of matches) {
    if (seen.has(match)) {
      continue;
    }
    seen.add(match);
    ids.push(match);
  }

  return ids;
}

function clipForPrompt(value: string, limit = 3000): string {
  const normalized = value.trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit)}...`;
}

function blockForPrompt(label: string, value: unknown, limit: number): string {
  return `${label}:\n${clipForPrompt(JSON.stringify(value, null, 2), limit)}`;
}

function summarizeStageOutput(output: AuditStageOutput): Record<string, unknown> {
  return {
    findingIds: output.findingIds,
    verifiedFindingIds: output.verifiedFindingIds,
    verifiedFindings: output.verifiedFindings,
    goal: output.goal,
    hotAreas: output.hotAreas,
    report: output.report,
    notes: output.notes,
    assistantOutput: output.assistantOutput
  };
}

function buildStageErrorOutput(name: AuditStageName, error: unknown): AuditStageOutput {
  const message = error instanceof Error ? error.message : String(error);

  return {
    report: "",
    notes: `gitclaw_error: ${message}`,
    error: {
      stage: name,
      kind: "runner_error",
      message
    }
  };
}

function normalizeFindingIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function normalizeVerifications(value: unknown): Verification[] {
  return coerceVerificationList(value);
}
