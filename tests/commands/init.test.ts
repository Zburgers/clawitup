import { describe, expect, it } from "vitest";
import { planInitWrites } from "../../src/commands/init.js";

describe("init command", () => {
  it("plans repo-level memory files", () => {
    const writes = planInitWrites("/repo").map((write) => write.path);

    expect(writes).toContain("/repo/memory/shared/repo-profile.md");
    expect(writes).toContain("/repo/memory/teams/filter.md");
  });
});
