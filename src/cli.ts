import { Command } from "commander";
import path from "node:path";
import { auditExitCode, runAuditCommand } from "./commands/audit.js";
import { printEvalCommand } from "./commands/eval.js";
import { runInit } from "./commands/init.js";
import { formatMemoryShow, readMemorySnapshot } from "./commands/memory.js";
import { formatLatestReportSummary, readReportSnapshot } from "./commands/report.js";
import { formatStatusSummary, readStatusSnapshot } from "./commands/status.js";
import { createRunLayout, latestRunId } from "./runtime/artifact-store.js";
import { createAuditRunLogger } from "./runtime/audit-status.js";
import { resolveClawitupLayout, type ClawitupLayoutMode } from "./runtime/layout.js";

export function buildCli(): Command {
  const cli = new Command("clawitup");

  cli
    .command("init")
    .description("Initialize the repo-native ClawItUp structure")
    .option("--layout <layout>", "Scaffold layout: repo or hidden", "repo")
    .option("--model <model>", "Set the generated agent.yaml preferred provider:model")
    .option("--force", "Overwrite existing ClawItUp-managed scaffold files")
    .action(async (options: { layout: ClawitupLayoutMode; model?: string; force?: boolean }) => {
      if (options.layout !== "repo" && options.layout !== "hidden") {
        throw new Error(`[clawitup:init] unsupported layout: ${options.layout}`);
      }

      await runInit(process.cwd(), {
        layout: options.layout,
        preferredModel: options.model,
        force: options.force
      });
    });
  cli
    .command("audit")
    .description("Run the report-first adversarial audit pipeline")
    .option("--scope <scope>", "Bounded local scope to audit")
    .option("--task <task>", "Path to a task file that defines the audit")
    .option("--ci", "Audit changed files from the GitHub or local git diff")
    .option("--model <model>", "Override the preferred provider:model for this run")
    .action(async (options: { scope?: string; task?: string; ci?: boolean; model?: string }) => {
      const result = await runAuditCommand({
        scope: options.scope,
        task: options.task,
        ci: options.ci,
        model: options.model,
        logger: createAuditRunLogger()
      });

      process.stdout.write(
        [
          `[clawitup:audit] ${result.policy.result} run ${result.runId}`,
          `[clawitup:audit] artifacts=${result.layout.runRoot}`,
          `[clawitup:audit] ship_report=${result.layout.finalShipReport}`,
          `[clawitup:audit] verification=${result.layout.verificationOutput}`,
          `[clawitup:audit] summary=${result.layout.summary}`
        ].join("\n") + "\n"
      );

      if (options.ci) {
        process.exitCode = auditExitCode(result.policy);
      }
    });
  cli
    .command("status")
    .description("Show the latest audit run status")
    .option("--run <runId>", "Read a specific run")
    .action(async (options: { run?: string }) => {
      const { layout, runId } = await resolveRunSelection(options.run);
      const status = await readStatusSnapshot(layout);

      process.stdout.write(
        [
          `run: ${runId}`,
          `artifacts: ${layout.runRoot}`,
          formatStatusSummary(status.summary),
          `ship report: ${status.reportExists}`,
          `policy artifact: ${status.policyExists}`
        ].join("\n") + "\n"
      );
    });
  cli
    .command("report")
    .description("Print the latest audit report")
    .option("--run <runId>", "Read a specific run")
    .action(async (options: { run?: string }) => {
      const { layout, runId } = await resolveRunSelection(options.run);
      const report = await readReportSnapshot(layout);

      process.stdout.write(
        [
          `run: ${runId}`,
          `artifacts: ${layout.runRoot}`,
          formatLatestReportSummary(report.summary),
          "",
          report.shipReport.trimEnd()
        ].join("\n") + "\n"
      );
    });
  const memory = cli.command("memory").description("Read repo-local ClawItUp memory");
  memory
    .command("show")
    .description("Print selected repo-local memory files")
    .argument("[files...]", "Repo-relative memory files")
    .action(async (files: string[]) => {
      const activeLayout = await resolveClawitupLayout();
      const selectedFiles =
        files.length > 0
          ? files
          : DEFAULT_MEMORY_FILES.map((file) => path.join(activeLayout.clawitupRoot, file));
      const snapshot = await readMemorySnapshot(selectedFiles.map((file) => path.resolve(file)));

      process.stdout.write(`${formatMemoryShow(snapshot.entries)}\n`);
    });
  cli
    .command("eval")
    .description("Run a deterministic ClawItUp eval fixture")
    .argument("<fixture>", "JSON-compatible eval fixture path")
    .action(async (fixture: string) => {
      await printEvalCommand(fixture);
    });

  return cli;
}

const DEFAULT_MEMORY_FILES = [
  "memory/shared/repo-profile.md",
  "memory/shared/risk-register.md",
  "memory/shared/false-positive-patterns.md",
  "memory/shared/run-history.md"
];

async function resolveRunSelection(runId?: string) {
  const { clawitupRoot } = await resolveClawitupLayout();
  const selectedRunId = runId ?? (await latestRunId(clawitupRoot));

  return {
    runId: selectedRunId,
    layout: createRunLayout(clawitupRoot, selectedRunId)
  };
}
