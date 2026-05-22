import { canAccessTenant, type Session } from "./auth.js";

export type Invoice = {
  id: string;
  tenantId: string;
  amountCents: number;
};

const invoices: Invoice[] = [
  { id: "inv_001", tenantId: "tenant-a", amountCents: 12500 },
  { id: "inv_002", tenantId: "tenant-b", amountCents: 9800 }
];

export function listInvoices(session: Session, requestedTenantId?: string): Invoice[] {
  if (!canAccessTenant(session, requestedTenantId)) {
    return [];
  }

  return invoices.filter((invoice) => invoice.tenantId === (requestedTenantId ?? session.tenantId));
}

export function parseInvoiceAmount(amountText: string): number {
  const amount = Number(amountText);

  return Number.isFinite(amount) ? amount : 0;
}
