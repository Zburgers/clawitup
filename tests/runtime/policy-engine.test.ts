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

  it("warns for human review without a blocking finding", () => {
    const result = evaluatePolicy({
      filter_completed: true,
      required_artifacts_valid: true,
      verified_findings: [{ id: "RT-AUTH-002", status: "NEEDS_HUMAN_REVIEW", severity: "medium" }]
    });

    expect(result.result).toBe("WARN");
  });
});
