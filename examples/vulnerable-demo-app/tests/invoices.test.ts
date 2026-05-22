import { describe, expect, it } from "vitest";

import { listInvoices, parseInvoiceAmount } from "../src/invoices.js";

describe("invoices fixture", () => {
  it("keeps same-tenant reads working", () => {
    const invoices = listInvoices({ userId: "u1", tenantId: "tenant-a", role: "member" });

    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.id).toBe("inv_001");
  });

  it("documents the missing negative amount guard", () => {
    expect(parseInvoiceAmount("-100")).toBe(-100);
  });
});
