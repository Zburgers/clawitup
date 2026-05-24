import { describe, expect, it } from "vitest";
import { runAudit, type AuditStageInput } from "../../src/runtime/audit-runner.js";

describe("audit runner", () => {
  it("passes only verified findings into the blue-team stage", async () => {
    const blueTeamStageInputs: AuditStageInput[] = [];
    const result = await runAudit({
      scope: "auth",
      runner: async (stage: AuditStageInput) => {
        if (stage.name === "blue-team") {
          blueTeamStageInputs.push(stage);
        }

        return stage.name === "filter"
          ? {
              verifiedFindingIds: ["RT-AUTH-001"],
              verifiedFindings: [
                {
                  id: "RT-AUTH-001",
                  status: "CONFIRMED",
                  severity: "high",
                  evidence: ["src/auth.ts:12"]
                }
              ],
              report: "Confirmed auth failure"
            }
          : {};
      }
    });

    expect(result.blueTeamInput.findingIds).toEqual(["RT-AUTH-001"]);
    expect(blueTeamStageInputs[0]?.verifiedFindings).toEqual([
      {
        id: "RT-AUTH-001",
        status: "CONFIRMED",
        severity: "high",
        evidence: ["src/auth.ts:12"]
      }
    ]);
  });

  it("records explicit stage errors when a stage runner throws", async () => {
    const result = await runAudit({
      scope: "auth",
      runner: async (stage: AuditStageInput) => {
        if (stage.name === "filter") {
          throw new Error("filter stage failed");
        }

        return {};
      }
    });

    const filterStage = result.stages.find((stage) => stage.name === "filter");

    expect(filterStage?.output.error?.kind).toBe("runner_error");
    expect(filterStage?.output.notes).toContain("gitclaw_error:");
    expect(result.stages.map((stage) => stage.name)).toEqual([
      "orchestrator",
      "red-team",
      "filter",
      "blue-team",
      "ship-report"
    ]);
  });
});
