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

export function buildCli(): Command {
  const cli = new Command("clawitup");

  cli.command("init").description("Initialize the repo-native ClawItUp structure").action(async () => {
    await runInit();
  });
  cli
    .command("audit")
    .description("Run the report-first adversarial audit pipeline")
    .option("--scope <scope>", "Bounded local scope to audit")
    .option("--task <task>", "Path to a task file that defines the audit")
    .option("--ci", "Audit changed files from the GitHub or local git diff")
    .action(async (options: { scope?: string; task?: string; ci?: boolean }) => {
      const result = await runAuditCommand({
        scope: options.scope,
        task: options.task,
        ci: options.ci,
        logger: createAuditRunLogger()
      });

      process.stdout.write(
        `[clawitup:audit] ${result.policy.result} run ${result.runId}\n${result.layout.finalShipReport}\n`
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
      const layout = await resolveRunLayout(options.run);
      const status = await readStatusSnapshot(layout);

      process.stdout.write(
        `${formatStatusSummary(status.summary)}\nship report: ${status.reportExists}\npolicy artifact: ${status.policyExists}\n`
      );
    });
  cli
    .command("report")
    .description("Print the latest audit report")
    .option("--run <runId>", "Read a specific run")
    .action(async (options: { run?: string }) => {
      const report = await readReportSnapshot(await resolveRunLayout(options.run));

      process.stdout.write(
        `${formatLatestReportSummary(report.summary)}\n\n${report.shipReport.trimEnd()}\n`
      );
    });
  const memory = cli.command("memory").description("Read repo-local ClawItUp memory");
  memory
    .command("show")
    .description("Print selected repo-local memory files")
    .argument("[files...]", "Repo-relative memory files")
    .action(async (files: string[]) => {
      const selectedFiles = files.length > 0 ? files : DEFAULT_MEMORY_FILES;
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

async function resolveRunLayout(runId?: string) {
  const cwd = process.cwd();
  const selectedRunId = runId ?? (await latestRunId(cwd));

  return createRunLayout(cwd, selectedRunId);
}
