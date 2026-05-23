import { describe, expect, it } from "vitest";

import { parseChangedFiles } from "../../src/runtime/git.js";

describe("git diff reader", () => {
  it("parses bounded changed files from git output", () => {
    expect(parseChangedFiles("src/auth.ts\nREADME.md\n\n")).toEqual(["src/auth.ts", "README.md"]);
  });
});
