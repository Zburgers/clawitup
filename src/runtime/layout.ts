import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const HIDDEN_LAYOUT_DIR = ".clawitup";

export type ClawitupLayoutMode = "repo" | "hidden";

export type ClawitupLayout = {
  repoRoot: string;
  clawitupRoot: string;
  mode: ClawitupLayoutMode;
};

type HiddenLayoutConfig = {
  layout: ClawitupLayoutMode;
};

export async function getGitRepoRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd
    });

    return stdout.trim();
  } catch {
    throw new Error(`[clawitup] ${cwd} is not a git repository`);
  }
}

export function buildClawitupLayout(
  repoRoot: string,
  mode: ClawitupLayoutMode = "repo"
): ClawitupLayout {
  return {
    repoRoot,
    clawitupRoot: mode === "hidden" ? path.join(repoRoot, HIDDEN_LAYOUT_DIR) : repoRoot,
    mode
  };
}

export async function resolveClawitupLayout(cwd = process.cwd()): Promise<ClawitupLayout> {
  const repoRoot = await getGitRepoRoot(cwd);
  const configPath = path.join(repoRoot, HIDDEN_LAYOUT_DIR, "config.json");

  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf8")) as HiddenLayoutConfig;
    if (config.layout === "hidden") {
      return buildClawitupLayout(repoRoot, "hidden");
    }
  } catch {
    // Default to the legacy repo-root layout when no hidden config exists.
  }

  return buildClawitupLayout(repoRoot, "repo");
}
