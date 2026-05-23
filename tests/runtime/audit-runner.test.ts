import { describe, expect, it } from "vitest";
import { runAudit, type AuditStageInput } from "../../src/runtime/audit-runner.js";

describe("audit runner events", () => {
  it("emits stage transitions and streamed messages in order", async () => {
    const events: string[] = [];

    const result = await runAudit({
      scope: "auth",
      events: {
        onStageStart(stage) {
          events.push(`start:${stage.name}`);
        },
        onStageMessage(stage, message) {
          events.push(`message:${stage.name}:${message.type}`);
        },
        onStageEnd(stage) {
          events.push(`end:${stage.name}`);
        }
      },
      runner: async (stage: AuditStageInput, hooks) => {
        hooks?.onMessage?.({
          type: "system",
          subtype: "session_start",
          content: `${stage.name} active`
        });

        return stage.name === "filter"
          ? { verifiedFindingIds: ["RT-AUTH-001"] }
          : {};
      }
    });

    expect(events).toEqual([
      "start:orchestrator",
      "message:orchestrator:system",
      "end:orchestrator",
      "start:red-team",
      "message:red-team:system",
      "end:red-team",
      "start:filter",
      "message:filter:system",
      "end:filter",
      "start:blue-team",
      "message:blue-team:system",
      "end:blue-team",
      "start:ship-report",
      "message:ship-report:system",
      "end:ship-report"
    ]);
    expect(result.blueTeamInput.findingIds).toEqual(["RT-AUTH-001"]);
  });
});
