import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/runtime/policy-engine.js";

describe("policy engine", () => {
  it("fails for a confirmed high security finding", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [{ id: "RT-AUTH-001", status: "CONFIRMED", severity: "high" }]
    });

    expect(result.result).toBe("FAIL");
  });

  it("reports all confirmed high and critical blocking finding ids", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [
        { id: "F001", status: "CONFIRMED", severity: "high" },
        { id: "F002", status: "CONFIRMED", severity: "medium" },
        { id: "F003", status: "CONFIRMED", severity: "critical" }
      ]
    });

    expect(result.result).toBe("FAIL");
    expect(result.blocking_finding_ids).toEqual(["F001", "F003"]);
  });

  it("warns for human review without a blocking finding", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [{ id: "RT-AUTH-002", status: "NEEDS_HUMAN_REVIEW", severity: "medium" }]
    });

    expect(result.result).toBe("WARN");
  });
});
