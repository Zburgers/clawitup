import { buildDegradedGateNote, takeBoundedGateResults } from "./deterministic-gates.js";

export type MemoryGateResult = {
  files: string[];
  truncated: boolean;
  total: number;
  note?: string;
};

export function selectMemoryFiles(files: string[], budget: number): string[] {
  return takeBoundedGateResults(files, budget).items;
}

export function takeMemoryGate(files: string[], budget: number): MemoryGateResult {
  const bounded = takeBoundedGateResults(files, budget);

  return {
    files: bounded.items,
    truncated: bounded.truncated,
    total: bounded.total,
    note: bounded.truncated
      ? buildDegradedGateNote(
          "memory",
          `limited to ${bounded.items.length} of ${bounded.total} files`
        )
      : undefined
  };
}
