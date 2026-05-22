import { describe, expect, it } from "vitest";

import { selectMemoryFiles } from "../../src/runtime/memory-gate.js";

describe("memory gate", () => {
  it("caps memory files by the scope budget", () => {
    const files = selectMemoryFiles(["a.md", "b.md", "c.md"], 2);

    expect(files).toEqual(["a.md", "b.md"]);
  });
});
