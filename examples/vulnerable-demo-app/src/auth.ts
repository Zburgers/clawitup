export type Session = {
  userId: string;
  tenantId: string;
  role: "member" | "admin";
};

export function resolveTenantId(session: Session, requestedTenantId?: string): string {
  if (session.role === "admin" && requestedTenantId) {
    return requestedTenantId;
  }

  return requestedTenantId ?? session.tenantId;
}

export function canAccessTenant(session: Session, requestedTenantId?: string): boolean {
  return resolveTenantId(session, requestedTenantId).length > 0;
}
