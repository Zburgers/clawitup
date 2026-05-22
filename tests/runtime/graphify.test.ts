import { describe, expect, it } from "vitest";

import { graphifyMode } from "../../src/runtime/graphify.js";

describe("graphify", () => {
  it("degrades when graph output is unavailable", () => {
    expect(graphifyMode(false)).toBe("degraded");
  });
});
