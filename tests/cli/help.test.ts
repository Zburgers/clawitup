import { describe, expect, it } from "vitest";
import { buildCli } from "../../src/cli.js";

describe("clawitup cli", () => {
  it("registers the MVP commands", () => {
    const cli = buildCli();
    const names = cli.commands.map((command) => command.name());

    expect(names).toEqual(
      expect.arrayContaining(["init", "audit", "status", "report", "memory", "eval"])
    );
  });
});
