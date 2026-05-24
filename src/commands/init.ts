import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getInitTemplateFiles, type TemplateFile } from "../runtime/templates.js";
import { getGitRepoRoot, type ClawitupLayoutMode } from "../runtime/layout.js";

export type InitWritePlan = TemplateFile & {
  path: string;
};

export type InitOptions = {
  layout?: ClawitupLayoutMode;
  preferredModel?: string;
  force?: boolean;
};

export type InitRunResult = {
  repoRoot: string;
  layout: ClawitupLayoutMode;
  created: string[];
  skipped: string[];
  graphifyReportExists: boolean;
  graphifyGraphExists: boolean;
};

export function planInitWrites(
  repoRoot: string,
  layout: ClawitupLayoutMode = "repo",
  preferredModel?: string
): InitWritePlan[] {
  return getInitTemplateFiles(layout, { preferredModel }).map((file) => ({
    ...file,
    path: path.join(repoRoot, file.relativePath)
  }));
}

export async function runInit(
  cwd = process.cwd(),
  options: InitOptions = {}
): Promise<InitRunResult> {
  const layout = options.layout ?? "repo";
  const repoRoot = await getGitRepoRoot(cwd);
  const writes = planInitWrites(repoRoot, layout, options.preferredModel);
  const created: string[] = [];
  const skipped: string[] = [];

  for (const write of writes) {
    await fs.mkdir(path.dirname(write.path), { recursive: true });

    try {
      await fs.access(write.path);
      if (!options.force) {
        skipped.push(write.path);
        continue;
      }
    } catch {
      // Fall through and create the file.
    }

    await fs.writeFile(write.path, await readTemplateContent(write), "utf8");
    created.push(write.path);
  }

  const graphifyReportPath = path.join(repoRoot, "graphify-out/GRAPH_REPORT.md");
  const graphifyGraphPath = path.join(repoRoot, "graphify-out/graph.json");
  const graphifyReportExists = await fileExists(graphifyReportPath);
  const graphifyGraphExists = await fileExists(graphifyGraphPath);

  console.log("[clawitup:init] Git repository detected");
  console.log(
    `[clawitup:init] GitAgent/GitClaw structure initialized (${layout === "hidden" ? ".clawitup" : "repo-root"} layout)`
  );
  console.log(`[clawitup:init] scaffold files written=${created.length} skipped=${skipped.length}`);
  console.log("[clawitup:init] GitHub Actions audit workflow configured");
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
    layout,
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

async function readTemplateContent(write: TemplateFile): Promise<string> {
  if (!write.sourceAsset) {
    return write.content;
  }

  const initDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(initDir, "../..", write.sourceAsset),
    path.resolve(initDir, "../../..", write.sourceAsset)
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      // Source and built package layouts use different roots.
    }
  }

  throw new Error(`[clawitup:init] missing bundled asset ${write.sourceAsset}`);
}
