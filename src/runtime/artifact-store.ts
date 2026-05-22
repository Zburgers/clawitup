import { join } from "node:path";

export type RunLayout = {
  runRoot: string;
  taskContext: string;
  scopeContract: string;
  gateLogs: string;
  redTeamFindings: string;
  verificationOutput: string;
  blueTeamHandoff: string;
  finalShipReport: string;
  policyResult: string;
  summary: string;
};

export function createRunLayout(baseDir: string, runId: string): RunLayout {
  const runRoot = join(baseDir, "runs", runId);

  return {
    runRoot,
    taskContext: join(runRoot, "task-context.json"),
    scopeContract: join(runRoot, "scope-contract.json"),
    gateLogs: join(runRoot, "gate-logs.jsonl"),
    redTeamFindings: join(runRoot, "red-team-findings.json"),
    verificationOutput: join(runRoot, "verification-output.json"),
    blueTeamHandoff: join(runRoot, "blue-team-handoff.md"),
    finalShipReport: join(runRoot, "final-ship-report.md"),
    policyResult: join(runRoot, "policy-result.json"),
    summary: join(runRoot, "summary.json")
  };
}
