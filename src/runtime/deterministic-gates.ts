export type BoundedGateResults<T> = {
  items: T[];
  truncated: boolean;
  total: number;
};

export function takeBoundedGateResults<T>(
  items: T[],
  limit: number
): BoundedGateResults<T> {
  const safeLimit = Math.max(0, limit);

  return {
    items: items.slice(0, safeLimit),
    truncated: items.length > safeLimit,
    total: items.length
  };
}
