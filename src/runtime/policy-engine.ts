import type { PolicyResult } from "../schemas/policy.js";

export type VerifiedFinding = {
  id: string;
  status: string;
  severity: string;
};

export type PolicyInput = {
  filter_completed: boolean;
  required_artifacts_valid: boolean;
  verified_findings: VerifiedFinding[];
};

function isBlockingFinding(finding: VerifiedFinding): boolean {
  return finding.status === "CONFIRMED" && (finding.severity === "high" || finding.severity === "critical");
}

function needsHumanReview(finding: VerifiedFinding): boolean {
  return finding.status === "NEEDS_HUMAN_REVIEW";
}

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  if (!input.filter_completed || !input.required_artifacts_valid) {
    return {
      result: "FAIL",
      reasons: ["required audit prerequisites were not satisfied"],
      blocking_finding_ids: []
    };
  }

  const blockingFinding = input.verified_findings.find(isBlockingFinding);
  if (blockingFinding) {
    return {
      result: "FAIL",
      reasons: ["confirmed high-risk finding blocks the gate"],
      blocking_finding_ids: [blockingFinding.id]
    };
  }

  const reviewFinding = input.verified_findings.find(needsHumanReview);
  if (reviewFinding) {
    return {
      result: "WARN",
      reasons: ["finding needs human review before shipping"],
      blocking_finding_ids: []
    };
  }

  return {
    result: "PASS",
    reasons: ["no blocking findings detected"],
    blocking_finding_ids: []
  };
}
