import { describe, expect, it } from "vitest";
import { createRunLayout } from "../../src/runtime/artifact-store.js";

describe("artifact store", () => {
  it("returns required run paths", () => {
    const layout = createRunLayout("/tmp/clawitup", "run-001");

    expect(layout.scopeContract).toContain("scope-contract.json");
    expect(layout.policyResult).toContain("policy-result.json");
  });
});
