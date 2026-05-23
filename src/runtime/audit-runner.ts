import { createGitclawStageRunner } from "./gitclaw-runner.js";
import { VerificationSchema, type Verification } from "../schemas/verification.js";
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
  scope?: string;
  task?: string;
  findingIds: string[];
  redTeamReport?: string;
  filterReport?: string;
};

export type AuditStageOutput = {
  findingIds?: string[];
  verifiedFindingIds?: string[];
  verifiedFindings?: Verification[];
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
  let candidateFindingIds: string[] = [];
  let verifiedFindingIds: string[] = [];
  let verifiedFindings: Verification[] = [];

  for (const name of STAGE_ORDER) {
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
        stages.find((entry) => entry.name === "red-team")?.output.report,
        stages.find((entry) => entry.name === "filter")?.output.report
      ),
      scope: input.scope,
      task: input.task,
      findingIds,
      redTeamReport: stages.find((entry) => entry.name === "red-team")?.output.report,
      filterReport: stages.find((entry) => entry.name === "filter")?.output.report
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
  redTeamReport: string | undefined,
  filterReport: string | undefined
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
  if (name === "filter" && redTeamReport) {
    context.push(`red_team_report_excerpt: ${clipForPrompt(redTeamReport)}`);
  }
  if ((name === "blue-team" || name === "ship-report") && filterReport) {
    context.push(`filter_report_excerpt: ${clipForPrompt(filterReport)}`);
  }

  switch (name) {
    case "orchestrator":
      context.push("handoff: initialize the report-first pipeline");
      return context.join("\n");
    case "red-team":
      context.push("handoff: generate provisional findings for filter verification");
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
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit)}...`;
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
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const parsed = VerificationSchema.safeParse(entry);

    return parsed.success ? [parsed.data] : [];
  });
}
