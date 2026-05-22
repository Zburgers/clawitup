import { existsSync } from "node:fs";
import { join } from "node:path";

import { execa } from "execa";

import { buildDegradedGateNote } from "./deterministic-gates.js";

export type GraphifyState = "available" | "degraded";

export type GraphifyRefreshResult = {
  state: GraphifyState;
  reportPath: string;
  refreshed: boolean;
  note?: string;
};

export function graphifyReportPath(baseDir = process.cwd()): string {
  return join(baseDir, "graphify-out", "GRAPH_REPORT.md");
}

export function hasGraphifyReport(baseDir = process.cwd()): boolean {
  return existsSync(graphifyReportPath(baseDir));
}

export function graphifyMode(hasReport: boolean): GraphifyState {
  return hasReport ? "available" : "degraded";
}

export function graphifyRefreshCommand(): readonly ["graphify", "update", "."] {
  return ["graphify", "update", "."] as const;
}

export function graphifyDegradedNote(baseDir = process.cwd()): string {
  return buildDegradedGateNote(
    "graphify",
    `missing ${graphifyReportPath(baseDir)}; use graphify update . when the command is available`
  );
}

export async function refreshGraphify(
  baseDir = process.cwd(),
  runner: (cwd: string) => Promise<void> = defaultGraphifyRunner
): Promise<GraphifyRefreshResult> {
  const reportPath = graphifyReportPath(baseDir);

  if (hasGraphifyReport(baseDir)) {
    return {
      state: "available",
      reportPath,
      refreshed: false
    };
  }

  try {
    await runner(baseDir);
  } catch {
    return {
      state: "degraded",
      reportPath,
      refreshed: false,
      note: graphifyDegradedNote(baseDir)
    };
  }

  const reportAvailable = hasGraphifyReport(baseDir);

  return {
    state: graphifyMode(reportAvailable),
    reportPath,
    refreshed: reportAvailable
  };
}

async function defaultGraphifyRunner(baseDir: string): Promise<void> {
  await execa("graphify", graphifyRefreshCommand(), { cwd: baseDir });
}
