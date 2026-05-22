import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { INIT_TEMPLATE_FILES, type TemplateFile } from "../runtime/templates.js";

const execFileAsync = promisify(execFile);

export type InitWritePlan = TemplateFile & {
  path: string;
};

export type InitRunResult = {
  repoRoot: string;
  created: string[];
  skipped: string[];
  graphifyReportExists: boolean;
  graphifyGraphExists: boolean;
};

async function getGitRepoRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd
    });

    return stdout.trim();
  } catch {
    throw new Error(`[clawitup:init] ${cwd} is not a git repository`);
  }
}

export function planInitWrites(repoRoot: string): InitWritePlan[] {
  return INIT_TEMPLATE_FILES.map((file) => ({
    ...file,
    path: path.join(repoRoot, file.relativePath)
  }));
}

export async function runInit(cwd = process.cwd()): Promise<InitRunResult> {
  const repoRoot = await getGitRepoRoot(cwd);
  const writes = planInitWrites(repoRoot);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const write of writes) {
    await fs.mkdir(path.dirname(write.path), { recursive: true });

    try {
      await fs.access(write.path);
      skipped.push(write.path);
      continue;
    } catch {
      await fs.writeFile(write.path, write.content, "utf8");
      created.push(write.path);
    }
  }

  const graphifyReportPath = path.join(repoRoot, "graphify-out/GRAPH_REPORT.md");
  const graphifyGraphPath = path.join(repoRoot, "graphify-out/graph.json");
  const graphifyReportExists = await fileExists(graphifyReportPath);
  const graphifyGraphExists = await fileExists(graphifyGraphPath);

  console.log("[clawitup:init] Git repository detected");
  console.log("[clawitup:init] GitAgent/GitClaw structure initialized");
  console.log("[clawitup:init] Memory files initialized");
  console.log("[clawitup:init] Checking Graphify");
  console.log(
    `[clawitup:init] graphify-out/GRAPH_REPORT.md ${graphifyReportExists ? "found" : "missing"}`
  );
  console.log(
    `[clawitup:init] graphify-out/graph.json ${graphifyGraphExists ? "found" : "missing"}`
  );
  console.log("[clawitup:init] Ready for adversarial audit");
  console.log("[clawitup:init] Next: clawitup audit --scope <scope>");

  return {
    repoRoot,
    created,
    skipped,
    graphifyReportExists,
    graphifyGraphExists
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
