import { describe, expect, it } from "vitest";

import {
  buildCiScopeContract,
  buildLocalScopeContract
} from "../../src/runtime/scope-builder.js";

describe("scope builder", () => {
  it("builds a local auth scope", () => {
    const scope = buildLocalScopeContract("auth");

    expect(scope.primary_scope).toEqual(["auth"]);
    expect(scope.mode).toBe("local_scope");
    expect(scope.risk_lenses).toContain("auth");
  });

  it("caps CI changed files before audit work starts", () => {
    const scope = buildCiScopeContract(
      Array.from({ length: 40 }, (_, index) => `src/file-${index}.ts`)
    );

    expect(scope.primary_scope.length).toBeLessThanOrEqual(24);
    expect(scope.explicitly_out_of_scope.join(" ")).toContain("oversized diff");
  });
});
