import { describe, expect, it } from "vitest";

import { auditExitCode } from "../../src/commands/audit.js";

describe("audit ci mode", () => {
  it("returns a failing exit code for policy FAIL", () => {
    expect(auditExitCode({ result: "FAIL", reasons: [], blocking_finding_ids: [] })).toBe(1);
  });

  it("keeps warnings non-blocking", () => {
    expect(auditExitCode({ result: "WARN", reasons: [], blocking_finding_ids: [] })).toBe(0);
  });
});
