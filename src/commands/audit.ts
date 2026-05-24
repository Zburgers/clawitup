import { mkdir, readFile, writeFile } from "node:fs/promises";
import { runAudit, type AuditRunResult, type AuditRunInput } from "../runtime/audit-runner.js";
import { createRunLayout, type RunLayout } from "../runtime/artifact-store.js";
import { createGitDiffReader } from "../runtime/git.js";
import { createGitclawStageRunner } from "../runtime/gitclaw-runner.js";
import { readAuditEnvironment, type AuditRunLogger } from "../runtime/audit-status.js";
import { evaluatePolicy } from "../runtime/policy-engine.js";
import {
  buildCiScopeContract,
  buildLocalScopeContract,
  buildTaskScopeContract
} from "../runtime/scope-builder.js";
import { resolveClawitupLayout } from "../runtime/layout.js";
import type { PolicyResult } from "../schemas/policy.js";
import type { ScopeContract } from "../schemas/scope-contract.js";
import type { Summary } from "../schemas/summary.js";
import type { AuditStageInput, AuditStageOutput } from "../runtime/audit-runner.js";

export type AuditCommandOptions = {
  scope?: string;
  task?: string;
  ci?: boolean;
  model?: string;
  cwd?: string;
  changedFiles?: string[];
  logger?: AuditRunLogger;
};

export type AuditCommandResult = AuditRunResult & {
  layout: RunLayout;
  policy: PolicyResult;
  runId: string;
  scopeContract: ScopeContract;
  summary: Summary;
};

export async function runAuditCommand(
  options: AuditCommandOptions,
  runner?: AuditRunInput["runner"]
): Promise<AuditCommandResult> {
  if (!options.scope && !options.task && !options.ci) {
    throw new Error("[clawitup:audit] provide --scope, --task, or --ci");
  }

  const cwd = options.cwd ?? process.cwd();
  const task = options.task ? await readFile(options.task, "utf8") : undefined;
  const scopeContract = await buildScopeContract(options, cwd);
  const scope = options.scope ?? scopeContract.primary_scope.join(", ");
  const effectiveRunner = runner ?? (options.model ? createGitclawStageRunner({ dir: cwd, model: options.model }) : undefined);
  const logger = options.logger;
  const auditEvents = logger
    ? {
        onStageStart(stage: AuditStageInput) {
          logger.stageStart(stage);
        },
        onStageMessage(stage: AuditStageInput, message: Parameters<AuditRunLogger["stageMessage"]>[1]) {
          logger.stageMessage(stage, message);
        },
        onStageEnd(stage: AuditStageInput, output: AuditStageOutput) {
          logger.stageEnd(stage, output);
        }
      }
    : undefined;

  if (logger) {
    const environment = await readAuditEnvironment(cwd, options.model);

    logger.start({
      ...environment,
      mode: scopeContract.mode,
      scope: scopeContract.primary_scope,
      task: options.task
    });
  }

  const run = await runAudit({
    scope,
    task,
    runner: effectiveRunner,
    events: auditEvents
  });
  const requiredArtifactsValid = hasRequiredStageOutputs(run);
  const policy = evaluatePolicy({
    filter_completed: run.stages.some((stage) => stage.name === "filter"),
    required_artifacts_valid: requiredArtifactsValid,
    verified_findings: run.verifiedFindings
  });
  const summary = summarizeRun(run, policy);
  const runId = createRunId();
  const clawitupRoot = await resolveAuditArtifactRoot(cwd);
  const layout = createRunLayout(clawitupRoot, runId);

  await writeRunArtifacts(layout, scopeContract, run, policy, summary, options);

  return {
    ...run,
    layout,
    policy,
    runId,
    scopeContract,
    summary
  };
}

export function auditExitCode(policy: PolicyResult): number {
  return policy.result === "FAIL" ? 1 : 0;
}

async function buildScopeContract(
  options: AuditCommandOptions,
  cwd: string
): Promise<ScopeContract> {
  if (options.ci) {
    const changedFiles =
      options.changedFiles ?? (await createGitDiffReader({ cwd }).listChangedFiles());

    if (changedFiles.length === 0) {
      throw new Error("[clawitup:audit] --ci requires at least one changed file");
    }

    return buildCiScopeContract(changedFiles);
  }

  if (options.task) {
    return buildTaskScopeContract(options.task);
  }

  return buildLocalScopeContract(options.scope as string);
}

function summarizeRun(run: AuditRunResult, policy: PolicyResult): Summary {
  const count = (status: string): number =>
    run.verifiedFindings.filter((finding) => finding.status === status).length;

  return {
    policy_result: policy.result,
    confirmed: count("CONFIRMED"),
    rejected_false_positive: count("REJECTED_FALSE_POSITIVE"),
    needs_human_review: count("NEEDS_HUMAN_REVIEW"),
    insufficient_evidence: count("INSUFFICIENT_EVIDENCE"),
    duplicate: count("DUPLICATE"),
    out_of_scope: count("OUT_OF_SCOPE"),
    verified_findings: run.verifiedFindings,
    blocking_finding_ids: policy.blocking_finding_ids,
    policy
  };
}

function hasRequiredStageOutputs(run: AuditRunResult): boolean {
  const stage = (name: string) => run.stages.find((entry) => entry.name === name)?.output;
  const hasError = run.stages.some((entry) =>
    Boolean(entry.output.error) ||
    (typeof entry.output.notes === "string" && entry.output.notes.startsWith("gitclaw_error:"))
  );

  if (hasError) {
    return false;
  }

  const redTeam = stage("red-team");
  const filter = stage("filter");
  const shipReport = stage("ship-report");

  const redTeamHasSignal = Boolean(
    redTeam &&
    ((Array.isArray(redTeam.findingIds) && redTeam.findingIds.length > 0) ||
      (typeof redTeam.report === "string" && redTeam.report.trim().length > 0))
  );
  const filterHasSignal = Boolean(
    filter &&
    ((Array.isArray(filter.verifiedFindings) && filter.verifiedFindings.length > 0) ||
      (Array.isArray(filter.verifiedFindingIds) && filter.verifiedFindingIds.length > 0) ||
      (typeof filter.report === "string" && filter.report.trim().length > 0))
  );
  const shipReportHasSignal = Boolean(
    shipReport &&
    typeof shipReport.report === "string" &&
    shipReport.report.trim().length > 0
  );

  const hasVerifiedFindingsFromFilter = Boolean(
    filter &&
    ((Array.isArray(filter.verifiedFindings) && filter.verifiedFindings.length > 0) ||
      (Array.isArray(filter.verifiedFindingIds) && filter.verifiedFindingIds.length > 0))
  );

  const redTeamSatisfied = redTeamHasSignal || hasVerifiedFindingsFromFilter;

  return redTeamSatisfied && filterHasSignal && shipReportHasSignal;
}

async function writeRunArtifacts(
  layout: RunLayout,
  scopeContract: ScopeContract,
  run: AuditRunResult,
  policy: PolicyResult,
  summary: Summary,
  options: AuditCommandOptions
): Promise<void> {
  const stage = (name: string) => run.stages.find((entry) => entry.name === name);
  const stageErrors = run.stages
    .filter((entry) => entry.output.error)
    .map((entry) => `${entry.name}: ${entry.output.error?.message}`);
  const shipReport = firstNonEmptyText(
    stage("ship-report")?.output.report,
    formatFallbackShipReport(scopeContract, summary, policy, stageErrors)
  );
  const blueTeamHandoff = firstNonEmptyText(
    stage("blue-team")?.output.report,
    stage("blue-team")?.output.notes,
    "No Blue Team remediation handoff was emitted."
  );

  await mkdir(layout.runRoot, { recursive: true });
  await Promise.all([
    writeJson(layout.taskContext, {
      ci: Boolean(options.ci),
      local_scope: options.scope,
      task_file: options.task,
      stages: run.stages.map((entry) => entry.name)
    }),
    writeJson(layout.scopeContract, scopeContract),
    writeFile(
      layout.gateLogs,
      `${JSON.stringify({
        gate: options.ci ? "ci_diff" : "scope",
        primary_scope_count: scopeContract.primary_scope.length,
        bounded: true
      })}\n`,
      "utf8"
    ),
    writeJson(layout.redTeamFindings, stage("red-team")?.output ?? {}),
    writeJson(layout.verificationOutput, {
      verifiedFindingIds: run.verifiedFindingIds,
      verifiedFindings: run.verifiedFindings,
      filter: stage("filter")?.output ?? {}
    }),
    writeFile(layout.blueTeamHandoff, blueTeamHandoff, "utf8"),
    writeFile(layout.finalShipReport, shipReport, "utf8"),
    writeJson(layout.policyResult, policy),
    writeJson(layout.summary, summary)
  ]);
}

function createRunId(now = new Date()): string {
  return now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function resolveAuditArtifactRoot(cwd: string): Promise<string> {
  try {
    const { clawitupRoot } = await resolveClawitupLayout(cwd);
    return clawitupRoot;
  } catch {
    return cwd;
  }
}

function formatFallbackShipReport(
  scope: ScopeContract,
  summary: Summary,
  policy: PolicyResult,
  stageErrors: string[]
): string {
  const lines = [
    "# ClawItUp Ship Report",
    "",
    `Policy: ${policy.result}`,
    `Scope mode: ${scope.mode}`,
    `Primary scope: ${scope.primary_scope.join(", ")}`,
    `Confirmed findings: ${summary.confirmed}`,
    `Needs human review: ${summary.needs_human_review ?? 0}`,
    "",
    "## Reasons",
    ...policy.reasons.map((reason) => `- ${reason}`)
  ];

  if (stageErrors.length > 0) {
    lines.push("", "## Stage Errors", ...stageErrors.map((entry) => `- ${entry}`));
  }

  return lines.join("\n");
}

function firstNonEmptyText(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "";
}
