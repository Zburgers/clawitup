import fs from "node:fs/promises";
import { type RunLayout } from "../runtime/artifact-store.js";
import { SummarySchema, type Summary } from "../schemas/summary.js";
import { formatLatestReportSummary } from "./report.js";

export type StatusSnapshot = {
  summary: Summary;
  reportExists: boolean;
  policyExists: boolean;
};

export function formatStatusSummary(summary: Summary): string {
  return formatLatestReportSummary(summary);
}

export async function readStatusSummary(summaryPath: string): Promise<Summary> {
  return SummarySchema.parse(JSON.parse(await fs.readFile(summaryPath, "utf8")));
}

export async function readStatusSnapshot(layout: RunLayout): Promise<StatusSnapshot> {
  const [summary, reportExists, policyExists] = await Promise.all([
    readStatusSummary(layout.summary),
    fileExists(layout.finalShipReport),
    fileExists(layout.policyResult)
  ]);

  return {
    summary,
    reportExists,
    policyExists
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
