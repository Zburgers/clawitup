import { describe, expect, it } from "vitest";

import { takeBoundedGateResults } from "../../src/runtime/deterministic-gates.js";

describe("deterministic gates", () => {
  it("truncates search results to the scope budget", () => {
    const result = takeBoundedGateResults(["a", "b", "c"], 2);

    expect(result.items).toEqual(["a", "b"]);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(3);
  });
});
