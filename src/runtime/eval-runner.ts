import fs from "node:fs/promises";
import path from "node:path";

export type EvalFindingKind =
  | "real_bug"
  | "false_positive"
  | "out_of_scope"
  | "duplicate"
  | "human_review";

export type EvalFinding = {
  id: string;
  kind: EvalFindingKind;
  title: string;
  evidence: string;
};

export type EvalFixture = {
  name: string;
  taskFile: string;
  demoAppRoot: string;
  requiredArtifacts: string[];
  expectedRealBugs: number;
  findings: EvalFinding[];
  policyResult: "PASS" | "WARN" | "FAIL";
  remediationHandoff: {
    summary: string;
    nextSteps: string[];
  };
};

export type EvalScoreInput = {
  requiredArtifacts: boolean;
  realBugsFound: number;
  expectedRealBugs: number;
  falsePositivesRejected: number;
  outOfScopeRejected: number;
  policyResultEmitted: boolean;
  remediationHandoffPresent: boolean;
};

export type EvalScore = {
  passed: boolean;
  checks: {
    requiredArtifacts: boolean;
    realBugCoverage: boolean;
    falsePositiveRejection: boolean;
    outOfScopeRejection: boolean;
    policyResultEmitted: boolean;
    remediationHandoffPresent: boolean;
  };
  failures: string[];
};

export type EvalRunResult = {
  fixturePath: string;
  fixture: EvalFixture;
  counts: {
    realBugsFound: number;
    falsePositivesRejected: number;
    outOfScopeRejected: number;
    duplicates: number;
    humanReview: number;
  };
  score: EvalScore;
  artifacts: {
    markdown: string;
    json: string;
  };
};

export async function loadEvalFixture(fixturePath: string): Promise<EvalFixture> {
  const raw = await fs.readFile(fixturePath, "utf8");

  return parseEvalFixture(raw, fixturePath);
}

export function scoreEval(input: EvalScoreInput): EvalScore {
  const checks = {
    requiredArtifacts: input.requiredArtifacts,
    realBugCoverage: input.realBugsFound >= input.expectedRealBugs,
    falsePositiveRejection: input.falsePositivesRejected > 0,
    outOfScopeRejection: input.outOfScopeRejected > 0,
    policyResultEmitted: input.policyResultEmitted,
    remediationHandoffPresent: input.remediationHandoffPresent
  };

  const failures: string[] = [];

  if (!checks.requiredArtifacts) {
    failures.push("required artifacts were not produced");
  }

  if (!checks.realBugCoverage) {
    failures.push("seeded real bugs were not fully confirmed");
  }

  if (!checks.falsePositiveRejection) {
    failures.push("no false-positive rejection was recorded");
  }

  if (!checks.outOfScopeRejection) {
    failures.push("no out-of-scope rejection was recorded");
  }

  if (!checks.policyResultEmitted) {
    failures.push("policy output was not emitted");
  }

  if (!checks.remediationHandoffPresent) {
    failures.push("remediation handoff was not present");
  }

  return {
    passed: failures.length === 0,
    checks,
    failures
  };
}

export async function runEval(fixturePath: string, cwd = process.cwd()): Promise<EvalRunResult> {
  const absoluteFixturePath = path.isAbsolute(fixturePath)
    ? fixturePath
    : path.resolve(cwd, fixturePath);
  const fixture = await loadEvalFixture(absoluteFixturePath);

  const counts = countFixtureFindings(fixture);
  const score = scoreEval({
    requiredArtifacts: fixture.requiredArtifacts.length > 0,
    realBugsFound: counts.realBugsFound,
    expectedRealBugs: fixture.expectedRealBugs,
    falsePositivesRejected: counts.falsePositivesRejected,
    outOfScopeRejected: counts.outOfScopeRejected,
    policyResultEmitted: fixture.policyResult.length > 0,
    remediationHandoffPresent:
      fixture.remediationHandoff.summary.trim().length > 0 &&
      fixture.remediationHandoff.nextSteps.length > 0
  });

  const result: EvalRunResult = {
    fixturePath: absoluteFixturePath,
    fixture,
    counts,
    score,
    artifacts: {
      markdown: formatEvalMarkdown(fixture, counts, score),
      json: formatEvalJson(absoluteFixturePath, fixture, counts, score)
    }
  };

  return result;
}

export function formatEvalMarkdown(
  fixture: EvalFixture,
  counts: EvalRunResult["counts"],
  score: EvalScore
): string {
  const lines = [
    `# Eval Report: ${fixture.name}`,
    "",
    "## Score",
    score.passed ? "PASS" : "FAIL",
    "",
    "## Counts",
    `- real bugs confirmed: ${counts.realBugsFound}/${fixture.expectedRealBugs}`,
    `- false positives rejected: ${counts.falsePositivesRejected}`,
    `- out of scope rejected: ${counts.outOfScopeRejected}`,
    `- duplicates: ${counts.duplicates}`,
    `- human review: ${counts.humanReview}`,
    "",
    "## Policy",
    `- policy result: ${fixture.policyResult}`,
    "",
    "## Handoff",
    `- summary: ${fixture.remediationHandoff.summary}`,
    ...fixture.remediationHandoff.nextSteps.map((step) => `- ${step}`),
    "",
    "## Findings"
  ];

  for (const finding of fixture.findings) {
    lines.push(`- ${finding.id} [${finding.kind}] ${finding.title}`);
    lines.push(`  - evidence: ${finding.evidence}`);
  }

  return lines.join("\n");
}

export function formatEvalJson(
  fixturePath: string,
  fixture: EvalFixture,
  counts: EvalRunResult["counts"],
  score: EvalScore
): string {
  return JSON.stringify(
    {
      fixturePath,
      fixture,
      counts,
      score
    },
    null,
    2
  );
}

function countFixtureFindings(fixture: EvalFixture): EvalRunResult["counts"] {
  return {
    realBugsFound: fixture.findings.filter((finding) => finding.kind === "real_bug").length,
    falsePositivesRejected: fixture.findings.filter((finding) => finding.kind === "false_positive").length,
    outOfScopeRejected: fixture.findings.filter((finding) => finding.kind === "out_of_scope").length,
    duplicates: fixture.findings.filter((finding) => finding.kind === "duplicate").length,
    humanReview: fixture.findings.filter((finding) => finding.kind === "human_review").length
  };
}

function parseEvalFixture(raw: string, fixturePath: string): EvalFixture {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`[clawitup:eval] ${fixturePath} must contain JSON-compatible YAML`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`[clawitup:eval] ${fixturePath} did not parse into an object`);
  }

  const fixture: EvalFixture = {
    name: requireString(parsed.name, "name", fixturePath),
    taskFile: requireString(parsed.taskFile, "taskFile", fixturePath),
    demoAppRoot: requireString(parsed.demoAppRoot, "demoAppRoot", fixturePath),
    requiredArtifacts: requireStringArray(parsed.requiredArtifacts, "requiredArtifacts", fixturePath),
    expectedRealBugs: requireNonNegativeInteger(parsed.expectedRealBugs, "expectedRealBugs", fixturePath),
    findings: requireFindingArray(parsed.findings, fixturePath),
    policyResult: requirePolicyResult(parsed.policyResult, fixturePath),
    remediationHandoff: requireRemediationHandoff(parsed.remediationHandoff, fixturePath)
  };

  return fixture;
}

function requireString(value: unknown, field: string, fixturePath: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`[clawitup:eval] ${fixturePath} is missing a valid ${field}`);
  }

  return value;
}

function requireNonNegativeInteger(value: unknown, field: string, fixturePath: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`[clawitup:eval] ${fixturePath} is missing a valid ${field}`);
  }

  return value;
}

function requireStringArray(value: unknown, field: string, fixturePath: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`[clawitup:eval] ${fixturePath} is missing a valid ${field}`);
  }

  return value;
}

function requireFindingArray(value: unknown, fixturePath: string): EvalFinding[] {
  if (!Array.isArray(value)) {
    throw new Error(`[clawitup:eval] ${fixturePath} is missing findings`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`[clawitup:eval] ${fixturePath} finding ${index} is not an object`);
    }

    return {
      id: requireString(item.id, "findings[].id", fixturePath),
      kind: requireFindingKind(item.kind, fixturePath),
      title: requireString(item.title, "findings[].title", fixturePath),
      evidence: requireString(item.evidence, "findings[].evidence", fixturePath)
    };
  });
}

function requireFindingKind(value: unknown, fixturePath: string): EvalFindingKind {
  if (
    value !== "real_bug" &&
    value !== "false_positive" &&
    value !== "out_of_scope" &&
    value !== "duplicate" &&
    value !== "human_review"
  ) {
    throw new Error(`[clawitup:eval] ${fixturePath} has an invalid finding kind`);
  }

  return value;
}

function requirePolicyResult(value: unknown, fixturePath: string): EvalFixture["policyResult"] {
  if (value !== "PASS" && value !== "WARN" && value !== "FAIL") {
    throw new Error(`[clawitup:eval] ${fixturePath} has an invalid policy result`);
  }

  return value;
}

function requireRemediationHandoff(
  value: unknown,
  fixturePath: string
): EvalFixture["remediationHandoff"] {
  if (!isRecord(value)) {
    throw new Error(`[clawitup:eval] ${fixturePath} is missing remediationHandoff`);
  }

  return {
    summary: requireString(value.summary, "remediationHandoff.summary", fixturePath),
    nextSteps: requireStringArray(value.nextSteps, "remediationHandoff.nextSteps", fixturePath)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
