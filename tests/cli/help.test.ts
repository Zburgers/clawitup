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

  it("exposes CI audit and report readers", () => {
    const cli = buildCli();
    const audit = cli.commands.find((command) => command.name() === "audit");
    const memory = cli.commands.find((command) => command.name() === "memory");

    expect(audit?.options.map((option) => option.long)).toContain("--ci");
    expect(memory?.commands.map((command) => command.name())).toContain("show");
  });
});
