import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runAuditCommand } from "../../src/commands/audit.js";

describe("audit command artifacts", () => {
  it("writes a bounded CI run with policy artifacts", async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "clawitup-audit-"));
    const result = await runAuditCommand(
      {
        ci: true,
        cwd,
        changedFiles: ["src/auth/session.ts"]
      },
      async (stage) => {
        if (stage.name === "filter") {
          return {
            verifiedFindings: [
              {
                id: "RT-AUTH-001",
                status: "NEEDS_HUMAN_REVIEW",
                severity: "medium"
              }
            ]
          };
        }

        if (stage.name === "ship-report") {
          return { report: "# Ship Report\n\nReview auth session handling." };
        }

        return {};
      }
    );

    const scope = JSON.parse(await fs.readFile(result.layout.scopeContract, "utf8"));
    const summary = JSON.parse(await fs.readFile(result.layout.summary, "utf8"));
    const policy = JSON.parse(await fs.readFile(result.layout.policyResult, "utf8"));

    expect(scope.mode).toBe("ci_diff");
    expect(scope.primary_scope).toEqual(["src/auth/session.ts"]);
    expect(summary.policy_result).toBe("WARN");
    expect(policy.result).toBe("WARN");
  });

  it("warns when the filter confirms a finding with lowercase model enums", async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "clawitup-audit-"));
    const result = await runAuditCommand(
      {
        ci: true,
        cwd,
        changedFiles: ["src/lib/highlight.ts"]
      },
      async (stage) => {
        if (stage.name === "filter") {
          return {
            verifiedFindings: [
              {
                id: "F003",
                status: "confirmed",
                severity: "medium"
              }
            ] as any
          };
        }

        if (stage.name === "ship-report") {
          return { report: "# Ship Report\n\nConfirmed non-blocking finding." };
        }

        return {};
      }
    );

    expect(result.policy.result).toBe("WARN");
    expect(result.summary.confirmed).toBe(1);
    expect(result.verifiedFindings).toEqual([
      {
        id: "F003",
        status: "CONFIRMED",
        severity: "medium"
      }
    ]);
  });

  it("writes a fallback ship report when the ship-report stage returns an empty string", async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "clawitup-audit-"));
    const result = await runAuditCommand(
      {
        ci: true,
        cwd,
        changedFiles: ["src/lib/highlight.ts"]
      },
      async (stage) => {
        if (stage.name === "ship-report") {
          return {
            report: "",
            notes: "gitclaw_error: provider rate limited",
            error: {
              stage: "ship-report",
              kind: "runner_error",
              message: "provider rate limited"
            }
          };
        }

        return {};
      }
    );

    const shipReport = await fs.readFile(result.layout.finalShipReport, "utf8");

    expect(shipReport).toContain("# ClawItUp Ship Report");
    expect(shipReport).toContain("provider rate limited");
  });
});
