import { execa } from "execa";

export interface GitReader {
  listChangedFiles(): Promise<string[]>;
}

export type GitDiffReaderOptions = {
  cwd?: string;
  base?: string;
  head?: string;
};

export function parseChangedFiles(output: string): string[] {
  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

export function createGitDiffReader(options: GitDiffReaderOptions = {}): GitReader {
  return {
    async listChangedFiles(): Promise<string[]> {
      const range = changedFileRange(options);
      const { stdout } = await execa("git", [
        "diff",
        "--name-only",
        ...(range ? [range] : ["HEAD~1...HEAD"])
      ], {
        cwd: options.cwd
      });

      return parseChangedFiles(stdout);
    }
  };
}

export function changedFileRange(options: GitDiffReaderOptions): string | undefined {
  const base = safeRevision(options.base ?? process.env.GITHUB_BASE_SHA);
  const head = safeRevision(options.head ?? process.env.GITHUB_SHA);

  return base && head ? `${base}...${head}` : undefined;
}

function safeRevision(revision: string | undefined): string | undefined {
  return revision && /^[A-Za-z0-9._/-]+$/.test(revision) ? revision : undefined;
}
