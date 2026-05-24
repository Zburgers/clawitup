import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import type { AuditStageInput } from "../../src/runtime/audit-runner.js";

vi.mock("../../src/runtime/gitclaw-runner.js", () => ({
  createGitclawStageRunner: vi.fn(() => async (stage: AuditStageInput) => {
    if (stage.name === "ship-report") {
      return { report: "# Ship Report\n\nPASS" };
    }
    return {};
  })
}));

describe("audit command runner wiring", () => {
  it("passes cwd into createGitclawStageRunner even without a model override", async () => {
    const { runAuditCommand } = await import("../../src/commands/audit.js");
    const { createGitclawStageRunner } = await import("../../src/runtime/gitclaw-runner.js");
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "clawitup-audit-"));

    await runAuditCommand({
      ci: true,
      cwd,
      changedFiles: ["src/app.ts"]
    });

    expect(createGitclawStageRunner).toHaveBeenCalledWith({ dir: cwd, model: undefined });
  });
});
