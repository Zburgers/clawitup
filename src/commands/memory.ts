import fs from "node:fs/promises";

export type MemoryEntry = {
  path: string;
  content: string;
};

export type MemorySnapshot = {
  entries: MemoryEntry[];
};

export function formatMemoryShow(entries: MemoryEntry[]): string {
  if (entries.length === 0) {
    return "no memory files selected";
  }

  return entries
    .map((entry) => [`# ${entry.path}`, entry.content.trimEnd()].join("\n"))
    .join("\n\n");
}

export async function readMemoryFile(filePath: string): Promise<MemoryEntry> {
  return {
    path: filePath,
    content: await fs.readFile(filePath, "utf8")
  };
}

export async function readMemorySnapshot(filePaths: string[]): Promise<MemorySnapshot> {
  return {
    entries: await Promise.all(filePaths.map((filePath) => readMemoryFile(filePath)))
  };
}
