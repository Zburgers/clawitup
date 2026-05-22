import { describe, expect, it } from "vitest";
import { PolicyResultSchema } from "../../src/schemas/policy.js";

describe("PolicyResultSchema", () => {
  it("accepts a CI failure with explicit reasons", () => {
    const parsed = PolicyResultSchema.parse({
      result: "FAIL",
      reasons: ["confirmed high security finding"],
      blocking_finding_ids: ["RT-AUTH-001"]
    });

    expect(parsed.result).toBe("FAIL");
  });
});
