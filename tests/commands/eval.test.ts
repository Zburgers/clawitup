import { describe, expect, it } from "vitest";

import { scoreEval } from "../../src/runtime/eval-runner.js";
import { runEval } from "../../src/runtime/eval-runner.js";

describe("eval scoring", () => {
  it("requires a false-positive rejection and policy result", () => {
    const result = scoreEval({
      requiredArtifacts: true,
      realBugsFound: 1,
      expectedRealBugs: 1,
      falsePositivesRejected: 1,
      outOfScopeRejected: 1,
      policyResultEmitted: true,
      remediationHandoffPresent: true
    });

    expect(result.passed).toBe(true);
  });

  it("builds inspectable markdown and json artifacts from the seeded fixture", async () => {
    const result = await runEval("examples/evals/auth-boundary.yaml");

    expect(result.score.passed).toBe(true);
    expect(result.artifacts.markdown).toContain("Eval Report: auth-boundary");
    expect(result.artifacts.markdown).toContain("policy result: FAIL");
    expect(result.artifacts.json).toContain('"policyResult": "FAIL"');
  });
});
