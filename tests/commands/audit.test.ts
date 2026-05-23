import { describe, expect, it } from "vitest";
import { runAudit, type AuditStageInput } from "../../src/runtime/audit-runner.js";

describe("audit runner", () => {
  it("passes only verified findings into the blue-team stage", async () => {
    const stages: string[] = [];
    const result = await runAudit({
      scope: "auth",
      runner: async (stage: AuditStageInput) => {
        stages.push(stage.name);
        return stage.name === "filter"
          ? { verifiedFindingIds: ["RT-AUTH-001"] }
          : {};
      }
    });

    expect(stages).toEqual(["orchestrator", "red-team", "filter", "blue-team", "ship-report"]);
    expect(result.blueTeamInput.findingIds).toEqual(["RT-AUTH-001"]);
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
