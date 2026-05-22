export type BoundedGateResults<T> = {
  items: T[];
  truncated: boolean;
  total: number;
};

export function normalizeGateLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 0;
  }

  return Math.max(0, Math.floor(limit));
}

export function takeBoundedGateResults<T>(
  items: T[],
  limit: number
): BoundedGateResults<T> {
  const safeLimit = normalizeGateLimit(limit);

  return {
    items: items.slice(0, safeLimit),
    truncated: items.length > safeLimit,
    total: items.length
  };
}

export function buildDegradedGateNote(gateName: string, detail: string): string {
  return `${gateName} gate degraded: ${detail}`;
}
