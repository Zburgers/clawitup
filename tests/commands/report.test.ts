import { describe, expect, it } from "vitest";
import { formatLatestReportSummary } from "../../src/commands/report.js";

describe("report command", () => {
  it("prints policy result and finding counts", () => {
    const text = formatLatestReportSummary({
      policy_result: "WARN",
      confirmed: 1,
      rejected_false_positive: 1
    });

    expect(text).toContain("WARN");
    expect(text).toContain("confirmed: 1");
  });
});
