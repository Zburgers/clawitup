import fs from "node:fs/promises";
import { SummarySchema, type Summary } from "../schemas/summary.js";
import { type RunLayout } from "../runtime/artifact-store.js";

export type ReportSummaryInput = Pick<
  Summary,
  | "policy_result"
  | "confirmed"
  | "rejected_false_positive"
  | "needs_human_review"
  | "insufficient_evidence"
  | "duplicate"
  | "out_of_scope"
  | "blocking_finding_ids"
>;

export type ReportSnapshot = {
  summary: Summary;
  shipReport: string;
};

export function formatLatestReportSummary(summary: ReportSummaryInput): string {
  const lines = [
    `policy result: ${summary.policy_result}`,
    `confirmed: ${summary.confirmed}`,
    `rejected false positive: ${summary.rejected_false_positive}`
  ];

  if (summary.needs_human_review !== undefined) {
    lines.push(`needs human review: ${summary.needs_human_review}`);
  }

  if (summary.insufficient_evidence !== undefined) {
    lines.push(`insufficient evidence: ${summary.insufficient_evidence}`);
  }

  if (summary.duplicate !== undefined) {
    lines.push(`duplicate: ${summary.duplicate}`);
  }

  if (summary.out_of_scope !== undefined) {
    lines.push(`out of scope: ${summary.out_of_scope}`);
  }

  if (summary.blocking_finding_ids?.length) {
    lines.push(`blocking findings: ${summary.blocking_finding_ids.join(", ")}`);
  }

  return lines.join("\n");
}

export async function readSummaryFile(summaryPath: string): Promise<Summary> {
  return SummarySchema.parse(JSON.parse(await fs.readFile(summaryPath, "utf8")));
}

export async function readShipReportFile(reportPath: string): Promise<string> {
  return fs.readFile(reportPath, "utf8");
}

export async function readReportSnapshot(layout: RunLayout): Promise<ReportSnapshot> {
  const [summary, shipReport] = await Promise.all([
    readSummaryFile(layout.summary),
    readShipReportFile(layout.finalShipReport)
  ]);

  return {
    summary,
    shipReport
  };
}
